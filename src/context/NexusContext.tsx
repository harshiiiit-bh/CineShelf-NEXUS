import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { apiFetch, apiErrorMessage } from '../utils/api';
import {
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  OperationType,
  handleFirestoreError,
  signOut,
  deleteUser,
} from '../services/firebase';
import {
  CalendarEvent,
  CatalogItem,
  CustomCollection,
  FranchiseDefinition,
  LibraryItem,
  NavigationSection,
  NotificationItem,
  RecommendationFeedback,
  RecommendationFeedbackType,
  ReviewRecord,
  UserPreferences,
  WatchHistoryRecord,
  WatchStatus,
} from '../types/nexus';
import {
  BUILT_IN_FRANCHISES,
  CURATED_CATALOG,
  DEFAULT_AVATAR_ASSET,
  hydrateCatalogItemArtwork,
} from '../utils/catalog';
import {
  findDuplicateLibraryItem,
  mergeLibraryItemMetadata,
  toggleSeriesEpisode,
} from '../utils/engine';
import { mergeCatalogItemPreservingEdits } from '../utils/metadataProviders';

export interface ActiveAccount {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  emailVerified: boolean;
  isDevelopmentSandbox: boolean;
  accessMode: 'guest' | 'friend';
  guestId?: string;
  loginId?: string;
  sessionToken: string;
  inactivityTimeoutMinutes: number;
  expiresAtMs?: number;
  bio: string;
  region: string;
  isPrivate: boolean;
}

export interface IssuedTemporaryCredentials {
  loginId: string;
  loginCode: string;
  displayName: string;
  issuedAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface NexusContextValue {
  authReady: boolean;
  account: ActiveAccount | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  activeSection: NavigationSection;
  setActiveSection: (s: NavigationSection) => void;
  selectedItemModal: LibraryItem | null;
  setSelectedItemModal: (item: LibraryItem | null) => void;
  selectedItemForModal: LibraryItem | null;
  setSelectedItemForModal: (item: LibraryItem | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  library: LibraryItem[];
  watchHistory: WatchHistoryRecord[];
  reviews: ReviewRecord[];
  collections: CustomCollection[];
  calendarEvents: CalendarEvent[];
  preferences: UserPreferences;
  franchises: FranchiseDefinition[];
  feedback: RecommendationFeedback[];
  notifications: NotificationItem[];
  recentlyViewedIds: string[];
  searchHistory: string[];
  addSearchHistory: (q: string) => void;
  recordSearchQuery: (q: string) => void;
  recordRecentlyViewed: (id: string) => void;
  toasts: ToastMessage[];
  addToast: (title: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  // Guest Mode + Friend Mode Temporary Login System
  continueAsGuest: (
    customDisplayName?: string,
    inactivityTimeoutMinutes?: number
  ) => Promise<ActiveAccount | null>;
  loginWithDisplayName: (
    displayName: string
  ) => Promise<{ account: ActiveAccount; loginId: string; loginCode: string } | null>;
  loginWithExistingCode: (loginId: string, loginCode: string) => Promise<ActiveAccount | null>;
  updateGuestInactivityTimeout: (minutes: number) => Promise<void>;
  isFriendLoginModalOpen: boolean;
  friendLoginPromptReason: string;
  openFriendLoginModal: (
    reason?: string,
    onAuthenticatedCallback?: (acc: ActiveAccount) => void
  ) => void;
  closeFriendLoginModal: () => void;
  lastIssuedCredentials: IssuedTemporaryCredentials | null;
  clearLastIssuedCredentials: () => void;
  // Auth & Sandbox controls
  enterDevelopmentSandbox: (persona?: 'user_a' | 'user_b') => void;
  logoutAccount: () => Promise<void>;
  signOutCurrentAccount: () => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
  updateAccountProfile: (updates: Partial<ActiveAccount>) => Promise<void>;
  updateUserPreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  // Library CRUD
  addOrMergeLibraryItem: (
    item: Partial<LibraryItem>,
    onDuplicateStrategy?: 'prevent' | 'merge'
  ) => Promise<{ status: 'added' | 'merged' | 'duplicate_blocked'; item: LibraryItem }>;
  updateLibraryItem: (id: string, updates: Partial<LibraryItem>) => Promise<void>;
  changeWatchStatus: (id: string, nextStatus: WatchStatus) => Promise<void>;
  deleteLibraryItem: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], nextStatus: WatchStatus) => Promise<void>;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  // Series Episode Tracker
  toggleEpisodeWatched: (itemId: string, episodeCode: string) => Promise<void>;
  // Reviews & Watch History
  addReview: (review: Omit<ReviewRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  logWatchSession: (
    session: Omit<WatchHistoryRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  // Calendar
  addCalendarEvent: (
    ev: Omit<CalendarEvent, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleCalendarEventCompleted: (eventId: string) => Promise<void>;
  toggleCalendarEventDone: (eventId: string) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  // Franchises
  toggleFranchiseInstallmentWatched: (franchiseId: string, entryId: string) => Promise<void>;
  createCustomFranchise: (
    name: string,
    description: string,
    installments: FranchiseDefinition['installments']
  ) => Promise<void>;
  // Collections
  createCustomCollection: (name: string, description: string, itemIds: string[]) => Promise<void>;
  toggleItemInCollection: (collectionId: string, itemId: string) => Promise<void>;
  deleteCustomCollection: (collectionId: string) => Promise<void>;
  // Recommendation Feedback
  submitRecommendationFeedback: (
    targetTitle: string,
    feedbackType: RecommendationFeedbackType
  ) => Promise<void>;
  dismissRecommendationMovieId: (movieIdOrTitle: string) => Promise<void>;
  // Backup Import
  importLibraryItems: (
    items: Partial<LibraryItem>[],
    mode: 'merge' | 'replace'
  ) => Promise<number>;
  addCatalogItemToLibrary: (catalogItem: CatalogItem, status?: WatchStatus) => Promise<void>;
  // Local Movie Database & Administrator Catalogue
  catalog: CatalogItem[];
  upsertCatalogMovie: (movie: Partial<CatalogItem> & { title: string }) => Promise<CatalogItem>;
  deleteCatalogMovie: (movieId: string) => Promise<void>;
  importCatalogMovies: (items: CatalogItem[]) => Promise<{ added: number; updated: number }>;
  resetCatalogToDefaults: () => Promise<void>;
}

const NexusContext = createContext<NexusContextValue | null>(null);

function buildDefaultPreferences(uid: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    id: 'default',
    uid,
    theme: 'dark',
    posterDensity: 'comfortable',
    region: 'IN',
    useReviewSentiment: true,
    yearlyChallengeTarget: 50,
    preferredLanguages: ['Hindi', 'English', 'Japanese', 'Telugu'],
    favouriteGenres: ['Military Drama', 'Espionage', 'Sci-Fi', 'Thriller'],
    favouriteDirectors: ['Aditya Dhar', 'Farhan Akhtar', 'Denis Villeneuve', 'Christopher Nolan'],
    favouriteActors: ['Vicky Kaushal', 'Hrithik Roshan', 'Manoj Bajpayee', 'Cillian Murphy'],
    subscribedProviders: ['netflix', 'prime_video', 'jiohotstar', 'zee5'],
    createdAt: now,
    updatedAt: now,
  };
}

function buildSandboxSeedLibrary(uid: string): LibraryItem[] {
  if (uid === 'sandbox-user-b') {
    // Distinct isolated library for Sandbox User B to prove strict account separation
    const item = CURATED_CATALOG.find((c) => c.movieId === 'arch-parasite-2019') || CURATED_CATALOG[0];
    return [
      {
        id: 'lib-userb-parasite',
        uid,
        movieId: item.movieId,
        wikidataId: item.wikidataId,
        metadataProvider: item.metadataProvider,
        title: item.title,
        originalTitle: item.originalTitle,
        contentType: item.contentType,
        status: 'watched',
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        overview: item.overview,
        personalNotes: 'Private note belonging strictly to Sandbox User B.',
        releaseYear: item.releaseYear,
        language: item.language,
        country: item.country,
        director: item.director,
        productionInfo: item.productionInfo,
        ageRating: item.ageRating,
        runtimeMinutes: item.runtimeMinutes,
        userRating: 9.0,
        isFavourite: true,
        isHighlyAnticipated: false,
        priority: 'high',
        genres: item.genres,
        tags: item.tags,
        cast: item.cast,
        streamingByRegion: item.streamingByRegion,
        lastWatchedAt: '2026-11-04',
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-04T10:00:00.000Z',
      },
    ];
  }

  const pick = (movieId: string) =>
    CURATED_CATALOG.find((c) => c.movieId === movieId) || CURATED_CATALOG[0];
  const lakshya = pick('arch-lakshya-2004');
  const uri = pick('arch-uri-2019');
  const familyMan = pick('arch-family-man-2019');
  const severance = pick('arch-severance-2022');
  const dune2 = pick('arch-dune-part-two-2024');
  const shershaah = pick('arch-shershaah-2021');
  const darkSeries = pick('arch-dark-2017');

  return [
    {
      id: 'lib-lakshya-2004',
      uid,
      movieId: lakshya.movieId,
      wikidataId: lakshya.wikidataId,
      metadataProvider: lakshya.metadataProvider,
      title: lakshya.title,
      originalTitle: lakshya.originalTitle,
      contentType: 'movie',
      status: 'watched',
      posterUrl: lakshya.posterUrl,
      backdropUrl: lakshya.backdropUrl,
      overview: lakshya.overview,
      personalNotes: 'Unforgettable character transformation from academy cadet to Kargil officer.',
      releaseYear: lakshya.releaseYear,
      language: lakshya.language,
      country: lakshya.country,
      director: lakshya.director,
      productionInfo: lakshya.productionInfo,
      ageRating: lakshya.ageRating,
      runtimeMinutes: lakshya.runtimeMinutes,
      userRating: 9.4,
      isFavourite: true,
      isHighlyAnticipated: false,
      priority: 'high',
      genres: lakshya.genres,
      tags: lakshya.tags,
      cast: lakshya.cast,
      franchiseId: lakshya.franchiseId,
      trailerYoutubeUrl: lakshya.trailerYoutubeUrl,
      streamingByRegion: lakshya.streamingByRegion,
      lastWatchedAt: '2026-11-05',
      statusHistory: [{ from: 'want_to_watch', to: 'watched', changedAt: '2026-11-05' }],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-11-05T18:30:00.000Z',
    },
    {
      id: 'lib-uri-2019',
      uid,
      movieId: uri.movieId,
      wikidataId: uri.wikidataId,
      metadataProvider: uri.metadataProvider,
      title: uri.title,
      originalTitle: uri.originalTitle,
      contentType: 'movie',
      status: 'watched',
      posterUrl: uri.posterUrl,
      backdropUrl: uri.backdropUrl,
      overview: uri.overview,
      personalNotes: 'Taut four-chapter tactical structure and realistic special forces coordination.',
      releaseYear: uri.releaseYear,
      language: uri.language,
      country: uri.country,
      director: uri.director,
      productionInfo: uri.productionInfo,
      ageRating: uri.ageRating,
      runtimeMinutes: uri.runtimeMinutes,
      userRating: 9.2,
      isFavourite: true,
      isHighlyAnticipated: false,
      priority: 'high',
      genres: uri.genres,
      tags: uri.tags,
      cast: uri.cast,
      franchiseId: uri.franchiseId,
      trailerYoutubeUrl: uri.trailerYoutubeUrl,
      streamingByRegion: uri.streamingByRegion,
      lastWatchedAt: '2026-11-03',
      statusHistory: [{ from: 'want_to_watch', to: 'watched', changedAt: '2026-11-03' }],
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-11-03T20:00:00.000Z',
    },
    {
      id: 'lib-dune-part-two-2024',
      uid,
      movieId: dune2.movieId,
      wikidataId: dune2.wikidataId,
      metadataProvider: dune2.metadataProvider,
      title: dune2.title,
      originalTitle: dune2.originalTitle,
      contentType: 'movie',
      status: 'watched',
      posterUrl: dune2.posterUrl,
      backdropUrl: dune2.backdropUrl,
      overview: dune2.overview,
      personalNotes: 'Monumental sound design and desert cinematography.',
      releaseYear: dune2.releaseYear,
      language: dune2.language,
      country: dune2.country,
      director: dune2.director,
      productionInfo: dune2.productionInfo,
      ageRating: dune2.ageRating,
      runtimeMinutes: dune2.runtimeMinutes,
      userRating: 9.5,
      isFavourite: true,
      isHighlyAnticipated: false,
      priority: 'critical',
      genres: dune2.genres,
      tags: dune2.tags,
      cast: dune2.cast,
      franchiseId: dune2.franchiseId,
      trailerYoutubeUrl: dune2.trailerYoutubeUrl,
      streamingByRegion: dune2.streamingByRegion,
      lastWatchedAt: '2026-10-28',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-28T21:00:00.000Z',
    },
    {
      id: 'lib-family-man-2019',
      uid,
      movieId: familyMan.movieId,
      wikidataId: familyMan.wikidataId,
      metadataProvider: familyMan.metadataProvider,
      title: familyMan.title,
      originalTitle: familyMan.originalTitle,
      contentType: 'series',
      status: 'currently_watching',
      posterUrl: familyMan.posterUrl,
      backdropUrl: familyMan.backdropUrl,
      overview: familyMan.overview,
      personalNotes: 'Tracking Season 1 & Season 2 episodes before Season 3 drops.',
      releaseYear: familyMan.releaseYear,
      language: familyMan.language,
      country: familyMan.country,
      director: familyMan.director,
      productionInfo: familyMan.productionInfo,
      ageRating: familyMan.ageRating,
      runtimeMinutes: familyMan.runtimeMinutes,
      userRating: 9.1,
      isFavourite: true,
      isHighlyAnticipated: true,
      priority: 'high',
      genres: familyMan.genres,
      tags: familyMan.tags,
      cast: familyMan.cast,
      totalSeasons: 2,
      totalEpisodes: 6,
      completedEpisodes: 3,
      currentSeason: 1,
      currentEpisode: 3,
      watchedEpisodeCodes: ['S1E1', 'S1E2', 'S1E3'],
      showStatus: 'ongoing',
      episodes: familyMan.episodes,
      streamingByRegion: familyMan.streamingByRegion,
      lastWatchedAt: '2026-11-04',
      createdAt: '2026-10-12T10:00:00.000Z',
      updatedAt: '2026-11-04T21:00:00.000Z',
    },
    {
      id: 'lib-severance-2022',
      uid,
      movieId: severance.movieId,
      wikidataId: severance.wikidataId,
      metadataProvider: severance.metadataProvider,
      title: severance.title,
      originalTitle: severance.originalTitle,
      contentType: 'series',
      status: 'currently_watching',
      posterUrl: severance.posterUrl,
      backdropUrl: severance.backdropUrl,
      overview: severance.overview,
      personalNotes: 'Season 1 completed; currently watching Season 2.',
      releaseYear: severance.releaseYear,
      language: severance.language,
      country: severance.country,
      director: severance.director,
      productionInfo: severance.productionInfo,
      ageRating: severance.ageRating,
      runtimeMinutes: severance.runtimeMinutes,
      userRating: 9.3,
      isFavourite: true,
      isHighlyAnticipated: true,
      priority: 'high',
      genres: severance.genres,
      tags: severance.tags,
      cast: severance.cast,
      totalSeasons: 2,
      totalEpisodes: 6,
      completedEpisodes: 3,
      currentSeason: 1,
      currentEpisode: 3,
      watchedEpisodeCodes: ['S1E1', 'S1E2', 'S1E3'],
      showStatus: 'ongoing',
      episodes: severance.episodes,
      streamingByRegion: severance.streamingByRegion,
      lastWatchedAt: '2026-11-02',
      createdAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-11-02T22:00:00.000Z',
    },
    {
      id: 'lib-shershaah-2021',
      uid,
      movieId: shershaah.movieId,
      wikidataId: shershaah.wikidataId,
      metadataProvider: shershaah.metadataProvider,
      title: shershaah.title,
      originalTitle: shershaah.originalTitle,
      contentType: 'movie',
      status: 'want_to_watch',
      posterUrl: shershaah.posterUrl,
      backdropUrl: shershaah.backdropUrl,
      overview: shershaah.overview,
      personalNotes: 'Queued next in my Indian Military Cinema collection.',
      releaseYear: shershaah.releaseYear,
      language: shershaah.language,
      country: shershaah.country,
      director: shershaah.director,
      productionInfo: shershaah.productionInfo,
      ageRating: shershaah.ageRating,
      runtimeMinutes: shershaah.runtimeMinutes,
      userRating: 0,
      isFavourite: false,
      isHighlyAnticipated: true,
      priority: 'critical',
      genres: shershaah.genres,
      tags: shershaah.tags,
      cast: shershaah.cast,
      franchiseId: shershaah.franchiseId,
      streamingByRegion: shershaah.streamingByRegion,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'lib-dark-2017',
      uid,
      movieId: darkSeries.movieId,
      wikidataId: darkSeries.wikidataId,
      metadataProvider: darkSeries.metadataProvider,
      title: darkSeries.title,
      originalTitle: darkSeries.originalTitle,
      contentType: 'series',
      status: 'want_to_watch',
      posterUrl: darkSeries.posterUrl,
      backdropUrl: darkSeries.backdropUrl,
      overview: darkSeries.overview,
      releaseYear: darkSeries.releaseYear,
      language: darkSeries.language,
      country: darkSeries.country,
      director: darkSeries.director,
      productionInfo: darkSeries.productionInfo,
      ageRating: darkSeries.ageRating,
      runtimeMinutes: darkSeries.runtimeMinutes,
      userRating: 0,
      isFavourite: false,
      isHighlyAnticipated: true,
      priority: 'high',
      genres: darkSeries.genres,
      tags: darkSeries.tags,
      cast: darkSeries.cast,
      totalSeasons: 3,
      totalEpisodes: 26,
      completedEpisodes: 0,
      watchedEpisodeCodes: [],
      showStatus: 'completed',
      episodes: darkSeries.episodes,
      streamingByRegion: darkSeries.streamingByRegion,
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
    },
  ];
}

const LOCAL_CATALOG_STORAGE_KEY = 'cineshelf_local_movie_db_v1';
const FRIEND_SESSION_STORAGE_KEY = 'cineshelf_friend_session_v2';
const GUEST_SESSION_STORAGE_KEY = 'cineshelf_guest_session_v2';

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [account, setAccount] = useState<ActiveAccount | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');
  const [selectedItemModal, setSelectedItemModal] = useState<LibraryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Friend-Mode Login Modal & Issued Credentials state
  const [isFriendLoginModalOpen, setIsFriendLoginModalOpen] = useState(false);
  const [friendLoginPromptReason, setFriendLoginPromptReason] = useState<string>(
    'Sign in with a display name or temporary login code to create or join friend multiplayer rooms.'
  );
  const pendingAuthCallbackRef = React.useRef<((acc: ActiveAccount) => void) | null>(null);
  const [lastIssuedCredentials, setLastIssuedCredentials] =
    useState<IssuedTemporaryCredentials | null>(() => {
      try {
        const raw = localStorage.getItem('cineshelf_last_issued_credentials_v2');
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore
      }
      return null;
    });

  const clearLastIssuedCredentials = () => {
    setLastIssuedCredentials(null);
  };

  const openFriendLoginModal = (
    reason?: string,
    onAuthenticatedCallback?: (acc: ActiveAccount) => void
  ) => {
    setFriendLoginPromptReason(
      reason ||
        'Sign in with a display name or temporary login code to create or join friend multiplayer rooms.'
    );
    pendingAuthCallbackRef.current = onAuthenticatedCallback || null;
    setIsFriendLoginModalOpen(true);
  };

  const closeFriendLoginModal = () => {
    setIsFriendLoginModalOpen(false);
    pendingAuthCallbackRef.current = null;
  };

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CATALOG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => hydrateCatalogItemArtwork(item));
        }
      }
    } catch {
      // Fallback to CURATED_CATALOG
    }
    return CURATED_CATALOG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
    } catch {
      // Ignore storage quota warnings
    }
  }, [catalog]);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    buildDefaultPreferences('guest')
  );
  const [franchises, setFranchises] = useState<FranchiseDefinition[]>(BUILT_IN_FRANCHISES);
  const [feedback, setFeedback] = useState<RecommendationFeedback[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'Uri: The Surgical Strike',
    'Lakshya',
    'Severance',
  ]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, message: title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync dark/light class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [preferences.theme]);

  const hydrateUserVaultFromLocalOrSeed = (uid: string, persona: 'user_a' | 'user_b' = 'user_a') => {
    const storageKey = `cineshelf_sandbox_v1_${uid}`;
    const isDedicatedDemoSandbox = uid === 'sandbox-user-a' || uid === 'sandbox-user-b';
    const savedRaw = localStorage.getItem(storageKey);

    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        const libraryRows = Array.isArray(parsed.library) ? parsed.library : [];
        const historyRows = Array.isArray(parsed.watchHistory) ? parsed.watchHistory : [];
        const reviewRows = Array.isArray(parsed.reviews) ? parsed.reviews : [];
        const collectionRows = Array.isArray(parsed.collections) ? parsed.collections : [];
        const calendarRows = Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [];
        const notificationRows = Array.isArray(parsed.notifications) ? parsed.notifications : [];

        // Older builds accidentally prefilled real Guest/Friend accounts with demo viewing history.
        // Remove only the known seeded record IDs; preserve everything the user added themselves.
        const demoLibraryIds = new Set([
          'lib-lakshya-2004',
          'lib-uri-2019',
          'lib-dune-part-two-2024',
          'lib-family-man-2019',
          'lib-severance-2022',
          'lib-shershaah-2021',
          'lib-dark-2017',
          'lib-userb-parasite',
        ]);
        const demoHistoryIds = new Set(['wh-1', 'wh-2']);
        const demoReviewIds = new Set(['rev-1']);
        const demoCollectionIds = new Set(['col-1']);
        const demoCalendarIds = new Set(['cal-1', 'cal-2']);
        const demoNotificationIds = new Set(['notif-1']);

        const cleanDemoRows = !isDedicatedDemoSandbox;
        const cleanLibrary = cleanDemoRows
          ? libraryRows.filter((item: { id?: string }) => !demoLibraryIds.has(String(item?.id || '')))
          : libraryRows;
        const cleanHistory = cleanDemoRows
          ? historyRows.filter((item: { id?: string }) => !demoHistoryIds.has(String(item?.id || '')))
          : historyRows;
        const cleanReviews = cleanDemoRows
          ? reviewRows.filter((item: { id?: string }) => !demoReviewIds.has(String(item?.id || '')))
          : reviewRows;
        const cleanCollections = cleanDemoRows
          ? collectionRows.filter((item: { id?: string }) => !demoCollectionIds.has(String(item?.id || '')))
          : collectionRows;
        const cleanCalendar = cleanDemoRows
          ? calendarRows.filter((item: { id?: string }) => !demoCalendarIds.has(String(item?.id || '')))
          : calendarRows;
        const cleanNotifications = cleanDemoRows
          ? notificationRows.filter((item: { id?: string }) => !demoNotificationIds.has(String(item?.id || '')))
          : notificationRows;

        setLibrary(cleanLibrary);
        setWatchHistory(cleanHistory);
        setReviews(cleanReviews);
        setCollections(cleanCollections);
        setCalendarEvents(cleanCalendar);
        setPreferences(parsed.preferences || buildDefaultPreferences(uid));
        setFranchises(parsed.franchises || BUILT_IN_FRANCHISES);
        setFeedback(Array.isArray(parsed.feedback) ? parsed.feedback : []);
        setNotifications(cleanNotifications);

        const removedLegacyDemoRows =
          cleanLibrary.length !== libraryRows.length ||
          cleanHistory.length !== historyRows.length ||
          cleanReviews.length !== reviewRows.length ||
          cleanCollections.length !== collectionRows.length ||
          cleanCalendar.length !== calendarRows.length ||
          cleanNotifications.length !== notificationRows.length;

        if (removedLegacyDemoRows) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              ...parsed,
              library: cleanLibrary,
              watchHistory: cleanHistory,
              reviews: cleanReviews,
              collections: cleanCollections,
              calendarEvents: cleanCalendar,
              notifications: cleanNotifications,
            })
          );
        }
        return;
      } catch {
        // Fall through to a clean account or the explicit demo sandbox below.
      }
    }

    // Real Guest/Friend accounts start with an empty personal vault.
    // Only the two deliberately named development sandbox accounts receive sample records.
    if (!isDedicatedDemoSandbox) {
      setLibrary([]);
      setWatchHistory([]);
      setReviews([]);
      setCollections([]);
      setCalendarEvents([]);
      setPreferences(buildDefaultPreferences(uid));
      setFranchises(BUILT_IN_FRANCHISES);
      setFeedback([]);
      setNotifications([]);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          library: [],
          watchHistory: [],
          reviews: [],
          collections: [],
          calendarEvents: [],
          preferences: buildDefaultPreferences(uid),
          franchises: BUILT_IN_FRANCHISES,
          feedback: [],
          notifications: [],
        })
      );
      return;
    }

    const seededLib = buildSandboxSeedLibrary(uid);
    setLibrary(seededLib);
    setWatchHistory(
      persona === 'user_a'
        ? [
            {
              id: 'wh-1',
              uid,
              itemId: 'lib-lakshya-2004',
              title: 'Lakshya',
              contentType: 'movie',
              watchedDate: '2026-11-05',
              durationMinutes: 186,
              isRewatch: true,
              sessionNotes: 'Late evening screening — Kargil ridge sequence still unmatched.',
              ratingAtWatch: 9.4,
              createdAt: '2026-11-05T20:00:00.000Z',
              updatedAt: '2026-11-05T20:00:00.000Z',
            },
            {
              id: 'wh-2',
              uid,
              itemId: 'lib-uri-2019',
              title: 'Uri: The Surgical Strike',
              contentType: 'movie',
              watchedDate: '2026-11-03',
              durationMinutes: 138,
              isRewatch: false,
              sessionNotes: 'First full watch in 4K.',
              ratingAtWatch: 9.2,
              createdAt: '2026-11-03T20:00:00.000Z',
              updatedAt: '2026-11-03T20:00:00.000Z',
            },
          ]
        : []
    );
    setReviews(
      persona === 'user_a'
        ? [
            {
              id: 'rev-1',
              uid,
              itemId: 'lib-lakshya-2004',
              title: 'Lakshya',
              rating: 9.4,
              headline: 'A benchmark in Indian military coming-of-age cinema',
              body: 'Farhan Akhtar balances intimate personal drift with disciplined tactical authenticity at 16,000 feet.',
              containsSpoilers: false,
              sentiment: 'positive',
              createdAt: '2026-11-05T21:00:00.000Z',
              updatedAt: '2026-11-05T21:00:00.000Z',
            },
          ]
        : []
    );
    setCollections(
      persona === 'user_a'
        ? [
            {
              id: 'col-1',
              uid,
              name: 'Tactical & Intelligence Cinema',
              description: 'Realistic special operations, espionage, and strategic command films.',
              itemIds: ['lib-uri-2019', 'lib-lakshya-2004', 'lib-family-man-2019'],
              createdAt: '2026-11-01T10:00:00.000Z',
              updatedAt: '2026-11-05T10:00:00.000Z',
            },
          ]
        : []
    );
    setCalendarEvents(
      persona === 'user_a'
        ? [
            {
              id: 'cal-1',
              uid,
              itemId: 'lib-shershaah-2021',
              title: 'Shershaah (Planned Weekend Screening)',
              eventType: 'planned',
              plannedDate: '2026-11-08',
              durationMinutes: 135,
              notes: 'Next installment in Indian Military Cinema collection.',
              completed: false,
              createdAt: '2026-11-05T10:00:00.000Z',
              updatedAt: '2026-11-05T10:00:00.000Z',
            },
            {
              id: 'cal-2',
              uid,
              itemId: 'lib-lakshya-2004',
              title: 'Lakshya (Completed Watch Session)',
              eventType: 'actual',
              plannedDate: '2026-11-05',
              actualDate: '2026-11-05',
              durationMinutes: 186,
              notes: 'Completed screening.',
              completed: true,
              createdAt: '2026-11-05T20:00:00.000Z',
              updatedAt: '2026-11-05T20:00:00.000Z',
            },
          ]
        : []
    );
    setPreferences(buildDefaultPreferences(uid));
    setFranchises(BUILT_IN_FRANCHISES);
    setFeedback([]);
    setNotifications([
      {
        id: 'notif-1',
        uid,
        title: 'Scheduled Screening Reminder',
        message: 'Shershaah is scheduled on your Watch Calendar for 2026-11-08.',
        isRead: false,
        createdAt: '2026-11-06T09:00:00.000Z',
        updatedAt: '2026-11-06T09:00:00.000Z',
      },
    ]);
  };

  // A. Continue as Guest — Frictionless instant entry with unique Guest ID
  const continueAsGuest = async (
    customDisplayName?: string,
    inactivityTimeoutMinutes = 30
  ): Promise<ActiveAccount | null> => {
    try {
      const res = await apiFetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: customDisplayName?.trim() || undefined,
          inactivityTimeoutMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.session) {
        addToast(data.error || 'Could not start guest session.', 'error');
        return null;
      }

      const sess = data.session;
      const guestAcc: ActiveAccount = {
        uid: sess.uid,
        email: `${sess.guestId.toLowerCase()}@guest.cineshelf.local`,
        displayName: sess.displayName,
        avatarUrl: DEFAULT_AVATAR_ASSET,
        emailVerified: false,
        isDevelopmentSandbox: true,
        accessMode: 'guest',
        guestId: sess.guestId,
        sessionToken: data.sessionToken,
        inactivityTimeoutMinutes: sess.inactivityTimeoutMinutes || 30,
        expiresAtMs: sess.expiresAtMs,
        bio: `Temporary Guest Explorer (${sess.guestId}) — Full access to library, analytics & 3D AI Bot cinema.`,
        region: 'IN',
        isPrivate: true,
      };

      localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(guestAcc));
      localStorage.removeItem(FRIEND_SESSION_STORAGE_KEY);
      setAccount(guestAcc);
      hydrateUserVaultFromLocalOrSeed(guestAcc.uid, 'user_a');
      addToast(`Entered as Guest (${sess.guestId}). Full exploration & AI Bot 3D Theatre unlocked!`, 'info');
      return guestAcc;
    } catch {
      // Offline / local fallback guest creation
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const guestId = `GUEST-${suffix}`;
      const uid = `guest_${suffix.toLowerCase()}`;
      const fallbackAcc: ActiveAccount = {
        uid,
        email: `${guestId.toLowerCase()}@guest.cineshelf.local`,
        displayName: customDisplayName?.trim() || `Guest ${suffix.slice(0, 4)}`,
        avatarUrl: DEFAULT_AVATAR_ASSET,
        emailVerified: false,
        isDevelopmentSandbox: true,
        accessMode: 'guest',
        guestId,
        sessionToken: `sandbox-token:${uid}`,
        inactivityTimeoutMinutes,
        expiresAtMs: Date.now() + inactivityTimeoutMinutes * 60_000,
        bio: `Temporary Guest Explorer (${guestId})`,
        region: 'IN',
        isPrivate: true,
      };
      localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(fallbackAcc));
      setAccount(fallbackAcc);
      hydrateUserVaultFromLocalOrSeed(fallbackAcc.uid, 'user_a');
      return fallbackAcc;
    }
  };

  // B1. Temporary Passwordless Login — Create new Login ID + Temporary Login Code (Seamless Guest -> Friend Upgrade)
  const loginWithDisplayName = async (
    displayNameInput: string
  ): Promise<{ account: ActiveAccount; loginId: string; loginCode: string } | null> => {
    const cleanName = displayNameInput.trim();
    if (!cleanName) {
      addToast('Please enter a display name.', 'error');
      return null;
    }

    const wasGuest = account?.accessMode === 'guest';
    const prevLibrary = [...library];
    const prevWatchHistory = [...watchHistory];
    const prevReviews = [...reviews];
    const prevCollections = [...collections];
    const prevCalendarEvents = [...calendarEvents];
    const prevPreferences = { ...preferences };
    const prevFranchises = [...franchises];
    const prevFeedback = [...feedback];
    const prevNotifications = [...notifications];

    try {
      const res = await apiFetch('/api/auth/login-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: cleanName,
          guestToken: wasGuest ? account?.sessionToken : undefined,
          guestUid: wasGuest ? account?.uid : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.account || !data.session) {
        addToast(data.error || 'Could not generate temporary login credentials.', 'error');
        return null;
      }

      const srvAcc = data.account;
      const srvSess = data.session;
      const newUid: string = srvAcc.uid;

      const upgradedAcc: ActiveAccount = {
        uid: newUid,
        email: `${srvAcc.loginId.toLowerCase()}@friends.cineshelf.local`,
        displayName: srvAcc.displayName,
        avatarUrl: account?.avatarUrl || DEFAULT_AVATAR_ASSET,
        emailVerified: true,
        isDevelopmentSandbox: true,
        accessMode: 'friend',
        loginId: srvAcc.loginId,
        sessionToken: data.sessionToken,
        inactivityTimeoutMinutes: srvSess.inactivityTimeoutMinutes || 1440,
        expiresAtMs: srvSess.expiresAtMs,
        bio:
          wasGuest && account?.bio && !account.bio.startsWith('Temporary Guest')
            ? account.bio
            : `Friend Mode Account (${srvAcc.loginId}) — Multiplayer 3D Cinema enabled.`,
        region: account?.region || 'IN',
        isPrivate: true,
      };

      const issued: IssuedTemporaryCredentials = {
        loginId: srvAcc.loginId,
        loginCode: String(data.loginCode || ''),
        displayName: srvAcc.displayName,
        issuedAt: new Date().toISOString(),
      };
      setLastIssuedCredentials(issued);
      localStorage.setItem('cineshelf_last_issued_credentials_v2', JSON.stringify(issued));

      // Preserve all guest library / preferences / progress seamlessly without reloading
      if (wasGuest && prevLibrary.length > 0) {
        const migratedLib = prevLibrary.map((item) => ({ ...item, uid: newUid }));
        const migratedHistory = prevWatchHistory.map((w) => ({ ...w, uid: newUid }));
        const migratedReviews = prevReviews.map((r) => ({ ...r, uid: newUid }));
        const migratedCols = prevCollections.map((c) => ({ ...c, uid: newUid }));
        const migratedCal = prevCalendarEvents.map((ev) => ({ ...ev, uid: newUid }));
        const migratedPrefs = { ...prevPreferences, uid: newUid };

        setLibrary(migratedLib);
        setWatchHistory(migratedHistory);
        setReviews(migratedReviews);
        setCollections(migratedCols);
        setCalendarEvents(migratedCal);
        setPreferences(migratedPrefs);
        setFranchises(prevFranchises);
        setFeedback(prevFeedback);
        setNotifications(prevNotifications);

        localStorage.setItem(
          `cineshelf_sandbox_v1_${newUid}`,
          JSON.stringify({
            library: migratedLib,
            watchHistory: migratedHistory,
            reviews: migratedReviews,
            collections: migratedCols,
            calendarEvents: migratedCal,
            preferences: migratedPrefs,
            franchises: prevFranchises,
            feedback: prevFeedback,
            notifications: prevNotifications,
          })
        );
      } else {
        hydrateUserVaultFromLocalOrSeed(newUid, 'user_a');
      }

      localStorage.setItem(FRIEND_SESSION_STORAGE_KEY, JSON.stringify(upgradedAcc));
      localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      setAccount(upgradedAcc);

      if (pendingAuthCallbackRef.current) {
        const cb = pendingAuthCallbackRef.current;
        pendingAuthCallbackRef.current = null;
        cb(upgradedAcc);
      }

      addToast(
        wasGuest
          ? `Upgraded to Friend Mode (${srvAcc.loginId})! Your guest progress was preserved.`
          : `Logged in as ${srvAcc.displayName} (${srvAcc.loginId}).`,
        'success'
      );

      return {
        account: upgradedAcc,
        loginId: srvAcc.loginId,
        loginCode: String(data.loginCode || ''),
      };
    } catch (error) {
      addToast(apiErrorMessage(error, 'Network error while creating temporary login.'), 'error');
      return null;
    }
  };

  // B2. Temporary Passwordless Login — Verify existing Login ID + Temporary Login Code on any device
  const loginWithExistingCode = async (
    loginIdInput: string,
    loginCodeInput: string
  ): Promise<ActiveAccount | null> => {
    const cleanId = loginIdInput.trim().toUpperCase();
    const cleanCode = loginCodeInput.trim().toUpperCase();
    if (!cleanId || !cleanCode) {
      addToast('Enter both your Login ID and Temporary Login Code.', 'error');
      return null;
    }

    const wasGuest = account?.accessMode === 'guest';
    const prevLibrary = [...library];

    try {
      const res = await apiFetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: cleanId,
          loginCode: cleanCode,
          guestToken: wasGuest ? account?.sessionToken : undefined,
          guestUid: wasGuest ? account?.uid : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.account || !data.session) {
        addToast(data.error || 'Invalid Login ID or Temporary Login Code.', 'error');
        return null;
      }

      const srvAcc = data.account;
      const srvSess = data.session;
      const targetUid: string = srvAcc.uid;

      const verifiedAcc: ActiveAccount = {
        uid: targetUid,
        email: `${srvAcc.loginId.toLowerCase()}@friends.cineshelf.local`,
        displayName: srvAcc.displayName,
        avatarUrl: DEFAULT_AVATAR_ASSET,
        emailVerified: true,
        isDevelopmentSandbox: true,
        accessMode: 'friend',
        loginId: srvAcc.loginId,
        sessionToken: data.sessionToken,
        inactivityTimeoutMinutes: srvSess.inactivityTimeoutMinutes || 1440,
        expiresAtMs: srvSess.expiresAtMs,
        bio: `Friend Mode Account (${srvAcc.loginId}) — Multiplayer 3D Cinema enabled.`,
        region: 'IN',
        isPrivate: true,
      };

      // If upgrading from guest and target vault does not yet exist locally, preserve guest library
      const existingVaultRaw = localStorage.getItem(`cineshelf_sandbox_v1_${targetUid}`);
      if (!existingVaultRaw && wasGuest && prevLibrary.length > 0) {
        const migratedLib = prevLibrary.map((item) => ({ ...item, uid: targetUid }));
        setLibrary(migratedLib);
      } else {
        hydrateUserVaultFromLocalOrSeed(targetUid, 'user_a');
      }

      localStorage.setItem(FRIEND_SESSION_STORAGE_KEY, JSON.stringify(verifiedAcc));
      localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      setAccount(verifiedAcc);
      setIsFriendLoginModalOpen(false);

      if (pendingAuthCallbackRef.current) {
        const cb = pendingAuthCallbackRef.current;
        pendingAuthCallbackRef.current = null;
        cb(verifiedAcc);
      }

      addToast(`Welcome back, ${srvAcc.displayName} (${srvAcc.loginId})!`, 'success');
      return verifiedAcc;
    } catch (error) {
      addToast(apiErrorMessage(error, 'Network error while verifying login credentials.'), 'error');
      return null;
    }
  };

  // Update configurable Guest Inactivity Timeout (5 to 180 minutes)
  const updateGuestInactivityTimeout = async (minutes: number) => {
    const clamped = Math.max(5, Math.min(180, Math.round(Number(minutes) || 30)));
    if (!account) return;
    try {
      const res = await apiFetch('/api/auth/session/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${account.sessionToken}`,
        },
        body: JSON.stringify({ inactivityTimeoutMinutes: clamped }),
      });
      const data = await res.json();
      const updatedAcc: ActiveAccount = {
        ...account,
        inactivityTimeoutMinutes: clamped,
        expiresAtMs: data.session?.expiresAtMs || Date.now() + clamped * 60_000,
      };
      setAccount(updatedAcc);
      if (updatedAcc.accessMode === 'guest') {
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(updatedAcc));
      } else {
        localStorage.setItem(FRIEND_SESSION_STORAGE_KEY, JSON.stringify(updatedAcc));
      }
      addToast(`Updated guest session inactivity timeout to ${clamped} minutes.`, 'info');
    } catch {
      setAccount((prev) =>
        prev
          ? {
              ...prev,
              inactivityTimeoutMinutes: clamped,
              expiresAtMs: Date.now() + clamped * 60_000,
            }
          : null
      );
      addToast(`Updated inactivity timeout to ${clamped} minutes.`, 'info');
    }
  };

  const enterDevelopmentSandbox = (persona: 'user_a' | 'user_b' = 'user_a') => {
    const uid = persona === 'user_a' ? 'sandbox-user-a' : 'sandbox-user-b';
    const loginId = persona === 'user_a' ? 'NXID-VAULT-000A' : 'NXID-VAULT-000B';
    const sandboxAcc: ActiveAccount = {
      uid,
      email: persona === 'user_a' ? 'archivist.a@cineshelf.dev' : 'archivist.b@cineshelf.dev',
      displayName: persona === 'user_a' ? 'Aarav Mehta (Dev Sandbox A)' : 'Meera Kapoor (Dev Sandbox B)',
      avatarUrl: DEFAULT_AVATAR_ASSET,
      emailVerified: true,
      isDevelopmentSandbox: true,
      accessMode: 'friend',
      loginId,
      sessionToken: `sandbox-token:${uid}`,
      inactivityTimeoutMinutes: 1440,
      bio:
        persona === 'user_a'
          ? 'Curating Indian military history, tactical thrillers, and IMAX sci-fi.'
          : 'Isolated secondary sandbox account for cross-account privacy verification.',
      region: 'IN',
      isPrivate: true,
    };

    setAccount(sandboxAcc);
    hydrateUserVaultFromLocalOrSeed(uid, persona);
  };

  // Persist Sandbox / Guest / Friend changes to isolated UID key
  useEffect(() => {
    if (account?.isDevelopmentSandbox) {
      const storageKey = `cineshelf_sandbox_v1_${account.uid}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          library,
          watchHistory,
          reviews,
          collections,
          calendarEvents,
          preferences,
          franchises,
          feedback,
          notifications,
        })
      );
    }
  }, [
    account,
    library,
    watchHistory,
    reviews,
    collections,
    calendarEvents,
    preferences,
    franchises,
    feedback,
    notifications,
  ]);

  // Activity tracker & automatic inactivity expiration for Guest Mode sessions
  useEffect(() => {
    if (!account || account.accessMode !== 'guest') return;

    let lastPingMs = Date.now();
    const recordUserActivity = () => {
      const now = Date.now();
      const timeoutMs = (account.inactivityTimeoutMinutes || 30) * 60_000;
      setAccount((prev) =>
        prev && prev.accessMode === 'guest'
          ? { ...prev, expiresAtMs: now + timeoutMs }
          : prev
      );
      if (now - lastPingMs > 45_000 && account.sessionToken.startsWith('gst_')) {
        lastPingMs = now;
        apiFetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${account.sessionToken}` },
        }).catch(() => {});
      }
    };

    window.addEventListener('pointerdown', recordUserActivity, { passive: true });
    window.addEventListener('keydown', recordUserActivity, { passive: true });
    window.addEventListener('touchstart', recordUserActivity, { passive: true });

    const expiryInterval = window.setInterval(() => {
      if (account.expiresAtMs && Date.now() > account.expiresAtMs) {
        localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        setAccount(null);
        addToast(
          'Your temporary guest session expired due to inactivity. Continue as Guest or Log In anytime.',
          'info'
        );
      }
    }, 10_000);

    return () => {
      window.removeEventListener('pointerdown', recordUserActivity);
      window.removeEventListener('keydown', recordUserActivity);
      window.removeEventListener('touchstart', recordUserActivity);
      window.clearInterval(expiryInterval);
    };
  }, [account]);

  // Restore saved Friend or Guest session or listen to Firebase Authentication state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const modeParam = params.get('mode');
      if (modeParam === 'guest') {
        continueAsGuest('Guest Cinephile').finally(() => setAuthReady(true));
      } else {
        enterDevelopmentSandbox('user_a');
        setAuthReady(true);
      }
      return;
    }

    const restoreSavedSession = async (): Promise<boolean> => {
      const savedFriendRaw = localStorage.getItem(FRIEND_SESSION_STORAGE_KEY);
      const savedGuestRaw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      const candidateRaw = savedFriendRaw || savedGuestRaw;
      if (!candidateRaw) return false;

      try {
        const parsed: ActiveAccount = JSON.parse(candidateRaw);
        if (!parsed || !parsed.uid || !parsed.sessionToken) return false;

        if (
          parsed.sessionToken.startsWith('usr_') ||
          parsed.sessionToken.startsWith('gst_')
        ) {
          const res = await apiFetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${parsed.sessionToken}` },
          });
          if (!res.ok) {
            localStorage.removeItem(FRIEND_SESSION_STORAGE_KEY);
            localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
            return false;
          }
          const data = await res.json();
          if (data.session) {
            const refreshed: ActiveAccount = {
              ...parsed,
              displayName: data.session.displayName || parsed.displayName,
              expiresAtMs: data.session.expiresAtMs || parsed.expiresAtMs,
              inactivityTimeoutMinutes:
                data.session.inactivityTimeoutMinutes || parsed.inactivityTimeoutMinutes,
            };
            setAccount(refreshed);
            hydrateUserVaultFromLocalOrSeed(refreshed.uid, 'user_a');
            return true;
          }
        } else {
          setAccount(parsed);
          hydrateUserVaultFromLocalOrSeed(parsed.uid, 'user_a');
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (!fbUser) {
        await restoreSavedSession();
        setAuthReady(true);
        return;
      }

      const uid = fbUser.uid;
      const baseAcc: ActiveAccount = {
        uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'CineShelf Member',
        avatarUrl: fbUser.photoURL || DEFAULT_AVATAR_ASSET,
        emailVerified: fbUser.emailVerified,
        isDevelopmentSandbox: false,
        accessMode: 'friend',
        loginId: `FB-${uid.slice(0, 6).toUpperCase()}`,
        sessionToken: `sandbox-token:${uid}`,
        inactivityTimeoutMinutes: 1440,
        bio: 'Private personal cinema archive.',
        region: 'IN',
        isPrivate: true,
      };
      setAccount(baseAcc);
      setPreferences(buildDefaultPreferences(uid));

      // If email is verified, ensure /users/{uid} root profile exists and load private subcollections
      if (fbUser.emailVerified) {
        const userDocPath = `users/${uid}`;
        const userRef = doc(db, 'users', uid);
        try {
          const existingProfileSnap = await getDoc(userRef);
          if (!existingProfileSnap.exists()) {
            await setDoc(userRef, {
              uid,
              displayName: (baseAcc.displayName || 'CineShelf Member').slice(0, 120),
              avatarUrl: (baseAcc.avatarUrl || '').slice(0, 2000),
              bio: (baseAcc.bio || 'Private personal cinema archive.').slice(0, 1000),
              region: 'IN',
              isPrivate: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const profData = existingProfileSnap.data();
            if (profData) {
              setAccount((prev) =>
                prev
                  ? {
                      ...prev,
                      displayName: String(profData.displayName || prev.displayName),
                      avatarUrl: String(profData.avatarUrl || prev.avatarUrl),
                      bio: String(profData.bio || prev.bio),
                      region: String(profData.region || prev.region),
                      isPrivate: Boolean(profData.isPrivate ?? true),
                    }
                  : prev
              );
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userDocPath);
        }

        const libPath = `users/${uid}/library`;
        try {
          const libQuery = query(
            collection(db, 'users', uid, 'library'),
            where('uid', '==', uid)
          );
          const libSnap = await getDocs(libQuery);
          const loadedLib: LibraryItem[] = [];
          libSnap.forEach((d) => {
            const data = d.data();
            loadedLib.push({
              ...(data as LibraryItem),
              id: d.id,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              updatedAt:
                data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            });
          });
          setLibrary(loadedLib);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, libPath);
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Helper to sync a LibraryItem to Firestore when logged into a verified Firebase account
  const syncLibraryItemToFirestore = async (item: LibraryItem, _isNewHint: boolean) => {
    if (!account || account.isDevelopmentSandbox || !account.emailVerified) return;
    const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const path = `users/${account.uid}/library/${safeId}`;
    const itemRef = doc(db, 'users', account.uid, 'library', safeId);
    setSaveState('saving');
    try {
      const existingSnap = await getDoc(itemRef);
      const isCreate = !existingSnap.exists();

      const firestorePayload: Record<string, unknown> = {
        uid: account.uid,
        movieId: (item.movieId || safeId).slice(0, 64),
        metadataProvider: item.metadataProvider || 'local_json',
        providerExternalId: (item.providerExternalId || item.movieId || safeId).slice(0, 64),
        providerAttribution: (
          item.providerAttribution ||
          (item.metadataProvider === 'tvmaze'
            ? 'Data & artwork provided by TVmaze.com (CC BY-SA)'
            : item.metadataProvider === 'wikidata'
            ? 'Structured data from Wikidata (CC0 Public Domain)'
            : item.metadataProvider === 'manual'
            ? 'User-supplied entry'
            : 'CineShelf Local JSON Movie Database')
        ).slice(0, 240),
        title: (item.title || 'Untitled').slice(0, 300),
        contentType: item.contentType,
        status: item.status,
        posterUrl: (item.posterUrl || '').slice(0, 2000),
        backdropUrl: (item.backdropUrl || '').slice(0, 2000),
        overview: (item.overview || '').slice(0, 4000),
        personalNotes: (item.personalNotes || '').slice(0, 4000),
        releaseYear: item.releaseYear,
        language: (item.language || 'English').slice(0, 60),
        country: (item.country || 'India').slice(0, 80),
        director: (item.director || '').slice(0, 200),
        runtimeMinutes: item.runtimeMinutes,
        userRating: item.userRating,
        isFavourite: item.isFavourite,
        isHighlyAnticipated: item.isHighlyAnticipated,
        priority: item.priority,
        genres: (item.genres || []).slice(0, 20),
        tags: (item.tags || []).slice(0, 30),
        cast: (item.cast || []).slice(0, 30),
        totalSeasons: item.totalSeasons || 0,
        totalEpisodes: item.totalEpisodes || 0,
        completedEpisodes: item.completedEpisodes || 0,
        currentSeason: item.currentSeason || 1,
        currentEpisode: item.currentEpisode || 1,
        watchedEpisodeCodes: (item.watchedEpisodeCodes || []).slice(0, 500),
        franchiseId: (item.franchiseId || '').slice(0, 128),
        lastWatchedAt: (item.lastWatchedAt || '').slice(0, 64),
        updatedAt: serverTimestamp(),
      };
      if (isCreate) {
        firestorePayload.createdAt = serverTimestamp();
        await setDoc(itemRef, firestorePayload);
      } else {
        delete firestorePayload.uid;
        await updateDoc(itemRef, firestorePayload);
      }
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addOrMergeLibraryItem = async (
    candidate: Partial<LibraryItem>,
    onDuplicateStrategy: 'prevent' | 'merge' = 'merge'
  ): Promise<{ status: 'added' | 'merged' | 'duplicate_blocked'; item: LibraryItem }> => {
    const uid = account?.uid || 'sandbox-user-a';
    const existingDup = findDuplicateLibraryItem(library, {
      movieId: candidate.movieId,
      title: candidate.title || '',
      releaseYear: candidate.releaseYear,
      contentType: candidate.contentType,
    });

    if (existingDup) {
      if (onDuplicateStrategy === 'prevent') {
        addToast(`Duplicate prevented: "${existingDup.title}" is already in your library.`, 'info');
        return { status: 'duplicate_blocked', item: existingDup };
      }
      const merged = mergeLibraryItemMetadata(existingDup, candidate);
      setLibrary((prev) => prev.map((i) => (i.id === merged.id ? merged : i)));
      setSaveState('saved');
      await syncLibraryItemToFirestore(merged, false);
      addToast(`Merged metadata into existing entry "${merged.title}".`, 'info');
      return { status: 'merged', item: merged };
    }

    const now = new Date().toISOString();
    const id = candidate.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const provider = candidate.metadataProvider || 'manual';
    const newItem: LibraryItem = {
      id,
      uid,
      movieId: candidate.movieId || id,
      wikidataId: candidate.wikidataId,
      metadataProvider: provider,
      providerExternalId: candidate.providerExternalId || candidate.movieId || id,
      providerAttribution:
        candidate.providerAttribution ||
        (provider === 'tvmaze'
          ? 'Data & artwork provided by TVmaze.com (CC BY-SA)'
          : provider === 'wikidata'
          ? 'Structured data from Wikidata (CC0 Public Domain)'
          : provider === 'admin_catalogue'
          ? 'Managed via CineShelf Catalogue Admin'
          : provider === 'local_json' || provider === 'curated_catalog'
          ? 'CineShelf Local JSON Movie Database'
          : 'User-supplied manual entry'),
      title: (candidate.title || 'Untitled Entry').trim(),
      originalTitle: candidate.originalTitle || (candidate.title || 'Untitled Entry').trim(),
      contentType: candidate.contentType || 'movie',
      status: candidate.status || 'want_to_watch',
      posterUrl: candidate.posterUrl,
      backdropUrl: candidate.backdropUrl,
      overview: candidate.overview || '',
      personalNotes: candidate.personalNotes || '',
      releaseYear: Number(candidate.releaseYear) || 2024,
      language: candidate.language || 'English',
      country: candidate.country || 'India',
      director: candidate.director || 'Independent',
      productionInfo: candidate.productionInfo,
      ageRating: candidate.ageRating,
      runtimeMinutes: Number(candidate.runtimeMinutes) || 120,
      userRating: Number(candidate.userRating) || 0,
      isFavourite: Boolean(candidate.isFavourite),
      isHighlyAnticipated: Boolean(candidate.isHighlyAnticipated),
      priority: candidate.priority || 'medium',
      genres: candidate.genres?.length ? candidate.genres : ['Drama'],
      tags: candidate.tags || [],
      categories: candidate.categories || [],
      cast: candidate.cast || [],
      totalSeasons: candidate.totalSeasons || (candidate.contentType?.includes('series') ? 1 : 0),
      totalEpisodes: candidate.totalEpisodes || (candidate.contentType?.includes('series') ? 8 : 0),
      completedEpisodes: candidate.completedEpisodes || 0,
      currentSeason: candidate.currentSeason || 1,
      currentEpisode: candidate.currentEpisode || 1,
      watchedEpisodeCodes: candidate.watchedEpisodeCodes || [],
      showStatus: candidate.showStatus || 'completed',
      episodes: candidate.episodes,
      franchiseId: candidate.franchiseId,
      trailerYoutubeUrl: candidate.trailerYoutubeUrl,
      streamingByRegion: candidate.streamingByRegion || {},
      statusHistory: [{ from: 'none', to: candidate.status || 'want_to_watch', changedAt: now.slice(0, 10) }],
      lastWatchedAt: candidate.status === 'watched' ? now.slice(0, 10) : candidate.lastWatchedAt,
      createdAt: now,
      updatedAt: now,
    };

    setLibrary((prev) => [newItem, ...prev]);
    setSaveState('saved');
    await syncLibraryItemToFirestore(newItem, true);
    addToast(`Added "${newItem.title}" to your private library.`);
    return { status: 'added', item: newItem };
  };

  const addCatalogItemToLibrary = async (
    catalogItem: CatalogItem,
    status: WatchStatus = 'want_to_watch'
  ) => {
    const provider =
      catalogItem.metadataProvider ||
      (catalogItem.movieId?.startsWith('tvmaze-') ? 'tvmaze' : 'local_json');
    await addOrMergeLibraryItem({
      movieId: catalogItem.movieId,
      wikidataId: catalogItem.wikidataId,
      metadataProvider: provider,
      providerExternalId: catalogItem.providerExternalId || catalogItem.movieId,
      providerAttribution:
        catalogItem.providerAttribution ||
        (provider === 'tvmaze'
          ? 'Data & artwork provided by TVmaze.com (CC BY-SA)'
          : 'CineShelf Local JSON Movie Database'),
      title: catalogItem.title,
      originalTitle: catalogItem.originalTitle,
      contentType: catalogItem.contentType,
      status,
      posterUrl: catalogItem.posterUrl,
      backdropUrl: catalogItem.backdropUrl,
      overview: catalogItem.overview,
      releaseYear: catalogItem.releaseYear,
      language: catalogItem.language,
      country: catalogItem.country,
      director: catalogItem.director,
      productionInfo: catalogItem.productionInfo,
      ageRating: catalogItem.ageRating,
      runtimeMinutes: catalogItem.runtimeMinutes,
      userRating: status === 'watched' ? catalogItem.communityRating : 0,
      genres: catalogItem.genres,
      tags: catalogItem.tags,
      categories: catalogItem.categories,
      cast: catalogItem.cast,
      totalSeasons: catalogItem.totalSeasons,
      totalEpisodes: catalogItem.totalEpisodes,
      showStatus: catalogItem.showStatus,
      episodes: catalogItem.episodes,
      franchiseId: catalogItem.franchiseId,
      trailerYoutubeUrl: catalogItem.trailerYoutubeUrl,
      streamingByRegion: catalogItem.streamingByRegion,
    });
  };

  const updateLibraryItem = async (id: string, updates: Partial<LibraryItem>) => {
    let updatedTarget: LibraryItem | null = null;
    setLibrary((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        updatedTarget = {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedTarget;
      })
    );
    if (selectedItemModal?.id === id && updatedTarget) {
      setSelectedItemModal(updatedTarget);
    }
    setSaveState('saved');
    if (updatedTarget) {
      await syncLibraryItemToFirestore(updatedTarget, false);
    }
    addToast('Saved changes to library entry.');
  };

  const changeWatchStatus = async (id: string, nextStatus: WatchStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    let updatedTarget: LibraryItem | null = null;
    setLibrary((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const history = [
          ...(item.statusHistory || []),
          { from: item.status, to: nextStatus, changedAt: today },
        ];
        updatedTarget = {
          ...item,
          status: nextStatus,
          lastWatchedAt: nextStatus === 'watched' ? today : item.lastWatchedAt,
          statusHistory: history,
          updatedAt: new Date().toISOString(),
        };
        return updatedTarget;
      })
    );
    if (selectedItemModal?.id === id && updatedTarget) {
      setSelectedItemModal(updatedTarget);
    }
    setSaveState('saved');
    if (updatedTarget) {
      await syncLibraryItemToFirestore(updatedTarget, false);
      addToast(`Updated "${(updatedTarget as LibraryItem).title}" to ${nextStatus.replace(/_/g, ' ')}.`);
    }
  };

  const deleteLibraryItem = async (id: string) => {
    const target = library.find((i) => i.id === id);
    setLibrary((prev) => prev.filter((i) => i.id !== id));
    if (selectedItemModal?.id === id) setSelectedItemModal(null);
    if (account && !account.isDevelopmentSandbox && account.emailVerified) {
      try {
        await deleteDoc(doc(db, 'users', account.uid, 'library', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${account.uid}/library/${id}`);
      }
    }
    setSaveState('saved');
    if (target) addToast(`Removed "${target.title}" from library.`, 'info');
  };

  const bulkUpdateStatus = async (ids: string[], nextStatus: WatchStatus) => {
    const idSet = new Set(ids);
    const today = new Date().toISOString().slice(0, 10);
    setLibrary((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              status: nextStatus,
              lastWatchedAt: nextStatus === 'watched' ? today : item.lastWatchedAt,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setSaveState('saved');
    addToast(`Updated ${ids.length} titles to ${nextStatus.replace(/_/g, ' ')}.`);
  };

  const bulkDeleteItems = async (ids: string[]) => {
    const idSet = new Set(ids);
    setLibrary((prev) => prev.filter((i) => !idSet.has(i.id)));
    setSaveState('saved');
    addToast(`Deleted ${ids.length} selected titles.`, 'info');
  };

  const toggleEpisodeWatched = async (itemId: string, episodeCode: string) => {
    const target = library.find((i) => i.id === itemId);
    if (!target) return;
    const result = toggleSeriesEpisode(target, episodeCode);
    await updateLibraryItem(itemId, {
      watchedEpisodeCodes: result.watchedEpisodeCodes,
      completedEpisodes: result.completedEpisodes,
      totalEpisodes: result.totalEpisodes,
      currentSeason: result.currentSeason,
      currentEpisode: result.currentEpisode,
      status: result.status,
      lastWatchedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const addReview = async (
    reviewInput: Omit<ReviewRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();
    const newRev: ReviewRecord = {
      ...reviewInput,
      id: `rev-${Date.now()}`,
      uid,
      createdAt: now,
      updatedAt: now,
    };
    setReviews((prev) => [newRev, ...prev]);
    await updateLibraryItem(reviewInput.itemId, { userRating: reviewInput.rating });
    addToast(`Published private review for "${reviewInput.title}".`);
  };

  const logWatchSession = async (
    sessionInput: Omit<WatchHistoryRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();
    const newSession: WatchHistoryRecord = {
      ...sessionInput,
      id: `wh-${Date.now()}`,
      uid,
      createdAt: now,
      updatedAt: now,
    };
    setWatchHistory((prev) => [newSession, ...prev]);
    setSaveState('saved');
    addToast(`Logged viewing session for "${sessionInput.title}".`);
  };

  const addCalendarEvent = async (
    evInput: Omit<CalendarEvent, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();
    const newEv: CalendarEvent = {
      ...evInput,
      id: `cal-${Date.now()}`,
      uid,
      createdAt: now,
      updatedAt: now,
    };
    setCalendarEvents((prev) => [newEv, ...prev]);
    setSaveState('saved');
    addToast(`Scheduled "${evInput.title}" on ${evInput.plannedDate}.`);
  };

  const toggleCalendarEventCompleted = async (eventId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setCalendarEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              completed: !ev.completed,
              actualDate: !ev.completed ? today : ev.actualDate,
              updatedAt: new Date().toISOString(),
            }
          : ev
      )
    );
    setSaveState('saved');
  };

  const deleteCalendarEvent = async (eventId: string) => {
    setCalendarEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setSaveState('saved');
    addToast('Removed calendar entry.', 'info');
  };

  const toggleFranchiseInstallmentWatched = async (franchiseId: string, entryId: string) => {
    setFranchises((prev) =>
      prev.map((f) => {
        if (f.id !== franchiseId) return f;
        const set = new Set(f.watchedEntryIds || []);
        if (set.has(entryId)) {
          set.delete(entryId);
        } else {
          set.add(entryId);
        }
        return { ...f, watchedEntryIds: Array.from(set) };
      })
    );
    setSaveState('saved');
    addToast('Updated franchise progress.');
  };

  const createCustomFranchise = async (
    name: string,
    description: string,
    installments: FranchiseDefinition['installments']
  ) => {
    const newFranchise: FranchiseDefinition = {
      id: `franchise-custom-${Date.now()}`,
      uid: account?.uid || 'sandbox-user-a',
      name,
      description,
      category: 'Custom Franchise',
      installments,
      watchedEntryIds: [],
      isCustom: true,
    };
    setFranchises((prev) => [newFranchise, ...prev]);
    setSaveState('saved');
    addToast(`Created custom franchise "${name}".`);
  };

  const createCustomCollection = async (name: string, description: string, itemIds: string[]) => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();
    const newCol: CustomCollection = {
      id: `col-${Date.now()}`,
      uid,
      name,
      description,
      itemIds,
      createdAt: now,
      updatedAt: now,
    };
    setCollections((prev) => [newCol, ...prev]);
    setSaveState('saved');
    addToast(`Created collection "${name}".`);
  };

  const toggleItemInCollection = async (collectionId: string, itemId: string) => {
    setCollections((prev) =>
      prev.map((col) => {
        if (col.id !== collectionId) return col;
        const set = new Set(col.itemIds);
        if (set.has(itemId)) set.delete(itemId);
        else set.add(itemId);
        return { ...col, itemIds: Array.from(set), updatedAt: new Date().toISOString() };
      })
    );
    setSaveState('saved');
  };

  const deleteCustomCollection = async (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    setSaveState('saved');
    addToast('Deleted collection.', 'info');
  };

  const submitRecommendationFeedback = async (
    targetTitle: string,
    feedbackType: RecommendationFeedbackType
  ) => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();
    setFeedback((prev) => [
      ...prev.filter((f) => f.targetTitle.toLowerCase() !== targetTitle.toLowerCase()),
      {
        id: `fb-${Date.now()}`,
        uid,
        targetTitle,
        feedbackType,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setSaveState('saved');
    addToast(`Recorded "${feedbackType.replace('_', ' ')}" preference for "${targetTitle}".`, 'info');
  };

  const importLibraryItems = async (
    items: Partial<LibraryItem>[],
    mode: 'merge' | 'replace'
  ): Promise<number> => {
    const uid = account?.uid || 'sandbox-user-a';
    const now = new Date().toISOString();

    if (mode === 'replace') {
      const built: LibraryItem[] = items.map((c, idx) => ({
        id: `imp-${Date.now()}-${idx}`,
        uid,
        title: c.title || 'Imported Entry',
        contentType: c.contentType || 'movie',
        status: c.status || 'want_to_watch',
        releaseYear: c.releaseYear || 2024,
        language: c.language || 'English',
        country: c.country || 'India',
        director: c.director || '',
        runtimeMinutes: c.runtimeMinutes || 120,
        userRating: c.userRating || 0,
        isFavourite: Boolean(c.isFavourite),
        isHighlyAnticipated: Boolean(c.isHighlyAnticipated),
        priority: c.priority || 'medium',
        genres: c.genres || ['Drama'],
        tags: c.tags || [],
        cast: c.cast || [],
        createdAt: now,
        updatedAt: now,
      }));
      setLibrary(built);
      setSaveState('saved');
      addToast(`Replaced library with ${built.length} imported entries.`);
      return built.length;
    }

    let count = 0;
    for (const item of items) {
      await addOrMergeLibraryItem(item, 'merge');
      count += 1;
    }
    return count;
  };

  const updateAccountProfile = async (updates: Partial<ActiveAccount>) => {
    setAccount((prev) => (prev ? { ...prev, ...updates } : null));
    setSaveState('saved');
    addToast('Updated private profile settings.');
  };

  const updateUserPreferences = async (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    setSaveState('saved');
    addToast('Saved personalization preferences.');
  };

  const addSearchHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 8));
  };

  const recordRecentlyViewed = (id: string) => {
    setRecentlyViewedIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 10));
  };

  // Requirement 21: Logout clears personal information from the interface and sensitive in-memory state
  const logoutAccount = async () => {
    try {
      if (account?.sessionToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${account.sessionToken}` },
        }).catch(() => {});
      }
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Continue clearing local state
    }
    localStorage.removeItem(FRIEND_SESSION_STORAGE_KEY);
    localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    setAccount(null);
    setLibrary([]);
    setWatchHistory([]);
    setReviews([]);
    setCollections([]);
    setCalendarEvents([]);
    setFeedback([]);
    setNotifications([]);
    setRecentlyViewedIds([]);
    setSelectedItemModal(null);
    setIsFriendLoginModalOpen(false);
    setActiveSection('dashboard');
    addToast('Signed out securely. Session ended.', 'info');
  };

  // Requirement 10 & 22: Account deletion removes user's private data and files
  const deleteAccountAndData = async () => {
    if (!account) return;
    if (account.isDevelopmentSandbox) {
      localStorage.removeItem(`cineshelf_sandbox_v1_${account.uid}`);
      await logoutAccount();
      addToast('Deleted account data and reset session.', 'info');
      return;
    }
    if (auth.currentUser && auth.currentUser.uid === account.uid) {
      for (const item of library) {
        try {
          await deleteDoc(doc(db, 'users', account.uid, 'library', item.id));
        } catch {
          // Continue cleanup
        }
      }
      try {
        await deleteDoc(doc(db, 'users', account.uid));
      } catch {
        // Continue cleanup
      }
      await deleteUser(auth.currentUser);
      await logoutAccount();
    }
  };

  const dismissRecommendationMovieId = async (movieIdOrTitle: string) => {
    const match = catalog.find((c) => c.movieId === movieIdOrTitle);
    await submitRecommendationFeedback(match ? match.title : movieIdOrTitle, 'dismissed');
  };

  const upsertCatalogMovie = async (
    movieInput: Partial<CatalogItem> & { title: string }
  ): Promise<CatalogItem> => {
    const now = new Date().toISOString();
    const movieId =
      movieInput.movieId?.trim() ||
      `admin-${movieInput.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${movieInput.releaseYear || 2024}`;

    const hydrated = hydrateCatalogItemArtwork({
      ...movieInput,
      movieId,
      metadataProvider: movieInput.metadataProvider || 'admin_catalogue',
      providerAttribution:
        movieInput.providerAttribution || 'Managed via CineShelf Catalogue Admin',
      addedAt: movieInput.addedAt || now,
      isManuallyEdited: true,
    });

    setCatalog((prev) => {
      const idx = prev.findIndex((c) => c.movieId === hydrated.movieId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = hydrated;
        return next;
      }
      return [hydrated, ...prev];
    });

    try {
      await apiFetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hydrated),
      });
    } catch {
      // Offline / local fallback already persisted in localStorage
    }

    setSaveState('saved');
    addToast(`Saved "${hydrated.title}" in movie catalogue.`);
    return hydrated;
  };

  const deleteCatalogMovie = async (movieId: string) => {
    const target = catalog.find((c) => c.movieId === movieId);
    setCatalog((prev) => prev.filter((c) => c.movieId !== movieId));
    try {
      await apiFetch(`/api/catalog/${encodeURIComponent(movieId)}`, { method: 'DELETE' });
    } catch {
      // Offline / local fallback already persisted in localStorage
    }
    setSaveState('saved');
    if (target) {
      addToast(`Deleted "${target.title}" from movie catalogue.`, 'info');
    }
  };

  const importCatalogMovies = async (
    incomingItems: CatalogItem[]
  ): Promise<{ added: number; updated: number }> => {
    let added = 0;
    let updated = 0;

    setCatalog((prev) => {
      const next = [...prev];
      for (const inc of incomingItems) {
        const existingIdx = next.findIndex(
          (ex) =>
            ex.movieId === inc.movieId ||
            (ex.wikidataId && inc.wikidataId && ex.wikidataId.toUpperCase() === inc.wikidataId.toUpperCase()) ||
            (ex.title.toLowerCase() === inc.title.toLowerCase() && ex.releaseYear === inc.releaseYear)
        );
        if (existingIdx >= 0) {
          const { merged } = mergeCatalogItemPreservingEdits(next[existingIdx], inc);
          next[existingIdx] = merged;
          updated++;
        } else {
          next.unshift(hydrateCatalogItemArtwork(inc));
          added++;
        }
      }
      return next;
    });

    try {
      await apiFetch('/api/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: incomingItems }),
      });
    } catch {
      // Local persistence already updated
    }

    setSaveState('saved');
    addToast(`Catalogue import complete: ${added} added, ${updated} merged.`);
    return { added, updated };
  };

  const resetCatalogToDefaults = async () => {
    setCatalog(CURATED_CATALOG);
    localStorage.removeItem(LOCAL_CATALOG_STORAGE_KEY);
    setSaveState('saved');
    addToast('Reset movie catalogue to default verified records.', 'info');
  };

  // Expose window.__appTest for deterministic browser inspection
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__appTest = {
      getState: () => ({
        authReady,
        account: account
          ? {
              uid: account.uid,
              displayName: account.displayName,
              accessMode: account.accessMode,
              guestId: account.guestId || null,
              loginId: account.loginId || null,
              inactivityTimeoutMinutes: account.inactivityTimeoutMinutes,
            }
          : null,
        activeSection,
        libraryCount: library.length,
        catalogCount: catalog.length,
        isFriendLoginModalOpen,
      }),
      continueAsGuest,
      loginWithDisplayName,
      loginWithExistingCode,
      logoutAccount,
      setActiveSection,
    };
  }, [
    authReady,
    account,
    activeSection,
    library.length,
    catalog.length,
    isFriendLoginModalOpen,
  ]);

  const value = useMemo<NexusContextValue>(
    () => ({
      authReady,
      account,
      saveState,
      activeSection,
      setActiveSection,
      selectedItemModal,
      setSelectedItemModal,
      selectedItemForModal: selectedItemModal,
      setSelectedItemForModal: setSelectedItemModal,
      isAddModalOpen,
      setIsAddModalOpen,
      library,
      watchHistory,
      reviews,
      collections,
      calendarEvents,
      preferences,
      franchises,
      feedback,
      notifications,
      recentlyViewedIds,
      searchHistory,
      addSearchHistory,
      recordSearchQuery: addSearchHistory,
      recordRecentlyViewed,
      toasts,
      addToast,
      dismissToast,
      continueAsGuest,
      loginWithDisplayName,
      loginWithExistingCode,
      updateGuestInactivityTimeout,
      isFriendLoginModalOpen,
      friendLoginPromptReason,
      openFriendLoginModal,
      closeFriendLoginModal,
      lastIssuedCredentials,
      clearLastIssuedCredentials,
      enterDevelopmentSandbox,
      logoutAccount,
      signOutCurrentAccount: logoutAccount,
      deleteAccountAndData,
      updateAccountProfile,
      updateUserPreferences,
      addOrMergeLibraryItem,
      updateLibraryItem,
      changeWatchStatus,
      deleteLibraryItem,
      bulkUpdateStatus,
      bulkDeleteItems,
      toggleEpisodeWatched,
      addReview,
      logWatchSession,
      addCalendarEvent,
      toggleCalendarEventCompleted,
      toggleCalendarEventDone: toggleCalendarEventCompleted,
      deleteCalendarEvent,
      toggleFranchiseInstallmentWatched,
      createCustomFranchise,
      createCustomCollection,
      toggleItemInCollection,
      deleteCustomCollection,
      submitRecommendationFeedback,
      dismissRecommendationMovieId,
      importLibraryItems,
      addCatalogItemToLibrary,
      catalog,
      upsertCatalogMovie,
      deleteCatalogMovie,
      importCatalogMovies,
      resetCatalogToDefaults,
    }),
    [
      authReady,
      account,
      saveState,
      activeSection,
      selectedItemModal,
      isAddModalOpen,
      library,
      watchHistory,
      reviews,
      collections,
      calendarEvents,
      preferences,
      franchises,
      feedback,
      notifications,
      recentlyViewedIds,
      searchHistory,
      toasts,
      catalog,
      isFriendLoginModalOpen,
      friendLoginPromptReason,
      lastIssuedCredentials,
    ]
  );

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
};

export function useNexus() {
  const ctx = useContext(NexusContext);
  if (!ctx) throw new Error('useNexus must be used within a NexusProvider');
  return ctx;
}
