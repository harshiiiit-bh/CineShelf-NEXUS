export type ContentType =
  | 'movie'
  | 'series'
  | 'anime'
  | 'animated_movie'
  | 'animated_series'
  | 'documentary'
  | 'short_film'
  | 'custom';

export type WatchStatus =
  | 'want_to_watch'
  | 'currently_watching'
  | 'watched'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_rewatch'
  | 'hidden';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type AvailabilityState = 'available' | 'unavailable' | 'unknown';

export type MetadataProviderId =
  | 'local_json'
  | 'wikidata'
  | 'admin_catalogue'
  | 'tvmaze'
  | 'curated_catalog'
  | 'manual';

export interface StreamingProviderOffer {
  providerId: string;
  providerName: string;
  monetizationType: 'subscription' | 'rent' | 'buy' | 'free';
  officialUrl: string;
}

export interface RegionalAvailability {
  region: string; // e.g. 'IN', 'US', 'GB', 'JP'
  state: AvailabilityState;
  providers: StreamingProviderOffer[];
  lastCheckedAt: string;
  isManualRecord?: boolean;
}

export interface EpisodeMetadata {
  code: string; // e.g., 'S1E1'
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  releaseDate: string;
  runtimeMinutes: number;
}

export interface StatusChangeEntry {
  from: WatchStatus | 'none';
  to: WatchStatus;
  changedAt: string;
}

export interface LibraryItem {
  id: string;
  uid: string;
  movieId?: string;
  wikidataId?: string;
  metadataProvider?: MetadataProviderId;
  providerExternalId?: string;
  providerAttribution?: string;
  title: string;
  originalTitle?: string;
  contentType: ContentType;
  status: WatchStatus;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  personalNotes?: string;
  releaseYear: number;
  language?: string;
  country?: string;
  director?: string;
  productionInfo?: string;
  ageRating?: string;
  runtimeMinutes: number; // For series, average episode runtime or total runtime
  userRating: number; // 0 to 10 (0 = unrated)
  isFavourite: boolean;
  isHighlyAnticipated: boolean;
  priority: PriorityLevel;
  genres: string[];
  tags: string[];
  categories?: string[];
  cast: string[];
  // Series-specific fields
  totalSeasons?: number;
  totalEpisodes?: number;
  completedEpisodes?: number;
  currentSeason?: number;
  currentEpisode?: number;
  watchedEpisodeCodes?: string[];
  showStatus?: 'ongoing' | 'completed';
  episodes?: EpisodeMetadata[];
  // Franchise & Discovery metadata
  franchiseId?: string;
  trailerYoutubeUrl?: string;
  popularityScore?: number;
  streamingByRegion?: Record<string, RegionalAvailability>;
  statusHistory?: StatusChangeEntry[];
  lastWatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchHistoryRecord {
  id: string;
  uid: string;
  itemId: string;
  title: string;
  contentType: ContentType;
  watchedDate: string; // YYYY-MM-DD
  durationMinutes: number;
  isRewatch: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
  sessionNotes?: string;
  ratingAtWatch?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  uid: string;
  itemId: string;
  title: string;
  rating: number;
  headline: string;
  body: string;
  containsSpoilers: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: string;
  updatedAt: string;
}

export interface CustomCollection {
  id: string;
  uid: string;
  name: string;
  description: string;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  uid: string;
  itemId?: string;
  title: string;
  eventType: 'planned' | 'actual' | 'reminder' | 'release';
  plannedDate: string; // YYYY-MM-DD
  actualDate?: string; // YYYY-MM-DD
  durationMinutes: number;
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  uid: string;
  theme: 'dark' | 'light';
  posterDensity: 'compact' | 'comfortable' | 'cinematic';
  region: string; // Default 'IN'
  useReviewSentiment: boolean;
  yearlyChallengeTarget: number;
  preferredLanguages: string[];
  favouriteGenres: string[];
  favouriteDirectors: string[];
  favouriteActors: string[];
  subscribedProviders: string[];
  avatarAppearance?: CharacterAppearance;
  graphicsQuality?: GraphicsQualityPreset;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseInstallment {
  entryId: string;
  movieId: string;
  title: string;
  releaseYear: number;
  chronologicalIndex: number;
  releaseIndex: number;
  contentType: ContentType;
  runtimeMinutes: number;
  director: string;
  isUpcoming?: boolean;
  releaseDate?: string;
}

export interface FranchiseDefinition {
  id: string;
  uid?: string;
  name: string;
  description: string;
  category: string;
  installments: FranchiseInstallment[];
  watchedEntryIds: string[];
  customOrderIds?: string[];
  isCustom?: boolean;
}

export type RecommendationFeedbackType = 'like' | 'dislike' | 'not_interested' | 'dismissed';

export interface RecommendationFeedback {
  id: string;
  uid: string;
  targetTitle: string;
  feedbackType: RecommendationFeedbackType;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  uid: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  movieId: string;
  wikidataId?: string;
  metadataProvider?: MetadataProviderId;
  providerExternalId?: string;
  providerAttribution?: string;
  title: string;
  originalTitle?: string;
  contentType: ContentType;
  releaseYear: number;
  language: string;
  country: string;
  director: string;
  productionInfo?: string;
  ageRating?: string;
  cast: string[];
  genres: string[];
  tags: string[];
  categories?: string[];
  runtimeMinutes: number;
  communityRating: number;
  popularityScore: number;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeUrl?: string;
  franchiseId?: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  showStatus?: 'ongoing' | 'completed';
  episodes?: EpisodeMetadata[];
  isUpcoming?: boolean;
  addedAt?: string;
  isManuallyEdited?: boolean;
  streamingByRegion: Record<string, RegionalAvailability>;
}

export interface RecommendationCardItem {
  catalogItem: CatalogItem;
  whyRecommended: string;
  matchScore: number;
  sectionKey: string;
  isRewatchSuggestion?: boolean;
}

export interface RecommendationSection {
  key: string;
  number: number;
  title: string;
  subtitle: string;
  items: RecommendationCardItem[];
}

export type StreamingRegionCode = 'IN' | 'US' | 'GB' | 'CA' | 'AU' | 'JP' | string;

export type NavigationSection =
  | 'dashboard'
  | 'watch_together'
  | 'character_studio'
  | 'discover'
  | 'library'
  | 'watchlist'
  | 'currently_watching'
  | 'watched'
  | 'series'
  | 'series_tracker'
  | 'recommendations'
  | 'franchises'
  | 'calendar'
  | 'streaming'
  | 'statistics'
  | 'collections'
  | 'admin_catalog'
  | 'profile'
  | 'settings';

// ============================================================================
// NEXUS SOCIAL — REAL-TIME 3D MULTIPLAYER CINEMA TYPES
// ============================================================================

export type TheatreThemeId =
  | 'classic_cinema'
  | 'modern_multiplex'
  | 'luxury_gold'
  | 'retro_cinema'
  | 'futuristic_scifi'
  | 'private_vip';

export type RoomCapacityOption = 20 | 25 | 30 | 35;

export type CharacterStyleId =
  | 'modern_casual'
  | 'cartoon_stylised'
  | 'stylised_game'
  | 'futuristic_cyber'
  | 'classic_cinema';

export type CharacterHairId =
  | 'short_crop'
  | 'wavy_part'
  | 'cyber_undercut'
  | 'bun_classic'
  | 'spiky'
  | 'cap'
  | 'textured_crop'
  | 'swept_waves'
  | 'cyber_bob'
  | 'pompadour'
  | 'braids'
  | 'long_flowing'
  | 'long_wavy'
  | 'ponytail'
  | 'afro'
  | 'mohawk';

export type CharacterOutfitId =
  | 'hoodie_denim'
  | 'tuxedo_velvet'
  | 'neon_jacket'
  | 'retro_varsity'
  | 'vip_blazer'
  | 'velvet_jacket'
  | 'cyber_hoodie'
  | 'tuxedo'
  | 'casual_denim'
  | 'astronaut_suit';

export type CharacterAccessoryId =
  | 'none'
  | '3d_glasses'
  | 'cinema_beret'
  | 'gold_headset'
  | 'visor'
  | 'cyber_visor'
  | 'aviators'
  | 'headset'
  | 'gold_chain';

export type FacialHairStyleId =
  | 'clean_shaven'
  | 'stubble'
  | 'short_beard'
  | 'full_beard'
  | 'goatee'
  | 'handlebar_moustache'
  | 'curled_moustache'
  | 'long_moustache'
  | 'oversized_moustache'
  | 'wizard_beard'
  | 'cartoon_moustache';

export type HeadwearId =
  | 'none'
  | 'cap_baseball'
  | 'beanie_street'
  | 'bucket_hat'
  | 'cowboy_hat'
  | 'top_hat'
  | 'crown_royal'
  | 'helmet_retro'
  | 'tiny_hat'
  | 'giant_top_hat'
  | 'baldpatch_funny';

export type UpperBodyId =
  | 'tee_casual'
  | 'tee_oversized'
  | 'hoodie_street'
  | 'shirt_formal'
  | 'leather_jacket'
  | 'suit_jacket'
  | 'cozy_sweater'
  | 'jersey_sports';

export type LowerBodyId =
  | 'jeans_slim'
  | 'pants_formal'
  | 'cargo_pants'
  | 'shorts_casual'
  | 'joggers_street';

export type FootwearId =
  | 'sneakers_fresh'
  | 'shoes_oxford'
  | 'boots_leather'
  | 'sandals_casual'
  | 'slippers_funny';

export type FunnyCosmeticId =
  | 'none'
  | 'moustaches_giant'
  | 'glasses_on_head'
  | 'clown_nose'
  | 'oversized_ears'
  | 'floating_halo'
  | 'floating_crown'
  | 'floating_stars'
  | 'novelty_antennas'
  | 'oversized_headphones'
  | 'funny_sunglasses'
  | 'monocle'
  | 'cartoon_teeth'
  | 'silly_mask'
  | 'funny_headband';

export type MaterialFinishType =
  | 'cotton'
  | 'denim'
  | 'leather'
  | 'wool'
  | 'metallic'
  | 'glossy'
  | 'matte';

export interface CharacterOutfitPreset {
  id: string;
  name: string;
  category: 'casual' | 'streetwear' | 'luxury' | 'formal' | 'traditional' | 'sportswear' | 'futuristic' | 'funny' | 'party';
  appearance: CharacterAppearance;
  description: string;
}

export type CharacterAnimationState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'sitting'
  | 'standing'
  | 'greeting'
  | 'wave'
  | 'holding_popcorn'
  | 'eating_popcorn'
  | 'holding_drink'
  | 'drinking'
  | 'interacting'
  | 'laughing'
  | 'celebrating';

export type SocialEmoteId =
  | 'wave'
  | 'laugh'
  | 'clap'
  | 'cheer'
  | 'thumbs_up'
  | 'heart'
  | 'fire'
  | 'shocked'
  | 'crying'
  | 'mind_blown'
  | 'salute'
  | 'dancing'
  | 'applause'
  | 'excited';

export type RefreshmentItemType =
  | 'none'
  | 'popcorn_butter'
  | 'popcorn_caramel'
  | 'popcorn_salted'
  | 'popcorn_cheese'
  | 'popcorn_large_bucket'
  | 'drink_cola'
  | 'drink_orange'
  | 'drink_lemon'
  | 'drink_water'
  | 'drink_blue_slush'
  | 'drink_iced_tea'
  | 'drink_sparkling';

export type CharacterGender = 'male' | 'female';

export type TheatreCameraMode =
  | 'third_person_follow'
  | 'first_person'
  | 'cinema_screen_view'
  | 'free_orbit';

export type GraphicsQualityPreset = 'low' | 'medium' | 'balanced' | 'high' | 'ultra';

export interface CharacterAppearance {
  gender?: CharacterGender;
  style: CharacterStyleId;
  hairStyle: CharacterHairId;
  outfit: CharacterOutfitId;
  primaryColor: string;
  secondaryColor: string;
  accessory: CharacterAccessoryId;
  displayName: string;
  skinTone?: string;
  hairColor?: string;
  hairHighlights?: string;
  facialHair?: FacialHairStyleId;
  facialHairColor?: string;
  eyeColor?: string;
  topColor?: string;
  pantsColor?: string;
  shoesColor?: string;
  hatColor?: string;
  accessoryColor?: string;
  headwear?: HeadwearId;
  upperBody?: UpperBodyId;
  lowerBody?: LowerBodyId;
  footwear?: FootwearId;
  funnyCosmetic?: FunnyCosmeticId;
  materialFinish?: MaterialFinishType;
  savedOutfitName?: string;
}

export type MediaSourceType =
  | 'direct_video'
  | 'hls_stream'
  | 'dash_stream'
  | 'local_file'
  | 'room_shared_file'
  | 'official_embed'
  | 'screen_share'
  | 'unsupported_webpage';

export interface StreamQualityLevel {
  id: string;
  label: string;
  height: number;
  width?: number;
  bitrate?: number;
  index?: number;
}

export interface MediaSourceConfig {
  id: string;
  url: string;
  title: string;
  sourceType: MediaSourceType;
  providerName: string;
  isAuthorized: boolean;
  supportsAutoSync: boolean;
  compatibilityMessage: string;
  manualCountdownFallbackOnly?: boolean;
  subtitleTrackLabel?: string;
  originalWidth?: number;
  originalHeight?: number;
  aspectRatio?: number;
  aspectRatioLabel?: string;
  durationSeconds?: number;
  fileSizeFormatted?: string;
  fileName?: string;
  mimeType?: string;
  qualityLevels?: StreamQualityLevel[];
  isLocalFile?: boolean;
  sharedStreamUrl?: string;
  thumbnailUrl?: string;
  frameRate?: number;
  description?: string;
  sourceResolution?: string | { width: number; height: number };
}

export interface RoomPlaybackState {
  mediaSource: MediaSourceConfig;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  lastSyncServerTimestampMs: number;
  revision: number;
  hostUid: string;
  coHostUids: string[];
  controlsLocked: boolean;
  subtitleTrack: string;
  manualCountdownStartedAtMs?: number | null;
  controlRequests: { uid: string; displayName: string; requestedAtMs: number }[];
  playbackSpeed?: number;
  pictureFitMode?: 'fit' | 'original' | 'fill';
  sourceResolution?: string | { width: number; height: number };
}

export type RoomMemberRole = 'host' | 'co_host' | 'member';

export interface RoomParticipantState {
  uid: string;
  displayName: string;
  role: RoomMemberRole;
  appearance: CharacterAppearance;
  position: { x: number; y: number; z: number };
  rotationY: number;
  animation: CharacterAnimationState;
  holdingItem: RefreshmentItemType;
  itemPortionsRemaining: number;
  seatIndex: number | null;
  activeEmote: SocialEmoteId | null;
  emoteExpiresAtMs: number | null;
  isMuted: boolean;
  isHostMuted: boolean;
  isSpeaking: boolean;
  voiceMode: 'off' | 'nearby' | 'room';
  isBuffering: boolean;
  isBot?: boolean;
  joinedAtMs: number;
  lastHeartbeatMs: number;
}

export interface RoomChatMessage {
  id: string;
  roomId: string;
  uid: string;
  displayName: string;
  avatarColor: string;
  text: string;
  isNearbyOnly: boolean;
  senderPosition: { x: number; y: number; z: number };
  reactions: Record<string, string[]>;
  createdAtMs: number;
}

export interface SocialCinemaRoom {
  roomId: string;
  roomName: string;
  roomMode?: 'bot_sandbox' | 'friends';
  hostUid: string;
  hostName: string;
  theme: TheatreThemeId;
  capacity: RoomCapacityOption;
  isPrivate: boolean;
  isLocked: boolean;
  chatRestricted: boolean;
  isClosed: boolean;
  inviteCode: string;
  inviteExpiresAtMs: number;
  inviteRevoked: boolean;
  playback: RoomPlaybackState;
  participants: Record<string, RoomParticipantState>;
  messages: RoomChatMessage[];
  createdAtMs: number;
  updatedAtMs: number;
}
