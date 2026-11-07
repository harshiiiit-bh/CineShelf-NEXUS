import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Users, Play, Pause, Volume2, VolumeX, Mic, MicOff, MessageSquare,
  Sparkles, Shield, Lock, Unlock, Copy, Check, RefreshCw, LogOut,
  Crown, Tv, AlertTriangle, ExternalLink, Smile, Armchair, Eye, EyeOff,
  Sliders, Compass, ChevronRight, ChevronLeft, Maximize2, Minimize2,
  UserPlus, Zap, Radio, Film, Globe, ArrowLeft, ArrowRight, Home,
  Search, ZoomIn, ZoomOut, ArrowUp, ArrowDown, RotateCcw, Smartphone,
  Settings, Hand, Footprints, CupSoda, Popcorn, UserCheck, X
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import {
  CharacterAccessoryId,
  CharacterAnimationState,
  CharacterAppearance,
  CharacterHairId,
  CharacterOutfitId,
  CharacterStyleId,
  GraphicsQualityPreset,
  MediaSourceConfig,
  RefreshmentItemType,
  RoomCapacityOption,
  RoomParticipantState,
  SocialCinemaRoom,
  SocialEmoteId,
  TheatreCameraMode,
  TheatreThemeId,
} from '../types/nexus';
import {
  CURATED_DIRECT_CINEMA_STREAMS,
  THEATRE_SEAT_LAYOUT,
  THEATRE_THEMES,
  computeAuthoritativePlaybackPosition,
  generateDefaultAppearanceForUid,
  getInteractiveZoneAtPosition,
  getNearestInteractableZone,
  mapJoystickVectorToCamera3D,
  resolveTheatreMovement,
  validateAndClassifyMediaSource,
} from '../utils/socialEngine';
import { VirtualJoystick } from './VirtualJoystick';
import { Character3DPreview } from './Character3DPreview';
import { NexusFilmPortalModal } from './NexusFilmPortalModal';
import { MediaDiagnosticsOverlay } from './MediaDiagnosticsOverlay';
import { MediaSettingsModal, ViewingModeId } from './MediaSettingsModal';
import { useLocalVideo } from '../hooks/useLocalVideo';
import { buildCharacterMeshGroup, animateCharacterFrame } from '../utils/characterMeshBuilder';
import {
  DEFAULT_SUBTITLE_STYLE,
  MediaDiagnosticsMetrics,
  SubtitleCue,
  SubtitleStyleConfig,
  SubtitleTrackInfo,
  convertSrtToVttUrl,
  parseSrtToCues,
} from '../utils/mediaEngine';
import Hls from 'hls.js';
import { apiFetch, apiWebSocketUrl, apiErrorMessage } from '../utils/api';

const EMOTE_LABELS: { id: SocialEmoteId; label: string; symbol: string }[] = [
  { id: 'wave', label: 'Wave', symbol: '👋' },
  { id: 'laugh', label: 'Laugh', symbol: '😂' },
  { id: 'applause', label: 'Applause', symbol: '👏' },
  { id: 'shocked', label: 'Shocked', symbol: '😱' },
  { id: 'heart', label: 'Love', symbol: '❤️' },
  { id: 'fire', label: 'Fire', symbol: '🔥' },
  { id: 'thumbs_up', label: 'Approve', symbol: '👍' },
  { id: 'cheer', label: 'Cheer', symbol: '🎉' },
  { id: 'crying', label: 'Tears', symbol: '🥹' },
  { id: 'mind_blown', label: 'Mind Blown', symbol: '🤯' },
  { id: 'salute', label: 'Salute', symbol: '🫡' },
  { id: 'dancing', label: 'Dance', symbol: '🕺' },
];

interface CinemaSettingsState {
  graphicsQuality: GraphicsQualityPreset;
  performanceMode: boolean;
  joystickSensitivity: number;
  cameraSensitivity: number;
  movementSensitivity: number;
  soundVolume: number;
  musicVolume: number;
  hudOpacity: number;
  cameraFov: number;
}

const DEFAULT_CINEMA_SETTINGS: CinemaSettingsState = {
  graphicsQuality: 'high',
  performanceMode: false,
  joystickSensitivity: 1.0,
  cameraSensitivity: 1.0,
  movementSensitivity: 1.0,
  soundVolume: 0.0,
  musicVolume: 0.5,
  hudOpacity: 0.9,
  cameraFov: 58,
};

interface BrowserBookmark {
  title: string;
  url: string;
  badge: string;
}

const BROWSER_BOOKMARKS: BrowserBookmark[] = [
  {
    title: 'Wikipedia Film Portal',
    url: 'https://en.m.wikipedia.org/wiki/Portal:Film',
    badge: 'Embed Ready',
  },
  {
    title: 'Wikipedia Sci-Fi Cinema',
    url: 'https://en.m.wikipedia.org/wiki/Science_fiction_film',
    badge: 'Embed Ready',
  },
  {
    title: 'Internet Archive Cinema',
    url: 'https://archive.org/details/feature_films',
    badge: 'Public Archive',
  },
  {
    title: 'TVmaze Show Guide',
    url: 'https://www.tvmaze.com/shows',
    badge: 'TV Catalog',
  },
];

function createOverheadLabelTexture(
  name: string,
  role: string,
  primaryColor: string,
  emoteSymbol?: string | null,
  isSpeaking?: boolean,
  holdingLabel?: string | null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pill background
  ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
  ctx.strokeStyle = isSpeaking ? '#10B981' : primaryColor;
  ctx.lineWidth = isSpeaking ? 5 : 3;
  ctx.beginPath();
  ctx.roundRect(16, 20, 480, 96, 28);
  ctx.fill();
  ctx.stroke();

  // Role badge
  const roleText =
    role === 'host' ? '★ HOST' : role === 'co_host' ? '◆ CO-HOST' : '● PATRON';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillStyle = role === 'host' ? '#F59E0B' : role === 'co_host' ? '#38BDF8' : '#94A3B8';
  ctx.fillText(roleText, 40, 54);

  if (holdingLabel) {
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FBBF24';
    ctx.fillText(holdingLabel, 240, 54);
  }

  // Display name
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#F8FAFC';
  const truncated = name.length > 18 ? name.slice(0, 17) + '…' : name;
  ctx.fillText(truncated, 40, 94);

  // Emote or speaking indicator on right
  if (emoteSymbol) {
    ctx.font = '46px sans-serif';
    ctx.fillText(emoteSymbol, 424, 88);
  } else if (isSpeaking) {
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('LIVE MIC', 376, 86);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createWallSignTexture(
  text: string,
  subtext: string,
  bgColor: string,
  borderColor: string,
  textColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 54px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 84);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(subtext, 256, 124);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface AvatarMeshBundle {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  popcornProp: THREE.Group;
  drinkProp: THREE.Group;
  labelSprite: THREE.Sprite;
  lastLabelSignature: string;
  lastAppearanceSignature?: string;
  targetPos: THREE.Vector3;
  targetRotY: number;
}

export function NexusSocialView() {
  const { account, addToast, setActiveSection, openFriendLoginModal } = useNexus();

  const notify = useCallback(
    (title: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      if (typeof addToast === 'function') {
        addToast(title, type === 'warning' ? 'info' : type);
      }
    },
    [addToast]
  );

  const bearerToken = useMemo(() => {
    if (!account) return '';
    return account.sessionToken || `sandbox-token:${account.uid}`;
  }, [account]);

  // Zero-latency local video file playback engine hook
  const {
    videoUrl: localVideoUrl,
    selectedFile: localVideoFile,
    metadata: localVideoMeta,
    selectFile: selectLocalVideoFile,
    clearFile: clearLocalVideoFile,
  } = useLocalVideo();

  // Persistent Settings & Customisation
  const [settings, setSettings] = useState<CinemaSettingsState>(() => {
    try {
      const raw = localStorage.getItem('nexus_cinema_settings_v2');
      if (raw) return { ...DEFAULT_CINEMA_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_CINEMA_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_cinema_settings_v2', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Character Appearance
  const [appearance, setAppearance] = useState<CharacterAppearance>(() =>
    generateDefaultAppearanceForUid(
      account?.uid || 'guest',
      account?.displayName || 'Cinephile'
    )
  );

  // Room & Lobby state
  const [room, setRoom] = useState<SocialCinemaRoom | null>(null);
  const [roomNameInput, setRoomNameInput] = useState(
    `${account?.displayName || 'Harshit'}'s Grand 3D Premiere`
  );
  const [selectedTheme, setSelectedTheme] = useState<TheatreThemeId>('classic_cinema');
  const [selectedCapacity, setSelectedCapacity] = useState<RoomCapacityOption>(35);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [lobbyTab, setLobbyTab] = useState<'join_or_create' | 'customize'>('join_or_create');
  const [isBusy, setIsBusy] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Landscape & Orientation state
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [bypassOrientationPrompt, setBypassOrientationPrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProjectionScreenFullscreen, setIsProjectionScreenFullscreen] = useState(false);

  // HUD & Collapsible Drawer / Modals state
  const [hudHidden, setHudHidden] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'participants' | 'chat' | 'interactions' | 'room'
  >('participants');
  const [selectedParticipantUid, setSelectedParticipantUid] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [mediaGatewayModalOpen, setMediaGatewayModalOpen] = useState(false);
  const [filmPortalModalOpen, setFilmPortalModalOpen] = useState(false);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [availableStreamQualities, setAvailableStreamQualities] = useState<
    { id: string; label: string; height: number; bitrate?: number; index?: number }[]
  >([]);
  const [currentStreamQuality, setCurrentStreamQuality] = useState<string>('auto');
  const hlsRef = useRef<Hls | null>(null);

  // In-App Browser state
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://en.m.wikipedia.org/wiki/Portal:Film');
  const [browserAddressInput, setBrowserAddressInput] = useState(
    'https://en.m.wikipedia.org/wiki/Portal:Film'
  );
  const [browserSearchInput, setBrowserSearchInput] = useState('');
  const [browserHistory, setBrowserHistory] = useState<string[]>([
    'https://en.m.wikipedia.org/wiki/Portal:Film',
  ]);
  const [browserHistoryIndex, setBrowserHistoryIndex] = useState(0);
  const [browserZoom, setBrowserZoom] = useState<number>(100);
  const [browserScrollOffset, setBrowserScrollOffset] = useState<number>(0);
  const [browserInspectState, setBrowserInspectState] = useState<{
    loading: boolean;
    canEmbed: boolean;
    reason: string;
    host: string;
  }>({
    loading: false,
    canEmbed: true,
    reason: 'Verified embeddable in NEXUS In-App Browser.',
    host: 'en.m.wikipedia.org',
  });
  const [iframeReloadKey, setIframeReloadKey] = useState(0);

  // Camera & Movement Controls state
  const [cameraMode, setCameraMode] = useState<TheatreCameraMode>('third_person_follow');
  const cameraModeRef = useRef(cameraMode);
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  const [isSprinting, setIsSprinting] = useState(false);
  const isSprintingRef = useRef(false);
  useEffect(() => {
    isSprintingRef.current = isSprinting;
  }, [isSprinting]);

  const [nearbyZone, setNearbyZone] = useState<{
    zone: 'popcorn_counter' | 'drinks_counter' | 'browser_kiosk' | 'exit_door' | 'seat' | 'none';
    seatLabel?: string;
    seatIndex?: number;
  }>({ zone: 'none' });

  // Virtual Joystick vector ref (updated by <VirtualJoystick /> component)
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right-Side Camera Drag state
  const cameraAnglesRef = useRef<{ yaw: number; pitch: number }>({
    yaw: 0,
    pitch: 0.28,
  });
  const cameraDragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    lastX: number;
    lastY: number;
  }>({ active: false, pointerId: -1, lastX: 0, lastY: 0 });

  // Jump & Vertical Physics refs
  const verticalPhysicsRef = useRef<{
    yOffset: number;
    vy: number;
    isJumping: boolean;
  }>({ yOffset: 0, vy: 0, isJumping: false });

  // Smooth horizontal velocity ref
  const velocityRef = useRef<{ vx: number; vz: number }>({ vx: 0, vz: 0 });

  // Chat & Media inputs
  const [chatInput, setChatInput] = useState('');
  const [nearbyChatOnly, setNearbyChatOnly] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState(CURATED_DIRECT_CINEMA_STREAMS[0].url);
  const [mediaTitleInput, setMediaTitleInput] = useState(CURATED_DIRECT_CINEMA_STREAMS[0].title);
  const [mediaValidationNotice, setMediaValidationNotice] = useState<{
    isAuthorized: boolean;
    message: string;
    externalUrl?: string;
  } | null>(null);

  // Voice & Audio state
  const [micEnabled, setMicEnabled] = useState(false);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [movieVolume, setMovieVolume] = useState(0.85);
  const [voiceVolume, setVoiceVolume] = useState(0.9);
  const [syncDriftMs, setSyncDriftMs] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  // Advanced Streaming Engine 2.0 State
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [mediaSettingsOpen, setMediaSettingsOpen] = useState(false);
  const [viewingMode, setViewingMode] = useState<ViewingModeId>('standard_theatre');
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleConfig>(DEFAULT_SUBTITLE_STYLE);
  const [customSubtitleCues, setCustomSubtitleCues] = useState<SubtitleCue[]>([]);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
  const [hoverSeekTimestamp, setHoverSeekTimestamp] = useState<string | null>(null);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [diagnosticsMetrics, setDiagnosticsMetrics] = useState<MediaDiagnosticsMetrics>({
    sourceFormat: 'Direct Video (.mp4)',
    codec: 'avc1.640028 (H.264 / AAC)',
    originalResolution: '1920×1080 (FHD)',
    selectedRendition: 'Auto (Original)',
    renderedResolution: '2048×1152',
    bufferSeconds: 12.4,
    droppedFrames: 0,
    totalFrames: 1420,
    estimatedBandwidthMbps: 8.5,
    networkState: 'optimal',
    errorCount: 0,
    lastError: null,
  });

  // Refs for Three.js & WebSocket & Video & Screen Capture Stream
  const mountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roomRef = useRef<SocialCinemaRoom | null>(null);
  roomRef.current = room;

  // Browser Tab Casting State
  const [isCastingActive, setIsCastingActive] = useState(false);
  const [castingTabLabel, setCastingTabLabel] = useState<string | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stopTabCasting = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCastingActive(false);
    setCastingTabLabel(null);
    notify('Browser tab casting ended.', 'info');
  }, [notify]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const micEnabledRef = useRef(micEnabled);
  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  const pushToTalkActiveRef = useRef(pushToTalkActive);
  useEffect(() => {
    pushToTalkActiveRef.current = pushToTalkActive;
  }, [pushToTalkActive]);

  const keysPressedRef = useRef<Set<string>>(new Set());
  const localPosRef = useRef<{ x: number; y: number; z: number; rotY: number }>({
    x: 0,
    y: 1.9,
    z: 10.2,
    rotY: Math.PI,
  });
  const lastMoveSentAtRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Check orientation & attempt landscape lock
  useEffect(() => {
    const checkViewportOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsPortraitMobile(h > w && w < 768);
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    checkViewportOrientation();
    window.addEventListener('resize', checkViewportOrientation);
    window.addEventListener('orientationchange', checkViewportOrientation);
    document.addEventListener('fullscreenchange', checkViewportOrientation);

    // Attempt gentle landscape orientation lock if browser supports it
    try {
      const orientationApi = screen.orientation as unknown as {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientationApi && typeof orientationApi.lock === 'function') {
        orientationApi.lock('landscape').catch(() => {
          // Silently ignore when browser requires fullscreen gesture first
        });
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('resize', checkViewportOrientation);
      window.removeEventListener('orientationchange', checkViewportOrientation);
      document.removeEventListener('fullscreenchange', checkViewportOrientation);
    };
  }, []);

  const requestLandscapeAndFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore
    }
    try {
      const orientationApi = screen.orientation as unknown as {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
      }
    } catch {
      // ignore
    }
    setBypassOrientationPrompt(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        const orientationApi = screen.orientation as unknown as {
          lock?: (mode: string) => Promise<void>;
        };
        if (orientationApi && typeof orientationApi.lock === 'function') {
          orientationApi.lock('landscape').catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Pre-fill invite code if URL contains ?roomInvite=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('roomInvite');
    if (code) {
      setJoinCodeInput(code.toUpperCase());
    }
  }, []);

  // Synthesize subtle spatial interaction sound effects using Web Audio API
  const playInteractionSfx = useCallback(
    (kind: 'popcorn' | 'drink' | 'eat' | 'sip' | 'seat' | 'emote' | 'jump') => {
      if (settings.soundVolume <= 0.01) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const vol = Math.min(0.25, 0.12 * settings.soundVolume);

        if (kind === 'popcorn' || kind === 'eat') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (kind === 'drink' || kind === 'sip') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (kind === 'jump') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(210, now);
          osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        }
      } catch {
        // Ignore audio context autoplay restrictions
      }
    },
    [settings.soundVolume]
  );

  // Inspect URL when In-App Browser navigates
  const navigateBrowserTo = useCallback(
    async (rawInput: string, pushHistory = true) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      let targetUrl = trimmed;
      // If it looks like a search phrase rather than a domain/URL, search Wikipedia
      if (!trimmed.includes('.') || trimmed.includes(' ')) {
        targetUrl = `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(trimmed)}`;
      } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        targetUrl = `https://${trimmed}`;
      }

      setBrowserUrl(targetUrl);
      setBrowserAddressInput(targetUrl);
      setBrowserScrollOffset(0);

      if (pushHistory) {
        setBrowserHistory((prev) => {
          const sliced = prev.slice(0, browserHistoryIndex + 1);
          return [...sliced, targetUrl];
        });
        setBrowserHistoryIndex((prev) => prev + 1);
      }

      setBrowserInspectState((prev) => ({
        ...prev,
        loading: true,
        reason: 'Inspecting website security headers...',
      }));

      try {
        const res = await apiFetch(
          `/api/social/browser/inspect?url=${encodeURIComponent(targetUrl)}`
        );
        const data = await res.json();
        setBrowserInspectState({
          loading: false,
          canEmbed: Boolean(data.canEmbed),
          reason: String(data.reason || ''),
          host: String(data.host || targetUrl),
        });
      } catch {
        setBrowserInspectState({
          loading: false,
          canEmbed: true,
          reason: 'Loaded in NEXUS Browser frame.',
          host: targetUrl,
        });
      }
    },
    [browserHistoryIndex]
  );

  // Perform authoritative room action via API
  const dispatchRoomAction = useCallback(
    async (payload: Record<string, unknown>) => {
      const activeRoom = roomRef.current;
      if (!activeRoom || !bearerToken) return null;
      try {
        const res = await apiFetch(`/api/social/rooms/${activeRoom.roomId}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearerToken}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          notify(data.error || 'Room action rejected.', 'warning');
          return null;
        }
        if (data.room) {
          setRoom(data.room);
        }
        return data;
      } catch {
        return null;
      }
    },
    [bearerToken, notify]
  );

  const startTabCasting = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      notify('Screen / Browser Tab capture API is not supported in this browser.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        } as any,
        audio: true,
      });

      screenStreamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      const label = track?.label || 'Captured Browser Tab';
      setIsCastingActive(true);
      setCastingTabLabel(label);

      const castConfig: MediaSourceConfig = {
        id: `cast-${Date.now()}`,
        url: 'stream:browser-tab',
        title: label,
        sourceType: 'screen_share',
        providerName: 'Live Browser Tab Casting',
        isAuthorized: true,
        supportsAutoSync: false,
        compatibilityMessage: 'Live Browser Tab Casting active on 3D Cinema Screen.',
      };

      dispatchRoomAction({
        type: 'playback',
        action: 'set_source',
        sourceUrl: 'stream:browser-tab',
        sourceTitle: label,
        sourceConfig: castConfig,
      });

      if (track) {
        track.onended = () => {
          stopTabCasting();
        };
      }

      notify(`Tab Casting active: "${label}". Projecting live onto 3D Cinema Screen!`, 'success');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        notify('Browser tab casting permission was cancelled.', 'info');
      } else {
        notify('Could not start tab capture: ' + (err.message || 'Unknown error'), 'error');
      }
    }
  }, [dispatchRoomAction, notify, stopTabCasting]);

  // Create a 3D cinema room ('bot_sandbox' for instant Guest/Solo AI Bot testing, or 'friends' for Friend Mode multiplayer)
  const executeCreateRoomRequest = async (
    requestedMode: 'bot_sandbox' | 'friends',
    activeAcc = account
  ) => {
    if (!activeAcc) return;
    const token = activeAcc.sessionToken || `sandbox-token:${activeAcc.uid}`;
    setIsBusy(true);
    try {
      const res = await apiFetch('/api/social/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomName:
            roomNameInput.trim() ||
            (requestedMode === 'bot_sandbox'
              ? `${activeAcc.displayName}'s AI Bot 3D Theatre`
              : `${activeAcc.displayName}'s 3D Cinema`),
          hostName: appearance.displayName || activeAcc.displayName,
          theme: selectedTheme,
          capacity: selectedCapacity,
          roomMode: requestedMode,
          appearance: {
            ...appearance,
            displayName: activeAcc.displayName || appearance.displayName,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'FRIEND_LOGIN_REQUIRED') {
          openFriendLoginModal(
            'Login with a display name or temporary login code to create a room with friends.',
            (upgradedAcc) => {
              executeCreateRoomRequest('friends', upgradedAcc);
            }
          );
          return;
        }
        notify(data.error || 'Could not create 3D cinema room.', 'error');
        return;
      }
      const created: SocialCinemaRoom = data.room;
      const myState = created.participants[activeAcc.uid];
      if (myState) {
        localPosRef.current = {
          x: myState.position.x,
          y: myState.position.y,
          z: myState.position.z,
          rotY: myState.rotationY,
        };
      }
      setRoom(created);

      // Check if user launched media from My Media panel
      try {
        const queuedRaw = sessionStorage.getItem('cineshelf_queued_media');
        if (queuedRaw) {
          sessionStorage.removeItem('cineshelf_queued_media');
          const queued = JSON.parse(queuedRaw);
          if (queued && queued.url) {
            setTimeout(() => {
              handleApplyMediaSourceConfig(queued);
            }, 400);
          }
        }
      } catch {
        // ignore
      }

      if (created.roomMode === 'bot_sandbox') {
        notify(
          'Entered 3D Theatre with AI Bots! Test movement, snacks, and playback freely — or click Invite Friends anytime.',
          'success'
        );
      } else {
        notify(`Created Friend 3D Cinema! Room Invite Code: ${created.inviteCode}`, 'success');
      }
    } catch (error) {
      notify(apiErrorMessage(error, 'Could not reach the multiplayer backend.'), 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!account) return;
    if (account.accessMode === 'guest') {
      openFriendLoginModal(
        'Creating a multiplayer room for friends requires Friend Mode login. Enter a display name to generate your Login ID & Code — or click "Explore with AI Bots" for instant Guest testing.',
        (upgradedAcc) => {
          executeCreateRoomRequest('friends', upgradedAcc);
        }
      );
      return;
    }
    await executeCreateRoomRequest('friends', account);
  };

  const handleCreateBotSandboxRoom = async () => {
    if (!account) return;
    await executeCreateRoomRequest('bot_sandbox', account);
  };

  // Upgrade an active AI Bot / Guest room in-place to a Friend Multiplayer room without resetting 3D state
  const executeUpgradeRoomToFriends = async (activeAcc = account, previousGuestUid?: string) => {
    const activeRoom = roomRef.current;
    if (!activeRoom || !activeAcc) return;
    const token = activeAcc.sessionToken || `sandbox-token:${activeAcc.uid}`;
    setIsBusy(true);
    try {
      const res = await apiFetch(`/api/social/rooms/${activeRoom.roomId}/upgrade-to-friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          previousGuestUid,
          displayName: activeAcc.displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not upgrade room to Friend Mode.', 'warning');
        return;
      }
      if (data.room) {
        setRoom(data.room);
        const shareUrl = `${window.location.origin}${window.location.pathname}?roomInvite=${data.room.inviteCode}`;
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2500);
        notify(
          `Upgraded to Friend Multiplayer Room! Copied Room Invite Code: ${data.room.inviteCode}`,
          'success'
        );
      }
    } catch (error) {
      notify(apiErrorMessage(error, 'Could not reach the multiplayer backend.'), 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleInviteFriendsInTheatre = async () => {
    if (!room || !account) return;
    if (account.accessMode === 'guest') {
      const prevGuestUid = account.uid;
      openFriendLoginModal(
        'Log in to invite friends to this 3D theatre. Your current seat, position, snacks, and movie playback will be preserved!',
        (upgradedAcc) => {
          executeUpgradeRoomToFriends(upgradedAcc, prevGuestUid);
        }
      );
      return;
    }
    if (room.roomMode === 'bot_sandbox') {
      await executeUpgradeRoomToFriends(account, account.uid);
      return;
    }
    handleCopyInvite();
  };

  // Join an existing room via Invitation Code (Friend Mode required)
  const executeJoinRoomRequest = async (cleanCode: string, activeAcc = account) => {
    if (!activeAcc) return;
    const token = activeAcc.sessionToken || `sandbox-token:${activeAcc.uid}`;
    setIsBusy(true);
    try {
      const res = await apiFetch('/api/social/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteCode: cleanCode,
          displayName: activeAcc.displayName || appearance.displayName,
          appearance: {
            ...appearance,
            displayName: activeAcc.displayName || appearance.displayName,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'FRIEND_LOGIN_REQUIRED') {
          openFriendLoginModal(
            "Joining a friend's multiplayer room requires Friend Mode login.",
            (upgradedAcc) => {
              executeJoinRoomRequest(cleanCode, upgradedAcc);
            }
          );
          return;
        }
        notify(data.error || 'Unable to join room.', 'error');
        return;
      }
      const joined: SocialCinemaRoom = data.room;
      const myState = joined.participants[activeAcc.uid];
      if (myState) {
        localPosRef.current = {
          x: myState.position.x,
          y: myState.position.y,
          z: myState.position.z,
          rotY: myState.rotationY,
        };
      }
      setRoom(joined);
      notify(`Joined ${joined.roomName}!`, 'success');
    } catch (error) {
      notify(apiErrorMessage(error, 'Could not reach the multiplayer backend.'), 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!account) return;
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      notify('Enter an 8–10 character room invitation code.', 'warning');
      return;
    }
    if (account.accessMode === 'guest') {
      openFriendLoginModal(
        `Log in with a display name or temporary login code to join room ${cleanCode} with friends.`,
        (upgradedAcc) => {
          executeJoinRoomRequest(cleanCode, upgradedAcc);
        }
      );
      return;
    }
    await executeJoinRoomRequest(cleanCode, account);
  };

  // Connect WebSocket for real-time state & movement synchronization
  useEffect(() => {
    if (!room?.roomId || !bearerToken) {
      setWsConnected(false);
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(apiWebSocketUrl('/ws/nexus-social'));
    } catch (error) {
      setWsConnected(false);
      notify(apiErrorMessage(error, 'The multiplayer backend is unavailable.'), 'error');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          roomId: room.roomId,
          token: bearerToken,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'room_snapshot' && msg.room) {
          setRoom(msg.room);
        } else if (msg.type === 'participant_updated' && msg.participant) {
          const p: RoomParticipantState = msg.participant;
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: {
                ...prev.participants,
                [p.uid]: p,
              },
            };
          });
        } else if (msg.type === 'chat_message' && msg.message) {
          setRoom((prev) => {
            if (!prev) return prev;
            const exists = prev.messages.some((m) => m.id === msg.message.id);
            if (exists) return prev;
            return {
              ...prev,
              messages: [...prev.messages, msg.message],
            };
          });
        } else if (msg.type === 'playback_updated' && msg.playback) {
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              playback: msg.playback,
            };
          });
        }
      } catch {
        // Ignore malformed WS packets
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    // Periodic heartbeat every 2.5 seconds for playback drift correction
    const heartbeatInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 2500);

    return () => {
      window.clearInterval(heartbeatInterval);
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [room?.roomId, bearerToken]);

  // Synchronise HTMLVideoElement with authoritative room.playback state (Direct MP4, Local File, Room Shared Stream, HLS)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room) return;

    const pb = room.playback;
    video.volume = Math.max(0, Math.min(1, movieVolume * settings.soundVolume));

    if (pb.mediaSource.sourceType === 'screen_share') {
      if (screenStreamRef.current && video.srcObject !== screenStreamRef.current) {
        video.srcObject = screenStreamRef.current;
        video.play().catch(() => {});
      }
      return;
    }

    if (video.srcObject) {
      video.srcObject = null;
    }

    const isDirectPlayable =
      pb.mediaSource.sourceType === 'direct_video' ||
      pb.mediaSource.sourceType === 'local_file' ||
      pb.mediaSource.sourceType === 'room_shared_file' ||
      pb.mediaSource.sourceType === 'hls_stream' ||
      pb.mediaSource.sourceType === 'dash_stream';

    if (isDirectPlayable && pb.mediaSource.isAuthorized) {
      const isHls =
        pb.mediaSource.sourceType === 'hls_stream' ||
        pb.mediaSource.url.includes('.m3u8');

      if (isHls) {
        if (Hls.isSupported()) {
          if (!hlsRef.current || hlsRef.current.url !== pb.mediaSource.url) {
            if (hlsRef.current) hlsRef.current.destroy();
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.attachMedia(video);
            hls.loadSource(pb.mediaSource.url);
            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
              const levels = data.levels.map((lvl, idx) => ({
                id: String(idx),
                label: `${lvl.height}p`,
                height: lvl.height,
                width: lvl.width,
                bitrate: lvl.bitrate,
              }));
              setAvailableStreamQualities(levels);
            });
            hlsRef.current = hls;
          }
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          if (video.src !== pb.mediaSource.url) {
            video.src = pb.mediaSource.url;
          }
        }
      } else {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
          setAvailableStreamQualities([]);
        }
        if (video.src !== pb.mediaSource.url) {
          video.src = pb.mediaSource.url;
        }
      }

      const desiredSpeed = pb.playbackSpeed || 1.0;
      const targetSeconds = computeAuthoritativePlaybackPosition(room, Date.now());
      const currentSeconds = video.currentTime || 0;
      const diff = targetSeconds - currentSeconds;
      const driftSeconds = Math.abs(diff);
      setSyncDriftMs(Math.round(driftSeconds * 1000));

      // Playback speed & drift alignment
      if (driftSeconds > 2.5 && video.readyState >= 1) {
        try {
          video.currentTime = targetSeconds;
        } catch {
          // Video metadata still loading
        }
        video.playbackRate = desiredSpeed;
      } else if (driftSeconds > 0.35 && video.readyState >= 1) {
        video.playbackRate = desiredSpeed * (diff > 0 ? 1.05 : 0.95);
      } else {
        video.playbackRate = desiredSpeed;
      }

      if (pb.isPlaying) {
        if (video.paused) {
          video.play().catch(() => {
            // Autoplay restrictions gracefully handled
          });
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    } else {
      setSyncDriftMs(0);
      if (!video.paused) {
        video.pause();
      }
    }
  }, [room, movieVolume, settings.soundVolume]);

  // Keyboard Shortcuts for Video Player (Space, Left/Right, Up/Down, F, M, D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: do not trigger player shortcuts when typing in chat/inputs
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const myP = account && room ? room.participants[account.uid] : undefined;
      const canControl = myP?.role === 'host' || myP?.role === 'co_host' || !room?.playback.controlsLocked;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (canControl && room) {
          dispatchRoomAction({
            type: 'playback',
            action: room.playback.isPlaying ? 'pause' : 'play',
            positionSeconds: room.playback.positionSeconds,
          });
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canControl && room) {
          const newPos = Math.max(0, room.playback.positionSeconds - 10);
          dispatchRoomAction({ type: 'playback', action: 'seek', positionSeconds: newPos });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canControl && room) {
          const newPos = Math.min(room.playback.durationSeconds || 9999, room.playback.positionSeconds + 10);
          dispatchRoomAction({ type: 'playback', action: 'seek', positionSeconds: newPos });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMovieVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMovieVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMovieVolume((v) => (v > 0 ? 0 : 0.85));
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setDiagnosticsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [account, room, toggleFullscreen, dispatchRoomAction]);

  // Subtitle Cues & Diagnostics Metrics Monitor
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      // 1. Update Buffered Percent & Metrics
      if (video.buffered && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        const dur = video.duration || 1;
        setBufferedPercent(Math.min(100, (end / dur) * 100));

        const bufLen = Math.max(0, end - video.currentTime);
        const quality = (video as any).getVideoPlaybackQuality
          ? (video as any).getVideoPlaybackQuality()
          : { droppedVideoFrames: 0, totalVideoFrames: 0 };

        const formattedSourceRes = room?.playback.sourceResolution
          ? typeof room.playback.sourceResolution === 'string'
            ? room.playback.sourceResolution
            : `${room.playback.sourceResolution.width}×${room.playback.sourceResolution.height}`
          : video.videoWidth > 0 && video.videoHeight > 0
          ? `${video.videoWidth}×${video.videoHeight}`
          : '1080p';

        const resLabel =
          video.videoWidth > 0 && video.videoHeight > 0
            ? `${video.videoWidth}×${video.videoHeight}`
            : '2048×1152';

        setDiagnosticsMetrics((prev) => ({
          ...prev,
          sourceFormat: room?.playback.mediaSource.sourceType.toUpperCase() || 'DIRECT VIDEO',
          originalResolution: formattedSourceRes,
          renderedResolution: resLabel,
          bufferSeconds: bufLen,
          droppedFrames: quality.droppedVideoFrames || 0,
          totalFrames: quality.totalVideoFrames || 0,
          networkState: video.seeking || video.readyState < 3 ? 'buffering' : 'optimal',
        }));
      }

      // 2. Active Subtitle Cue Sync
      if (subtitleStyle.activeTrackId !== 'off' && customSubtitleCues.length > 0) {
        const t = video.currentTime + subtitleStyle.offsetSeconds;
        const matchingCue = customSubtitleCues.find(
          (c) => t >= c.startTimeSeconds && t <= c.endTimeSeconds
        );
        setActiveSubtitleText(matchingCue ? matchingCue.text : null);
      } else {
        setActiveSubtitleText(null);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [room, subtitleStyle, customSubtitleCues]);

  // Trigger vertical jump action
  const handleJumpAction = useCallback(() => {
    if (!roomRef.current || !account) return;
    const phys = verticalPhysicsRef.current;
    if (phys.isJumping) return;

    // If seated, stand up first
    const me = roomRef.current.participants[account.uid];
    if (me?.seatIndex !== null && me?.seatIndex !== undefined) {
      dispatchRoomAction({ type: 'seat' });
    }

    phys.isJumping = true;
    phys.vy = 5.4; // Initial upward velocity (m/s)
    playInteractionSfx('jump');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'move',
          x: localPosRef.current.x,
          y: localPosRef.current.y + 0.85,
          z: localPosRef.current.z,
          rotationY: localPosRef.current.rotY,
          animation: 'jumping',
        })
      );
    } else {
      dispatchRoomAction({
        type: 'move',
        x: localPosRef.current.x,
        y: localPosRef.current.y + 0.85,
        z: localPosRef.current.z,
        rotationY: localPosRef.current.rotY,
        animation: 'jumping',
      });
    }
  }, [account, dispatchRoomAction, playInteractionSfx]);

  // Reset camera directly behind player facing their heading (or toward the cinema screen)
  const handleResetCamera = useCallback(() => {
    cameraAnglesRef.current = { yaw: 0, pitch: 0.28 };
    setCameraMode('third_person_follow');
  }, []);

  // Context-sensitive Interact button handler
  const handleContextInteract = useCallback(async () => {
    if (!roomRef.current || !account) return;
    const pos = localPosRef.current;
    const zoneType = getNearestInteractableZone({ x: pos.x, z: pos.z });

    if (zoneType === 'browser_kiosk') {
      setBrowserOpen(true);
      playInteractionSfx('emote');
      notify('Opened NEXUS In-App Browser Kiosk.', 'info');
      return;
    }

    if (zoneType === 'exit_door') {
      await dispatchRoomAction({ type: 'leave' });
      setRoom(null);
      setActiveSection('dashboard');
      return;
    }

    if (zoneType === 'popcorn_counter') {
      playInteractionSfx('popcorn');
      await dispatchRoomAction({
        type: 'refreshment',
        action: 'pickup_popcorn',
        itemVariant: 'popcorn_butter',
      });
      notify('Picked up fresh Butter Popcorn!', 'success');
      return;
    }

    if (zoneType === 'drink_counter') {
      playInteractionSfx('drink');
      await dispatchRoomAction({
        type: 'refreshment',
        action: 'pickup_drink',
        itemVariant: 'drink_cola',
      });
      notify('Picked up an icy Cola Cup!', 'success');
      return;
    }

    const detailed = getInteractiveZoneAtPosition(pos.x, pos.z);
    if (detailed.zone === 'seat' && detailed.nearestSeat) {
      playInteractionSfx('seat');
      await dispatchRoomAction({
        type: 'seat',
        seatIndex: detailed.nearestSeat.seatIndex,
      });
      return;
    }

    // Default fallback when not inside a specific counter/kiosk zone:
    // If holding a snack, consume a portion; otherwise toggle nearest seat
    const me = roomRef.current.participants[account.uid];
    if (me?.holdingItem.startsWith('popcorn_')) {
      playInteractionSfx('eat');
      await dispatchRoomAction({ type: 'refreshment', action: 'eat_popcorn' });
      return;
    }
    if (me?.holdingItem.startsWith('drink_')) {
      playInteractionSfx('sip');
      await dispatchRoomAction({ type: 'refreshment', action: 'drink_beverage' });
      return;
    }

    playInteractionSfx('seat');
    await dispatchRoomAction({ type: 'seat' });
  }, [account, dispatchRoomAction, notify, playInteractionSfx, setActiveSection]);

  // Keyboard Listeners (WASD / Arrows / Space Jump / Shift Sprint / E Interact / F Sit / G Wave / C Camera)
  useEffect(() => {
    if (!room) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      keysPressedRef.current.add(key);

      if (e.key === 'Shift') {
        setIsSprinting(true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleJumpAction();
      } else if (key === 'v') {
        setPushToTalkActive(true);
      } else if (key === 'e') {
        handleContextInteract();
      } else if (key === 'f') {
        playInteractionSfx('seat');
        dispatchRoomAction({ type: 'seat' });
      } else if (key === 'g') {
        playInteractionSfx('emote');
        dispatchRoomAction({ type: 'emote', emote: 'wave' });
      } else if (key === 'c') {
        setCameraMode((prev) =>
          prev === 'third_person_follow'
            ? 'cinema_screen_view'
            : prev === 'cinema_screen_view'
            ? 'free_orbit'
            : 'third_person_follow'
        );
      } else if (key === 'h') {
        setHudHidden((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(key);
      if (e.key === 'Shift') {
        setIsSprinting(false);
      } else if (key === 'v') {
        setPushToTalkActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [room, dispatchRoomAction, handleContextInteract, handleJumpAction, playInteractionSfx]);

  // ============================================================================
  // THREE.JS 3D CINEMA SCENE, ARCHITECTURAL LOBBY, STADIUM SEATING & AVATARS
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    const videoEl = videoRef.current;
    if (!container || !room || !account) return;

    const themeSpec = THEATRE_THEMES[room.theme] || THEATRE_THEMES.classic_cinema;
    const effectiveQuality: GraphicsQualityPreset = settings.performanceMode
      ? 'low'
      : settings.graphicsQuality;

    // 1. Scene, Fog & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeSpec.fogHex);
    scene.fog = new THREE.FogExp2(themeSpec.fogHex, 0.016);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(settings.cameraFov, width / height, 0.1, 130);
    camera.position.set(0, 5.2, 15.2);

    // 2. WebGLRenderer configured per quality preset
    const renderer = new THREE.WebGLRenderer({
      antialias: effectiveQuality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    const maxDpr =
      effectiveQuality === 'ultra'
        ? Math.min(window.devicePixelRatio, 2.0)
        : effectiveQuality === 'high'
        ? Math.min(window.devicePixelRatio, 1.5)
        : effectiveQuality === 'medium'
        ? 1.2
        : 1.0;
    renderer.setPixelRatio(maxDpr);
    renderer.shadowMap.enabled = effectiveQuality === 'high' || effectiveQuality === 'ultra';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Theatre Lighting System
    const ambientLight = new THREE.AmbientLight(themeSpec.ambientHex, 2.0);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, themeSpec.ambientHex, 0.9);
    hemiLight.position.set(0, 14, 0);
    scene.add(hemiLight);

    const screenBounceLight = new THREE.PointLight(0x60a5fa, 3.0, 34, 1.35);
    screenBounceLight.position.set(0, 5.0, -10.0);
    scene.add(screenBounceLight);

    const lobbySpotLight = new THREE.SpotLight(0xfbbf24, 2.8, 28, Math.PI / 3, 0.5, 1);
    lobbySpotLight.position.set(0, 9.8, 12.6);
    if (effectiveQuality === 'high' || effectiveQuality === 'ultra') {
      lobbySpotLight.castShadow = true;
    }
    scene.add(lobbySpotLight);

    // 4. Auditorium Floor, Stadium Risers, Acoustic Walls & Ceiling
    const floorMat = new THREE.MeshStandardMaterial({
      color: themeSpec.floorColor,
      roughness: 0.85,
      metalness: 0.1,
    });
    const mainFloor = new THREE.Mesh(new THREE.PlaneGeometry(29, 31), floorMat);
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.receiveShadow = true;
    scene.add(mainFloor);

    // Stadium Tier Risers (Rows A, B, C, D + Rear Concession Concourse)
    const riserMat = new THREE.MeshStandardMaterial({
      color: themeSpec.wallColor,
      roughness: 0.78,
    });
    const tierSpecs = [
      { zCenter: -4.2, depth: 3.4, height: 0.35 },
      { zCenter: -0.8, depth: 3.4, height: 0.85 },
      { zCenter: 2.6, depth: 3.4, height: 1.35 },
      { zCenter: 6.0, depth: 3.4, height: 1.85 },
      { zCenter: 11.6, depth: 7.8, height: 1.9 },
    ];
    for (const t of tierSpecs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(27.6, t.height, t.depth),
        riserMat
      );
      mesh.position.set(0, t.height / 2, t.zCenter);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Glowing LED Aisle Strips along Left, Center-Left, Center-Right, and Right aisles flush with each step tier
    const aisleStripMat = new THREE.MeshBasicMaterial({
      color: themeSpec.aisleGlowColor,
    });
    for (const xStrip of [-9.4, -3.3, 3.3, 9.4]) {
      for (const t of tierSpecs) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.02, t.depth - 0.2),
          aisleStripMat
        );
        strip.position.set(xStrip, t.height + 0.01, t.zCenter);
        scene.add(strip);
      }
    }

    // Left, Right, Front, and Rear Walls + Acoustic Baffling Panels
    const wallMat = new THREE.MeshStandardMaterial({
      color: themeSpec.wallColor,
      roughness: 0.88,
    });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 31), wallMat);
    leftWall.position.set(-14.0, 6.5, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 31), wallMat);
    rightWall.position.set(14.0, 6.5, 0);
    scene.add(rightWall);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(28.6, 13, 0.6), wallMat);
    backWall.position.set(0, 6.5, 15.3);
    scene.add(backWall);

    // Ceiling & Recessed Downlights + Projection Booth Window
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#070A12',
      roughness: 0.95,
    });
    const ceilingMesh = new THREE.Mesh(new THREE.BoxGeometry(28.6, 0.5, 31), ceilingMat);
    ceilingMesh.position.set(0, 12.8, 0);
    scene.add(ceilingMesh);

    const ceilingLightMat = new THREE.MeshBasicMaterial({
      color: themeSpec.ceilingLightColor,
    });
    for (const zPos of [-6, 0, 6, 12]) {
      for (const xPos of [-8, 0, 8]) {
        const fixture = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
          ceilingLightMat
        );
        fixture.position.set(xPos, 12.52, zPos);
        scene.add(fixture);
      }
    }

    // Projection Booth Window & Volumetric Light Cone on Rear Wall Ceiling
    const projectorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.2),
      new THREE.MeshBasicMaterial({ color: '#93C5FD' })
    );
    projectorWindow.position.set(0, 10.6, 14.95);
    scene.add(projectorWindow);

    const beamGeo = new THREE.ConeGeometry(5.5, 25, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const projectionBeam = new THREE.Mesh(beamGeo, beamMat);
    projectionBeam.rotation.x = Math.PI / 2;
    projectionBeam.position.set(0, 8.2, 2.0);
    scene.add(projectionBeam);

    // Wall Sconces along Left and Right Auditorium Walls
    const sconceMat = new THREE.MeshBasicMaterial({ color: themeSpec.sconceLightColor });
    const sconceFrameMat = new THREE.MeshStandardMaterial({
      color: themeSpec.trimMetalColor,
      metalness: 0.7,
      roughness: 0.3,
    });
    for (const zPos of [-7.5, -2.5, 2.5, 7.5, 12.0]) {
      for (const side of [-1, 1]) {
        const sconceGroup = new THREE.Group();
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.44), sconceFrameMat);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.28), sconceMat);
        sconceGroup.add(plate, bulb);
        sconceGroup.position.set(side * 13.62, 5.4, zPos);
        scene.add(sconceGroup);
      }
    }

    // 5. Giant Front Widescreen Cinema Screen & Raised Stage
    const stageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(24, 1.15, 3.6),
      new THREE.MeshStandardMaterial({ color: '#080C15', roughness: 0.6 })
    );
    stageMesh.position.set(0, 0.575, -12.4);
    scene.add(stageMesh);

    const screenBezel = new THREE.Mesh(
      new THREE.BoxGeometry(20.0, 11.6, 0.45),
      new THREE.MeshStandardMaterial({
        color: themeSpec.trimMetalColor,
        metalness: 0.65,
        roughness: 0.35,
      })
    );
    screenBezel.position.set(0, 6.2, -13.3);
    scene.add(screenBezel);

    // Screen Texture: High-Resolution 2048x1152 CanvasTexture that projects live HTML5 video frames
    // preserving native aspect ratio (Fit vs Fill) and a crystal-clear widescreen cinema showcase when paused
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 2048;
    screenCanvas.height = 1152;
    const screenCtx = screenCanvas.getContext('2d')!;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const drawCinemaScreenFrame = () => {
      const currentRoom = roomRef.current || room;
      const pb = currentRoom.playback;

      const hasVideoSource = Boolean(videoEl && (videoEl.src || videoEl.srcObject));

      // 1. If video source exists and metadata/frames are available, project real video frames (playing OR paused)
      if (videoEl && hasVideoSource && (videoEl.readyState >= 1 || videoEl.videoWidth > 0)) {
        try {
          const vw = videoEl.videoWidth || 1920;
          const vh = videoEl.videoHeight || 1080;
          const fitMode = pb.pictureFitMode || 'fit';

          screenCtx.fillStyle = '#02040a';
          screenCtx.fillRect(0, 0, 2048, 1152);

          if (fitMode === 'fill') {
            screenCtx.drawImage(videoEl, 0, 0, 2048, 1152);
          } else {
            // Fit mode: preserve original video aspect ratio without stretching
            const videoAR = vw / vh;
            const canvasAR = 2048 / 1152;
            let drawW = 2048;
            let drawH = 1152;
            let drawX = 0;
            let drawY = 0;

            if (videoAR > canvasAR) {
              // Wider than 16:9 (e.g. 2.39:1 Cinemascope)
              drawW = 2048;
              drawH = Math.round(2048 / videoAR);
              drawY = Math.round((1152 - drawH) / 2);
            } else {
              // Taller than 16:9 (e.g. 4:3 Academy)
              drawH = 1152;
              drawW = Math.round(1152 * videoAR);
              drawX = Math.round((2048 - drawW) / 2);
            }

            screenCtx.drawImage(videoEl, drawX, drawY, drawW, drawH);
          }

          screenTexture.needsUpdate = true;
          return;
        } catch {
          // Fall through to clean standby if drawImage failed
        }
      }

      // 2. Clean Standby Projection Screen (No fake equalizers, no text printed over screen)
      screenCtx.fillStyle = '#030712';
      screenCtx.fillRect(0, 0, 2048, 1152);

      // Subtle bezel frame
      screenCtx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      screenCtx.lineWidth = 4;
      screenCtx.strokeRect(32, 32, 1984, 1088);

      if (hasVideoSource) {
        // Source assigned, loading metadata
        screenCtx.fillStyle = '#38BDF8';
        screenCtx.font = 'bold 42px "Space Grotesk", sans-serif';
        screenCtx.textAlign = 'center';
        screenCtx.fillText('LOADING VIDEO SOURCE...', 1024, 560);

        screenCtx.fillStyle = '#94A3B8';
        screenCtx.font = '24px "Plus Jakarta Sans", sans-serif';
        screenCtx.fillText(pb.mediaSource.title || 'Connecting to stream...', 1024, 620);
        screenCtx.textAlign = 'left';
      } else {
        // No source selected
        screenCtx.fillStyle = '#F8FAFC';
        screenCtx.font = 'bold 52px "Space Grotesk", sans-serif';
        screenCtx.textAlign = 'center';
        screenCtx.fillText('CINESHELF NEXUS 3D THEATRE', 1024, 540);

        screenCtx.fillStyle = '#64748B';
        screenCtx.font = '26px "Plus Jakarta Sans", sans-serif';
        screenCtx.fillText('Open Film Portal or My Media to select a movie', 1024, 610);
        screenCtx.textAlign = 'left';
      }

      screenTexture.needsUpdate = true;
    };

    drawCinemaScreenFrame();

    const screenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(19.2, 10.8),
      new THREE.MeshBasicMaterial({ map: screenTexture })
    );
    screenPlane.position.set(0, 6.2, -13.02);
    scene.add(screenPlane);

    // 6. 36 Stadium Seats (Rows A, B, C, D)
    const seatCushionMat = new THREE.MeshStandardMaterial({
      color: themeSpec.seatFabricColor,
      roughness: 0.62,
    });
    const seatFrameMat = new THREE.MeshStandardMaterial({
      color: themeSpec.seatFrameColor,
      roughness: 0.45,
      metalness: 0.35,
    });
    const seatPlateMat = new THREE.MeshStandardMaterial({
      color: '#D97706',
      metalness: 0.8,
      roughness: 0.2,
    });

    for (const s of THEATRE_SEAT_LAYOUT) {
      const seatGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.85), seatCushionMat);
      base.position.set(0, 0.21, 0);

      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 0.22), seatCushionMat);
      backrest.position.set(0, 0.62, 0.33);
      backrest.rotation.x = 0.1;

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.32, 0.24), seatCushionMat);
      headrest.position.set(0, 1.12, 0.36);

      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.78), seatFrameMat);
      leftArm.position.set(-0.48, 0.38, 0.04);

      const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.78), seatFrameMat);
      rightArm.position.set(0.48, 0.38, 0.04);

      const cupHolder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12),
        seatFrameMat
      );
      cupHolder.position.set(0.48, 0.52, -0.22);

      const numberPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), seatPlateMat);
      numberPlate.position.set(0, 0.98, -0.38);

      seatGroup.add(base, backrest, headrest, leftArm, rightArm, cupHolder, numberPlate);
      seatGroup.position.set(s.x, s.y, s.z);
      scene.add(seatGroup);
    }

    // 7. Architectural ENTRANCE (Rear-Left) & EXIT (Rear-Right) Doors with Illuminated Signs
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      metalness: 0.5,
      roughness: 0.4,
    });
    const doorTrimMat = new THREE.MeshStandardMaterial({
      color: themeSpec.trimMetalColor,
      metalness: 0.75,
      roughness: 0.25,
    });

    // Rear-Left ENTRANCE Doors (x = -11.4, z = 14.9)
    const entranceGroup = new THREE.Group();
    const entranceFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.8, 0.28), doorTrimMat);
    entranceFrame.position.set(0, 1.9, 0);
    const entranceDoors = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.5, 0.34), doorLeafMat);
    entranceDoors.position.set(0, 1.75, 0);
    const entranceSignTex = createWallSignTexture(
      'ENTRANCE',
      'LOBBY FOYER ACCESS',
      '#064E3B',
      '#10B981',
      '#6EE7B7'
    );
    const entranceSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.7),
      new THREE.MeshBasicMaterial({ map: entranceSignTex })
    );
    entranceSign.position.set(0, 4.35, -0.18);
    entranceSign.rotation.y = Math.PI;
    entranceGroup.add(entranceFrame, entranceDoors, entranceSign);
    entranceGroup.position.set(-11.4, 1.9, 14.95);
    scene.add(entranceGroup);

    // Rear-Right EXIT Doors (x = 11.4, z = 14.9)
    const exitGroup = new THREE.Group();
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.8, 0.28), doorTrimMat);
    exitFrame.position.set(0, 1.9, 0);
    const exitDoors = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.5, 0.34), doorLeafMat);
    exitDoors.position.set(0, 1.75, 0);
    const exitSignTex = createWallSignTexture(
      'EXIT',
      'PRESS INTERACT TO LEAVE',
      '#7F1D1D',
      '#EF4444',
      '#FCA5A5'
    );
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.7),
      new THREE.MeshBasicMaterial({ map: exitSignTex })
    );
    exitSign.position.set(0, 4.35, -0.18);
    exitSign.rotation.y = Math.PI;
    exitGroup.add(exitFrame, exitDoors, exitSign);
    exitGroup.position.set(11.4, 1.9, 14.95);
    scene.add(exitGroup);

    // 8. Rear Concession Lobby: Popcorn Counter (Left), Cold-Drinks Counter (Right), and Browser Kiosk (Center)
    // Left Popcorn Counter
    const popcornCounterGroup = new THREE.Group();
    const counterBodyMat = new THREE.MeshStandardMaterial({
      color: '#451A03',
      roughness: 0.45,
      metalness: 0.25,
    });
    const counterTopMat = new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      roughness: 0.28,
      metalness: 0.6,
    });
    const leftBase = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.25, 2.2), counterBodyMat);
    leftBase.position.set(0, 0.625, 0);
    const leftTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 2.4), counterTopMat);
    leftTop.position.set(0, 1.32, 0);

    const glassCase = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.15, 1.3),
      new THREE.MeshStandardMaterial({
        color: '#FDE68A',
        transparent: true,
        opacity: 0.42,
      })
    );
    glassCase.position.set(-1.1, 1.95, 0);

    const popcornPile = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.45, 1.05),
      new THREE.MeshStandardMaterial({ color: '#FBBF24', roughness: 0.9 })
    );
    popcornPile.position.set(-1.1, 1.6, 0);

    const popcornSignTex = createWallSignTexture(
      'POPCORN BAR',
      'FRESH BUTTER & CARAMEL',
      '#451A03',
      '#F59E0B',
      '#FDE68A'
    );
    const popcornSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.1),
      new THREE.MeshBasicMaterial({ map: popcornSignTex })
    );
    popcornSign.position.set(0, 3.8, 0.9);
    popcornSign.rotation.y = Math.PI;

    popcornCounterGroup.add(leftBase, leftTop, glassCase, popcornPile, popcornSign);
    popcornCounterGroup.position.set(-6.8, 1.9, 13.4);
    scene.add(popcornCounterGroup);

    // Right Cold-Drinks Counter
    const drinksCounterGroup = new THREE.Group();
    const rightBase = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 1.25, 2.2),
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.4 })
    );
    rightBase.position.set(0, 0.625, 0);
    const rightTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.14, 2.4),
      new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.25, metalness: 0.6 })
    );
    rightTop.position.set(0, 1.32, 0);

    const dispenserColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
    dispenserColors.forEach((col, i) => {
      const disp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.95, 16),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.25 })
      );
      disp.position.set(-1.6 + i * 1.05, 1.85, 0);
      drinksCounterGroup.add(disp);
    });

    const drinksSignTex = createWallSignTexture(
      'COLD DRINKS',
      'COLA · SLUSH · ICED TEA',
      '#0C4A6E',
      '#38BDF8',
      '#BAE6FD'
    );
    const drinksSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.1),
      new THREE.MeshBasicMaterial({ map: drinksSignTex })
    );
    drinksSign.position.set(0, 3.8, 0.9);
    drinksSign.rotation.y = Math.PI;

    drinksCounterGroup.add(rightBase, rightTop, drinksSign);
    drinksCounterGroup.position.set(6.8, 1.9, 13.4);
    scene.add(drinksCounterGroup);

    // Center Rear Interactive Web Browser Kiosk (x = 0, z = 13.5)
    const browserKioskGroup = new THREE.Group();
    const kioskPedestal = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.35, 0.9),
      new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.6, roughness: 0.35 })
    );
    kioskPedestal.position.set(0, 0.675, 0);
    const kioskScreenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.3, 0.16),
      new THREE.MeshStandardMaterial({ color: '#3B82F6', metalness: 0.7, roughness: 0.25 })
    );
    kioskScreenFrame.position.set(0, 1.95, 0);
    const kioskTex = createWallSignTexture(
      'WEB BROWSER',
      'INTERACT TO BROWSE SITES',
      '#0F172A',
      '#60A5FA',
      '#93C5FD'
    );
    const kioskDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.92, 1.12),
      new THREE.MeshBasicMaterial({ map: kioskTex })
    );
    kioskDisplay.position.set(0, 1.95, -0.09);
    kioskDisplay.rotation.y = Math.PI;
    browserKioskGroup.add(kioskPedestal, kioskScreenFrame, kioskDisplay);
    browserKioskGroup.position.set(-2.2, 1.9, 14.3);
    scene.add(browserKioskGroup);

    // 9. Multi-Participant 3D Avatar Factory & Registry
    const avatarsMap = new Map<string, AvatarMeshBundle>();

    const buildAvatarBundle = (p: RoomParticipantState): AvatarMeshBundle => {
      const meshBundle = buildCharacterMeshGroup(p.appearance, p.uid);
      const { group, bodyMesh, headGroup, leftArm, rightArm, leftLeg, rightLeg, popcornProp, drinkProp } = meshBundle;

      // Overhead Name & Status Sprite
      const labelTex = createOverheadLabelTexture(
        p.displayName,
        p.role,
        p.appearance.primaryColor,
        null,
        p.isSpeaking,
        null
      );
      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
      );
      labelSprite.scale.set(1.22, 0.34, 1);
      labelSprite.position.set(0, 2.22, 0);
      group.add(labelSprite);

      group.position.set(p.position.x, p.position.y, p.position.z);
      group.rotation.y = p.rotationY;

      scene.add(group);

      return {
        group,
        bodyMesh,
        headGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        popcornProp,
        drinkProp,
        labelSprite,
        lastLabelSignature: `${p.displayName}_${p.role}_${p.isSpeaking}`,
        lastAppearanceSignature: JSON.stringify(p.appearance),
        targetPos: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
        targetRotY: p.rotationY,
      };
    };

    // Raycaster so clicking/tapping a 3D player opens their info in the side drawer
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const handleCanvasClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const avatarRoots = Array.from(avatarsMap.values()).map((b) => b.group);
      const hits = raycaster.intersectObjects(avatarRoots, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.participantUid) {
          obj = obj.parent;
        }
        if (obj?.userData?.participantUid) {
          setSelectedParticipantUid(obj.userData.participantUid);
          setActiveDrawerTab('participants');
          setSideDrawerOpen(true);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    let animFrameId = 0;
    let lastPerfMs = performance.now();
    const startPerfMs = lastPerfMs;
    let lastScreenRedrawMs = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const nowPerfMs = performance.now();
      const dt = Math.min(0.1, (nowPerfMs - lastPerfMs) / 1000);
      lastPerfMs = nowPerfMs;
      const elapsed = (nowPerfMs - startPerfMs) / 1000;
      const activeRoom = roomRef.current;
      if (!activeRoom) return;

      // Refresh widescreen canvas projection at ~15fps (or every frame if live video is playing)
      if (nowPerfMs - lastScreenRedrawMs > 65) {
        lastScreenRedrawMs = nowPerfMs;
        drawCinemaScreenFrame();
      }

      // Subtle projection light pulse
      screenBounceLight.intensity = 2.7 + Math.sin(elapsed * 3.1) * 0.35;

      // 1. Process Local Player Movement (Keyboard WASD + Analog 360° Virtual Joystick + Sprint + Jump Physics)
      const keys = keysPressedRef.current;
      const joy = joystickVectorRef.current;

      // Camera rotation via Q/E keys on desktop
      if (keys.has('q')) {
        cameraAnglesRef.current.yaw += 1.8 * dt * settings.cameraSensitivity;
      }
      if (keys.has('r')) {
        cameraAnglesRef.current.yaw -= 1.8 * dt * settings.cameraSensitivity;
      }

      let rawInputX = joy.x;
      let rawInputZ = joy.y;

      if (keys.has('w') || keys.has('arrowup')) rawInputZ -= 1;
      if (keys.has('s') || keys.has('arrowdown')) rawInputZ += 1;
      if (keys.has('a') || keys.has('arrowleft')) rawInputX -= 1;
      if (keys.has('d') || keys.has('arrowright')) rawInputX += 1;

      // Transform movement vector relative to current camera horizontal yaw
      const camYaw = cameraAnglesRef.current.yaw;
      const mappedMove = mapJoystickVectorToCamera3D(
        rawInputX,
        rawInputZ,
        camYaw,
        settings.joystickSensitivity
      );
      const worldDirX = mappedMove.worldX;
      const worldDirZ = mappedMove.worldZ;
      const clampedMag = mappedMove.magnitude;

      const baseWalkSpeed = 4.5 * settings.movementSensitivity;
      const sprintMultiplier = isSprintingRef.current ? 1.75 : 1.0;
      const targetVx = worldDirX * baseWalkSpeed * sprintMultiplier;
      const targetVz = worldDirZ * baseWalkSpeed * sprintMultiplier;

      // Smooth acceleration and deceleration
      const accelLerp = Math.min(1, dt * (clampedMag > 0.05 ? 11 : 9));
      velocityRef.current.vx += (targetVx - velocityRef.current.vx) * accelLerp;
      velocityRef.current.vz += (targetVz - velocityRef.current.vz) * accelLerp;

      const speed = Math.hypot(velocityRef.current.vx, velocityRef.current.vz);
      const isMovingHorizontally = speed > 0.14;

      // Vertical Jump & Gravity Physics
      const vPhys = verticalPhysicsRef.current;
      if (vPhys.isJumping || vPhys.yOffset > 0) {
        vPhys.yOffset += vPhys.vy * dt;
        vPhys.vy -= 14.5 * dt; // Gravity
        if (vPhys.yOffset <= 0) {
          vPhys.yOffset = 0;
          vPhys.vy = 0;
          vPhys.isJumping = false;
        }
      }

      if (isMovingHorizontally || vPhys.isJumping) {
        const nextX = localPosRef.current.x + velocityRef.current.vx * dt;
        const nextZ = localPosRef.current.z + velocityRef.current.vz * dt;
        const nextRotY = isMovingHorizontally
          ? Math.atan2(velocityRef.current.vx, velocityRef.current.vz)
          : localPosRef.current.rotY;

        const others = Object.values(activeRoom.participants);
        const resolved = resolveTheatreMovement(
          localPosRef.current,
          { x: nextX, z: nextZ },
          others,
          account.uid
        );

        const totalY = Number((resolved.y + vPhys.yOffset).toFixed(3));
        localPosRef.current = {
          x: resolved.x,
          y: totalY,
          z: resolved.z,
          rotY: nextRotY,
        };

        // Update context-sensitive interactive zone indicator
        const highLevelZone = getNearestInteractableZone({ x: resolved.x, z: resolved.z });
        const seatCheck = getInteractiveZoneAtPosition(resolved.x, resolved.z);
        if (highLevelZone === 'browser_kiosk') {
          setNearbyZone({ zone: 'browser_kiosk' });
        } else if (highLevelZone === 'exit_door') {
          setNearbyZone({ zone: 'exit_door' });
        } else if (seatCheck.zone === 'seat' && seatCheck.nearestSeat) {
          setNearbyZone({
            zone: 'seat',
            seatLabel: `${seatCheck.nearestSeat.rowLabel}${seatCheck.nearestSeat.seatNumber}`,
            seatIndex: seatCheck.nearestSeat.seatIndex,
          });
        } else {
          setNearbyZone({ zone: seatCheck.zone });
        }

        const activeAnim: CharacterAnimationState = vPhys.isJumping
          ? 'jumping'
          : isSprintingRef.current && speed > 3.2
          ? 'running'
          : 'walking';

        // Throttle network sync to ~14 updates/sec
        const nowMs = Date.now();
        if (nowMs - lastMoveSentAtRef.current > 70) {
          lastMoveSentAtRef.current = nowMs;
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'move',
                x: resolved.x,
                y: totalY,
                z: resolved.z,
                rotationY: nextRotY,
                animation: activeAnim,
              })
            );
          } else {
            dispatchRoomAction({
              type: 'move',
              x: resolved.x,
              y: totalY,
              z: resolved.z,
              rotationY: nextRotY,
              animation: activeAnim,
            });
          }
        }
      }

      // 2. Sync & Animate All Participant Avatars (10+ Distinct Animations)
      const currentParticipantUids = new Set(Object.keys(activeRoom.participants));
      for (const [uid, bundle] of avatarsMap.entries()) {
        if (!currentParticipantUids.has(uid)) {
          scene.remove(bundle.group);
          avatarsMap.delete(uid);
        }
      }

      for (const p of Object.values(activeRoom.participants)) {
        let bundle = avatarsMap.get(p.uid);
        if (!bundle) {
          bundle = buildAvatarBundle(p);
          avatarsMap.set(p.uid, bundle);
        }

        const isSelf = p.uid === account.uid;
        if (isSelf && (isMovingHorizontally || vPhys.isJumping) && p.seatIndex === null) {
          bundle.targetPos.set(
            localPosRef.current.x,
            localPosRef.current.y,
            localPosRef.current.z
          );
          bundle.targetRotY = localPosRef.current.rotY;
        } else {
          bundle.targetPos.set(p.position.x, p.position.y, p.position.z);
          bundle.targetRotY = p.rotationY;
          if (isSelf && !isMovingHorizontally && !vPhys.isJumping) {
            localPosRef.current = {
              x: p.position.x,
              y: p.position.y,
              z: p.position.z,
              rotY: p.rotationY,
            };
          }
        }

        // Smooth interpolation
        bundle.group.position.lerp(bundle.targetPos, Math.min(1, dt * 13));
        const rotDiff = bundle.targetRotY - bundle.group.rotation.y;
        bundle.group.rotation.y += rotDiff * Math.min(1, dt * 11);

        // Held Refreshment Props
        const hasPopcorn = p.holdingItem.startsWith('popcorn_');
        const hasDrink = p.holdingItem.startsWith('drink_');
        bundle.popcornProp.visible = hasPopcorn;
        bundle.drinkProp.visible = hasDrink;

        // Determine effective animation state
        const effectiveAnim: CharacterAnimationState =
          isSelf && vPhys.isJumping
            ? 'jumping'
            : isSelf && isMovingHorizontally
            ? isSprintingRef.current && speed > 3.2
              ? 'running'
              : 'walking'
            : p.animation;

        // Apply 10+ Character Animations
        if (p.seatIndex !== null || effectiveAnim === 'sitting') {
          // Seated posture
          bundle.bodyMesh.position.y = 0.72;
          bundle.headGroup.position.y = 1.32;
          bundle.leftLeg.rotation.x = -Math.PI / 2.2;
          bundle.rightLeg.rotation.x = -Math.PI / 2.2;
          bundle.leftLeg.position.y = 0.35;
          bundle.rightLeg.position.y = 0.35;
        } else if (effectiveAnim === 'jumping') {
          // Mid-air jump tuck & raised arms
          bundle.bodyMesh.position.y = 0.98;
          bundle.headGroup.position.y = 1.58;
          bundle.leftLeg.rotation.x = -0.45;
          bundle.rightLeg.rotation.x = 0.35;
          bundle.leftArm.rotation.x = -2.2;
          bundle.rightArm.rotation.x = -2.2;
        } else if (effectiveAnim === 'running') {
          // Fast sprint stride
          const runSwing = Math.sin(elapsed * 16) * 0.78;
          bundle.leftLeg.rotation.x = runSwing;
          bundle.rightLeg.rotation.x = -runSwing;
          bundle.leftArm.rotation.x = -runSwing * 0.85;
          bundle.rightArm.rotation.x = runSwing * 0.85;
          bundle.bodyMesh.position.y = 0.96 + Math.abs(Math.cos(elapsed * 16)) * 0.06;
          bundle.headGroup.position.y = 1.56 + Math.abs(Math.cos(elapsed * 16)) * 0.06;
        } else if (effectiveAnim === 'walking') {
          // Natural walk cycle
          const walkSwing = Math.sin(elapsed * 10) * 0.48;
          bundle.leftLeg.rotation.x = walkSwing;
          bundle.rightLeg.rotation.x = -walkSwing;
          bundle.leftArm.rotation.x = -walkSwing * 0.6;
          bundle.rightArm.rotation.x = walkSwing * 0.6;
          bundle.bodyMesh.position.y = 0.96 + Math.abs(Math.cos(elapsed * 10)) * 0.03;
          bundle.headGroup.position.y = 1.56 + Math.abs(Math.cos(elapsed * 10)) * 0.03;
        } else {
          // Idle / Standing breathing motion
          bundle.bodyMesh.position.y = 0.96 + Math.sin(elapsed * 2.4) * 0.015;
          bundle.headGroup.position.y = 1.56 + Math.sin(elapsed * 2.4) * 0.02;
          bundle.leftLeg.rotation.x = 0;
          bundle.rightLeg.rotation.x = 0;
          bundle.leftArm.rotation.x = 0;
        }

        // Upper-body snack / emote animations (work both standing and seated)
        if (effectiveAnim === 'eating_popcorn') {
          bundle.rightArm.rotation.x = -1.25 + Math.sin(elapsed * 9) * 0.42;
          bundle.popcornProp.position.y = 1.16 + Math.sin(elapsed * 9) * 0.12;
        } else if (effectiveAnim === 'drinking') {
          bundle.rightArm.rotation.x = -1.45 + Math.sin(elapsed * 6) * 0.25;
          bundle.drinkProp.position.y = 1.24 + Math.sin(elapsed * 6) * 0.08;
        } else if (
          effectiveAnim === 'wave' ||
          effectiveAnim === 'celebrating' ||
          effectiveAnim === 'interacting'
        ) {
          bundle.rightArm.rotation.x = -2.45 + Math.sin(elapsed * 12) * 0.45;
        } else if (effectiveAnim === 'laughing') {
          bundle.headGroup.rotation.x = Math.sin(elapsed * 14) * 0.24;
        } else if (hasPopcorn || hasDrink) {
          bundle.rightArm.rotation.x = -0.68;
          bundle.popcornProp.position.y = 0.98;
          bundle.drinkProp.position.y = 0.98;
        } else if (
          effectiveAnim !== 'walking' &&
          effectiveAnim !== 'running' &&
          effectiveAnim !== 'jumping'
        ) {
          bundle.rightArm.rotation.x = 0;
          bundle.headGroup.rotation.x = 0;
        }

        // Refresh overhead nameplate sprite when state changes
        const activeEmoteObj =
          p.activeEmote && p.emoteExpiresAtMs && p.emoteExpiresAtMs > Date.now()
            ? EMOTE_LABELS.find((e) => e.id === p.activeEmote)
            : null;
        const holdingBadge = hasPopcorn
          ? `🍿×${p.itemPortionsRemaining}`
          : hasDrink
          ? `🥤×${p.itemPortionsRemaining}`
          : null;
        const sig = `${p.displayName}|${p.role}|${activeEmoteObj?.symbol || ''}|${Boolean(
          p.isSpeaking || (isSelf && (micEnabledRef.current || pushToTalkActiveRef.current))
        )}|${holdingBadge || ''}`;

        if (bundle.lastLabelSignature !== sig) {
          bundle.lastLabelSignature = sig;
          const nextTex = createOverheadLabelTexture(
            p.displayName,
            p.role,
            p.appearance.primaryColor,
            activeEmoteObj?.symbol || null,
            Boolean(p.isSpeaking || (isSelf && (micEnabledRef.current || pushToTalkActiveRef.current))),
            holdingBadge
          );
          (bundle.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
          (bundle.labelSprite.material as THREE.SpriteMaterial).map = nextTex;
          (bundle.labelSprite.material as THREE.SpriteMaterial).needsUpdate = true;
        }

        // Hide overhead label if a non-self patron is standing closer than 2.2m to the camera lens
        const camDist = bundle.group.position.distanceTo(camera.position);
        bundle.labelSprite.visible = isSelf || camDist >= 2.2;
      }

      // 3. Update Camera System (First-Person, 3rd-Person Follow, Screen View, Free Orbit)
      const selfBundle = avatarsMap.get(account.uid);
      const activeCamMode = cameraModeRef.current;
      if (activeCamMode === 'first_person' && selfBundle) {
        const pPos = selfBundle.group.position;
        const yaw = cameraAnglesRef.current.yaw;
        const pitch = cameraAnglesRef.current.pitch;
        const eyeY = pPos.y + 1.58;
        camera.position.set(pPos.x, eyeY, pPos.z);
        const lookDist = 12;
        const targetX = pPos.x - Math.sin(yaw) * lookDist;
        const targetY = eyeY + pitch * 6;
        const targetZ = pPos.z - Math.cos(yaw) * lookDist;
        camera.lookAt(targetX, targetY, targetZ);
        selfBundle.headGroup.visible = false;
        selfBundle.labelSprite.visible = false;
      } else {
        if (selfBundle) {
          selfBundle.headGroup.visible = true;
        }
        if (activeCamMode === 'cinema_screen_view') {
          const targetCamPos = new THREE.Vector3(0, 4.9, 3.8);
          camera.position.lerp(targetCamPos, Math.min(1, dt * 5));
          camera.lookAt(0, 6.0, -13.0);
        } else if (activeCamMode === 'free_orbit') {
          const orbitRadius = 15.5;
          const angle = cameraAnglesRef.current.yaw + elapsed * 0.12;
          const targetCamPos = new THREE.Vector3(
            Math.sin(angle) * orbitRadius,
            6.5 + cameraAnglesRef.current.pitch * 4,
            Math.cos(angle) * orbitRadius
          );
          camera.position.lerp(targetCamPos, Math.min(1, dt * 4));
          camera.lookAt(0, 3.4, -2);
        } else if (selfBundle) {
          const pPos = selfBundle.group.position;
          const me = activeRoom.participants[account.uid];
          const yaw = cameraAnglesRef.current.yaw;
          const pitch = cameraAnglesRef.current.pitch;

          if (me && me.seatIndex !== null) {
            // Over-the-shoulder seated view facing the giant screen, rotatable with drag
            const dist = 2.6;
            const camX = pPos.x + Math.sin(yaw) * dist;
            const camZ = pPos.z + Math.cos(yaw) * dist;
            const camY = pPos.y + 1.65 + pitch * 1.4;
            camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 8));
            camera.lookAt(
              pPos.x - Math.sin(yaw) * 6,
              5.4 - pitch * 2.2,
              -13.0
            );
          } else {
            // Smooth 360° rotatable third-person follow camera around the player
            const followDist = 3.5;
            const camX = pPos.x + Math.sin(yaw) * followDist;
            const camZ = Math.min(13.2, pPos.z + Math.cos(yaw) * followDist);
            const camY = Math.max(1.8, pPos.y + 2.25 + pitch * 2.2);
            camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 9));
            camera.lookAt(pPos.x, pPos.y + 1.15, pPos.z - 2.2 * Math.cos(yaw));
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animFrameId);
      renderer.dispose();
    };
  }, [
    room?.roomId,
    room?.theme,
    room?.playback.mediaSource.url,
    room?.playback.mediaSource.sourceType,
    settings.graphicsQuality,
    settings.performanceMode,
    settings.cameraFov,
    account?.uid,
    dispatchRoomAction,
  ]);

  // Callback receiving normalized 2D & 3D vectors from <VirtualJoystick />
  const handleJoystickMove = useCallback((vec2D: { x: number; y: number }) => {
    joystickVectorRef.current = vec2D;
  }, []);

  // Right-Side Screen Drag Handlers for 360° Camera Rotation
  const handleCameraDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    cameraDragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCameraDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = cameraDragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    const deltaX = e.clientX - st.lastX;
    const deltaY = e.clientY - st.lastY;
    st.lastX = e.clientX;
    st.lastY = e.clientY;

    const sens = 0.0065 * settings.cameraSensitivity;
    cameraAnglesRef.current.yaw -= deltaX * sens;
    cameraAnglesRef.current.pitch = Math.max(
      -0.35,
      Math.min(0.85, cameraAnglesRef.current.pitch + deltaY * sens)
    );
  };

  const handleCameraDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = cameraDragStateRef.current;
    if (st.pointerId === e.pointerId) {
      st.active = false;
      st.pointerId = -1;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Copy Invite Link / Code
  const handleCopyInvite = () => {
    if (!room) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?roomInvite=${room.inviteCode}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedInvite(true);
    notify(`Copied Invite Code (${room.inviteCode}) & link!`, 'success');
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Validate and apply media source via NEXUS FILM PORTAL / MEDIA GATEWAY
  const handleApplyMediaSourceConfig = async (config: Partial<MediaSourceConfig>) => {
    if (!config.url) return;
    const check = validateAndClassifyMediaSource(config.url, config.title);
    setMediaValidationNotice({
      isAuthorized: check.isAuthorized,
      message: check.compatibilityMessage,
      externalUrl: !check.isAuthorized ? check.url : undefined,
    });

    const fullConfig: MediaSourceConfig = {
      ...check,
      ...config,
      url: config.url,
      title: config.title || check.title,
      sourceType: config.sourceType || check.sourceType,
    };

    await dispatchRoomAction({
      type: 'playback',
      action: 'set_source',
      sourceUrl: config.url,
      sourceTitle: fullConfig.title,
      sourceConfig: fullConfig,
    });
  };

  const handleApplyMediaSource = async (urlToLoad: string, titleToLoad?: string) => {
    await handleApplyMediaSourceConfig({ url: urlToLoad, title: titleToLoad });
  };

  // Simulate 20 / 30 / 35 concurrent participants in the 3D auditorium
  const handleSimulateLoad = async (targetCount: number) => {
    if (!room || !bearerToken) return;
    setIsBusy(true);
    try {
      const res = await apiFetch(`/api/social/rooms/${room.roomId}/simulate-load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ targetCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not run load simulation.', 'warning');
        return;
      }
      setRoom(data.room);
      notify(
        `Populated theatre with ${data.totalParticipants}/${data.capacity} concurrent 3D avatars!`,
        'success'
      );
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // ORIENTATION GUARD OVERLAY FOR PORTRAIT MOBILE VIEWPORTS
  // ============================================================================
  if (isPortraitMobile && !bypassOrientationPrompt) {
    return (
      <div
        data-testid="rotate-device-overlay"
        className="fixed inset-0 z-[100] bg-[#04060D] text-white flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div className="max-w-sm w-full bg-slate-900/90 border border-blue-500/30 rounded-3xl p-7 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400">
            <Smartphone className="w-8 h-8 rotate-90 animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] uppercase tracking-widest">
              Landscape-First 3D Theatre
            </span>
            <h2 className="text-xl font-bold tracking-tight">Rotate Your Device to Landscape</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              NEXUS SOCIAL is a full-screen 3D multiplayer cinema experience designed for widescreen
              landscape orientation. Rotate your phone horizontally for dual-thumb joystick and
              camera controls.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={requestLandscapeAndFullscreen}
              data-testid="lock-landscape-btn"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              Lock Landscape & Enter Fullscreen
            </button>
            <button
              onClick={() => setBypassOrientationPrompt(true)}
              data-testid="continue-landscape-preview-btn"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Continue to 3D Theatre Anyway
            </button>
            <button
              onClick={() => setActiveSection('dashboard')}
              className="w-full py-2 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
            >
              Return to CineShelf Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PRE-JOIN LANDSCAPE LAUNCHPAD (CREATE OR JOIN PRIVATE 3D CINEMA + AVATAR STUDIO)
  // ============================================================================
  if (!room) {
    return (
      <div
        data-testid="nexus-social-lobby"
        className="fixed inset-0 w-screen h-screen bg-[#04060D] text-white overflow-y-auto flex items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-6xl bg-[#090E1A]/95 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto">
          {/* Compact Top Bar inside Landscape Launchpad */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    NEXUS SOCIAL <span className="text-blue-400">3D CINEMA</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] font-mono text-blue-300 uppercase">
                    Up to 35 Players
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Multiplayer 3D theatre with live playback sync and lobby refreshments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLobbyTab('join_or_create')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  lobbyTab === 'join_or_create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Host or Join
              </button>
              <button
                onClick={() => setLobbyTab('customize')}
                data-testid="open-avatar-customizer-btn"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  lobbyTab === 'customize'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Avatar
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setActiveSection('dashboard')}
                data-testid="exit-to-dashboard-btn"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>
          </div>

          {lobbyTab === 'join_or_create' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Create Private 3D Theatre */}
              <div className="lg:col-span-7 bg-[#0D1425] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
                      Host Screening
                    </span>
                    <h2 className="text-base font-bold text-white">Create 3D Auditorium</h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                    {selectedCapacity} Seats
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                      Room Title
                    </label>
                    <input
                      type="text"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      data-testid="create-room-name-input"
                      placeholder="e.g., Friday Night Premiere"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                      Capacity
                    </label>
                    <select
                      value={selectedCapacity}
                      onChange={(e) =>
                        setSelectedCapacity(Number(e.target.value) as RoomCapacityOption)
                      }
                      data-testid="create-room-capacity-select"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value={35}>35 Players</option>
                      <option value={30}>30 Players</option>
                      <option value={25}>25 Players</option>
                      <option value={20}>20 Players</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                    Auditorium Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.values(THEATRE_THEMES) as (typeof THEATRE_THEMES)[TheatreThemeId][]).map(
                      (theme) => {
                        const active = selectedTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              active
                                ? 'bg-blue-600/15 border-blue-500 text-white'
                                : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">{theme.name}</span>
                              <span
                                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: theme.seatFabricColor }}
                              />
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateBotSandboxRoom}
                    disabled={isBusy}
                    data-testid="launch-bot-cinema-btn"
                    className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Explore 3D Theatre with AI Bots</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateRoom}
                    disabled={isBusy}
                    data-testid="launch-3d-cinema-btn"
                    className="w-full py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>
                      {account?.accessMode === 'guest'
                        ? 'Create Room with Friends (Login)'
                        : 'Create Room with Friends'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Join Private Room by Invite Code */}
              <div className="lg:col-span-5 bg-[#0D1425] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                        Friend Multiplayer Invite
                      </span>
                      <h2 className="text-base font-bold text-white">Join Friend&apos;s Room</h2>
                    </div>
                    <span
                      data-testid="lobby-access-mode-pill"
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        account?.accessMode === 'guest'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {account?.accessMode === 'guest'
                        ? `Guest · ${account.guestId || 'Active'}`
                        : `Friend · ${account?.loginId || 'Active'}`}
                    </span>
                  </div>

                  <form onSubmit={handleJoinRoom} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Room Invitation Code (Not Login Code)
                      </label>
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        data-testid="join-room-code-input"
                        placeholder="E.G. 7K9M2P4XQ"
                        maxLength={12}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono uppercase tracking-widest text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isBusy}
                      data-testid="join-3d-cinema-btn"
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>
                        {account?.accessMode === 'guest'
                          ? "Join Friend's Room (Login)"
                          : "Join Friend's Cinema"}
                      </span>
                    </button>
                  </form>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    {account?.displayName || appearance.displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    {account?.accessMode === 'guest' && (
                      <button
                        type="button"
                        onClick={() =>
                          openFriendLoginModal(
                            'Log in with a display name or temporary login code to unlock Friend Mode multiplayer.'
                          )
                        }
                        data-testid="lobby-upgrade-friend-btn"
                        className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                      >
                        Login for Friends
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLobbyTab('customize')}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Customise →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Character Studio inside Launchpad */
            <div className="bg-[#0D1425] border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase text-blue-400 font-bold tracking-widest">
                    NEXUS 3D AVATAR STUDIO
                  </span>
                  <h3 className="text-base font-extrabold text-white">
                    Customize Your 3D Cinema Character
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const genders: ('male' | 'female')[] = ['male', 'female'];
                    const pickedGender = genders[Math.floor(Math.random() * genders.length)];
                    const skinTones = ['#FEF08A', '#FDE047', '#F59E0B', '#D97706', '#B45309', '#78350F'];
                    const hairColors = ['#09090b', '#271c19', '#5c3a21', '#d4af37', '#e2e8f0', '#06b6d4', '#8b5cf6', '#dc2626'];
                    const eyeColors = ['#090d16', '#3d2314', '#78350f', '#059669', '#1d4ed8', '#7c3aed'];
                    const tops = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#14B8A6'];
                    const pants = ['#1E293B', '#0F172A', '#334155', '#475569', '#1e1b4b'];
                    const hairStyles: CharacterHairId[] = ['short_crop', 'spiky', 'bun_classic', 'cyber_undercut'];
                    const accessories: CharacterAccessoryId[] = ['none', '3d_glasses', 'visor', 'gold_headset'];

                    setAppearance((prev) => ({
                      ...prev,
                      gender: pickedGender,
                      skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
                      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
                      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
                      topColor: tops[Math.floor(Math.random() * tops.length)],
                      primaryColor: tops[Math.floor(Math.random() * tops.length)],
                      pantsColor: pants[Math.floor(Math.random() * pants.length)],
                      secondaryColor: pants[Math.floor(Math.random() * pants.length)],
                      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
                      accessory: accessories[Math.floor(Math.random() * accessories.length)],
                    }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Randomize
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 3D Interactive Character Preview (360° Drag & Zoom) */}
                <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-slate-800 p-2 flex flex-col items-center">
                  <div className="w-full h-80 rounded-xl overflow-hidden relative">
                    <Character3DPreview appearance={appearance} height={320} />
                    <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-950/85 text-slate-300 border border-slate-700/60 shadow">
                        Drag to rotate 360° · Scroll to zoom
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customization Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Gender / Body Model */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                      Character Gender & Proportions
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAppearance((prev) => ({ ...prev, gender: 'male' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          appearance.gender === 'male'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ♂ Male Proportions
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppearance((prev) => ({ ...prev, gender: 'female' }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          appearance.gender === 'female'
                            ? 'bg-pink-600 border-pink-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ♀ Female Proportions
                      </button>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Overhead Display Name
                    </label>
                    <input
                      type="text"
                      value={appearance.displayName}
                      onChange={(e) =>
                        setAppearance((prev) => ({ ...prev, displayName: e.target.value }))
                      }
                      maxLength={24}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  {/* Skin Tone Palette */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                      Skin Tone
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['#FEF08A', '#FDE047', '#F59E0B', '#D97706', '#B45309', '#78350F'].map(
                        (tone) => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => setAppearance((prev) => ({ ...prev, skinTone: tone }))}
                            className={`w-7 h-7 rounded-xl border-2 transition cursor-pointer ${
                              appearance.skinTone === tone
                                ? 'border-white scale-110 shadow-lg'
                                : 'border-transparent opacity-80'
                            }`}
                            style={{ backgroundColor: tone }}
                            title={tone}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Hairstyle & Hair Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                        Hairstyle
                      </label>
                      <select
                        value={appearance.hairStyle}
                        onChange={(e) =>
                          setAppearance((prev) => ({
                            ...prev,
                            hairStyle: e.target.value as CharacterHairId,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="short_crop">Classic Clean Crop</option>
                        <option value="spiky">Spiky Fade</option>
                        <option value="bun_classic">High Bun & Strands</option>
                        <option value="cyber_undercut">Cyber Undercut</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                        Hair Color
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          '#09090b',
                          '#271c19',
                          '#5c3a21',
                          '#d4af37',
                          '#e2e8f0',
                          '#06b6d4',
                          '#8b5cf6',
                          '#dc2626',
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setAppearance((prev) => ({ ...prev, hairColor: c }))}
                            className={`w-6 h-6 rounded-lg border transition cursor-pointer ${
                              appearance.hairColor === c ? 'border-white scale-110' : 'border-slate-800'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Outfit & Pants Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                        Top Clothing Color
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '#3B82F6',
                          '#10B981',
                          '#F59E0B',
                          '#EC4899',
                          '#8B5CF6',
                          '#06B6D4',
                          '#EF4444',
                          '#14B8A6',
                        ].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() =>
                              setAppearance((prev) => ({
                                ...prev,
                                primaryColor: hex,
                                topColor: hex,
                              }))
                            }
                            className={`w-6 h-6 rounded-lg border transition cursor-pointer ${
                              (appearance.topColor || appearance.primaryColor) === hex
                                ? 'border-white scale-110'
                                : 'border-slate-800'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                        Pants & Shoes Color
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['#1E293B', '#0F172A', '#334155', '#475569', '#1e1b4b', '#78350F'].map(
                          (hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() =>
                                setAppearance((prev) => ({
                                  ...prev,
                                  secondaryColor: hex,
                                  pantsColor: hex,
                                }))
                              }
                              className={`w-6 h-6 rounded-lg border transition cursor-pointer ${
                                (appearance.pantsColor || appearance.secondaryColor) === hex
                                ? 'border-white scale-110'
                                : 'border-slate-800'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accessory */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Cinema Accessory
                    </label>
                    <select
                      value={appearance.accessory}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          accessory: e.target.value as CharacterAccessoryId,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="none">No Accessory</option>
                      <option value="3d_glasses">Classic 3D Cinema Glasses (Red/Cyan)</option>
                      <option value="visor">Cyber Holographic Visor</option>
                      <option value="gold_headset">Spatial Audio Headset</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLobbyTab('join_or_create')}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    Save Character & Return
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // ACTIVE 100VW × 100VH LANDSCAPE 3D CINEMA EXPERIENCE
  // ============================================================================
  const myParticipant: RoomParticipantState | undefined = account
    ? room.participants[account.uid]
    : undefined;
  const isHost = myParticipant?.role === 'host';
  const isCoHost = myParticipant?.role === 'co_host';
  const canControlPlayback = isHost || isCoHost || !room.playback.controlsLocked;

  const formattedSourceResolution = room?.playback.sourceResolution
    ? typeof room.playback.sourceResolution === 'string'
      ? room.playback.sourceResolution
      : `${room.playback.sourceResolution.width}×${room.playback.sourceResolution.height}`
    : videoRef.current?.videoWidth
    ? `${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`
    : '1080p';
  const participantList = Object.values(room.participants);
  const selectedParticipant =
    (selectedParticipantUid && room.participants[selectedParticipantUid]) ||
    myParticipant;

  return (
    <div
      data-testid="active-3d-cinema-stage"
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#04060D] select-none touch-none"
    >
      {/* Hidden Authorised HTML5 Video Element Feeding the 3D Screen VideoTexture */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        className="hidden"
        onLoadedMetadata={(e) => {
          const vid = e.currentTarget;
          const dur = Math.round(vid.duration || 0);
          const vw = vid.videoWidth;
          const vh = vid.videoHeight;
          if (dur > 0 && isHost) {
            const resLabel =
              vw > 0 && vh > 0
                ? vw >= 3840
                  ? '3840×2160 (4K UHD)'
                  : vw >= 2560
                  ? '2560×1440 (2K QHD)'
                  : vw >= 1920
                  ? '1920×1080 (FHD)'
                  : vw >= 1280
                  ? '1280×720 (HD)'
                  : `${vw}×${vh}`
                : undefined;
            dispatchRoomAction({
              type: 'playback',
              action: 'seek',
              positionSeconds: room.playback.positionSeconds,
              durationSeconds: dur,
              sourceConfig: resLabel ? { sourceResolution: resLabel } : undefined,
            });
          }
        }}
      />

      {/* 1. Full-Viewport 3D WebGL Canvas */}
      <div
        ref={mountRef}
        data-testid="threejs-cinema-canvas-container"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* 2. Right-Half Screen Touch/Pointer Drag Area for 360° Camera Rotation */}
      <div
        data-testid="camera-drag-zone"
        onPointerDown={handleCameraDragPointerDown}
        onPointerMove={handleCameraDragPointerMove}
        onPointerUp={handleCameraDragPointerUp}
        onPointerCancel={handleCameraDragPointerUp}
        className="absolute top-14 bottom-28 right-0 w-1/2 z-10 cursor-grab active:cursor-grabbing touch-none"
        title="Drag here to rotate camera 360° around your character"
      />

      {/* 3. TOP-LEFT & TOP-RIGHT MINIMAL TRANSLUCENT GAMING HUD */}
      {!hudHidden && (
        <div
          style={{ opacity: settings.hudOpacity }}
          className="absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 pointer-events-none"
        >
          {/* Top-Left HUD: Room Mode / Invite Code, Live Connection Status, Participant Count, Quick Playback Pill */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {room.roomMode === 'bot_sandbox' ? (
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="hud-bot-mode-badge"
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 text-xs font-mono shadow-lg"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI BOT THEATRE</span>
                </span>
                <button
                  onClick={handleInviteFriendsInTheatre}
                  data-testid="hud-invite-friends-btn"
                  title="Upgrade this theatre to Friend Mode to invite real friends without losing your place"
                  className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shadow-lg"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Friends</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleCopyInvite}
                data-testid="copy-invite-code-btn"
                title="Click to copy Room Invite Code & Share Link (for multiplayer theatre)"
                className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 hover:border-blue-500/60 text-white flex items-center gap-2 text-xs font-mono transition cursor-pointer shadow-lg"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400">ROOM:</span>
                <span className="font-bold tracking-wider text-blue-300">{room.inviteCode}</span>
                <span
                  data-testid="role-badge"
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${
                    isHost
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {isHost ? 'HOST' : 'VIEWER'}
                </span>
                {copiedInvite ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}

            <button
              onClick={() => {
                setActiveDrawerTab('participants');
                setSideDrawerOpen((prev) => !prev);
              }}
              data-testid="hud-participants-count"
              className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 hover:border-blue-500/60 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-lg"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {participantList.length} / {room.capacity}
              </span>
            </button>

            {/* Compact Synchronised Playback Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-lg">
              {canControlPlayback ? (
                <button
                  onClick={() =>
                    dispatchRoomAction({
                      type: 'playback',
                      action: room.playback.isPlaying ? 'pause' : 'play',
                    })
                  }
                  data-testid="playback-play-pause-btn"
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {room.playback.isPlaying ? (
                    <>
                      <Pause className="w-3 h-3" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" /> Play
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() =>
                    dispatchRoomAction({
                      type: 'playback',
                      action: 'request_control',
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-mono cursor-pointer"
                >
                  Locked · Request
                </button>
              )}
              <span className="text-[11px] font-mono text-slate-300 px-1">
                {Math.floor(room.playback.positionSeconds / 60)}:
                {String(Math.floor(room.playback.positionSeconds % 60)).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 hidden md:inline">
                ±{syncDriftMs}ms
              </span>
            </div>

            {/* Screen Quality & Picture Fit Pill Toggle */}
            <button
              onClick={() => setQualityPanelOpen((prev) => !prev)}
              data-testid="hud-toggle-quality-panel-btn"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono transition cursor-pointer shadow-lg ${
                qualityPanelOpen
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-300 hover:bg-slate-900'
              }`}
              title="Toggle Screen Resolution & Quality Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{formattedSourceResolution}</span>
            </button>
          </div>

          {/* Top-Right HUD: Browser, Film Portal, Chat, Players, Settings, Hide HUD, Fullscreen, Exit */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setBrowserOpen(true)}
              data-testid="hud-open-browser-btn"
              className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Open In-App Web Browser"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Browser</span>
            </button>

            <button
              onClick={() => setIsProjectionScreenFullscreen(true)}
              data-testid="hud-projection-fullscreen-btn"
              className="px-2.5 py-1.5 rounded-xl bg-purple-950/85 hover:bg-purple-900 text-purple-300 border border-purple-500/50 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Open Projection Screen Fullscreen (Video Player View)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Screen Fullscreen</span>
            </button>

            <button
              onClick={() => setFilmPortalModalOpen(true)}
              data-testid="hud-open-media-gateway-btn"
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Film Portal · My Media, Uploads & Streams"
            >
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">Film Portal</span>
            </button>

            <button
              onClick={() => setActiveSection('character_studio')}
              data-testid="hud-edit-avatar-btn"
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Edit 3D Avatar in Character Studio"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Edit Avatar</span>
            </button>

            <button
              onClick={() => {
                setActiveDrawerTab('chat');
                setSideDrawerOpen((prev) =>
                  prev && activeDrawerTab === 'chat' ? false : true
                );
              }}
              data-testid="hud-toggle-chat-btn"
              className={`p-2 rounded-xl border text-xs transition cursor-pointer shadow-lg ${
                sideDrawerOpen && activeDrawerTab === 'chat'
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-200 hover:bg-slate-900'
              }`}
              title="Toggle Live Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setActiveDrawerTab('participants');
                setSideDrawerOpen((prev) =>
                  prev && activeDrawerTab === 'participants' ? false : true
                );
              }}
              data-testid="hud-toggle-players-btn"
              className={`p-2 rounded-xl border text-xs transition cursor-pointer shadow-lg ${
                sideDrawerOpen && activeDrawerTab === 'participants'
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-200 hover:bg-slate-900'
              }`}
              title="Toggle Player List"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMediaSettingsOpen(true)}
              data-testid="hud-open-media-settings-btn"
              className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-blue-400 border border-slate-700/80 transition cursor-pointer shadow-lg"
              title="Streaming Player 2.0 Settings (Quality, Subtitles, Audio, Viewing Modes)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDiagnosticsVisible((prev) => !prev)}
              data-testid="hud-toggle-diagnostics-btn"
              className={`p-2 rounded-xl border text-xs transition cursor-pointer shadow-lg ${
                diagnosticsVisible
                  ? 'bg-emerald-600 border-emerald-400 text-white font-bold'
                  : 'bg-slate-950/85 border-slate-700/80 text-emerald-400 hover:bg-slate-900'
              }`}
              title="Toggle Live Streaming Diagnostics (Press D)"
            >
              <Zap className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              data-testid="hud-open-settings-btn"
              className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80 transition cursor-pointer shadow-lg"
              title="3D Engine Settings & Sensitivity"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setHudHidden(true)}
              data-testid="hud-hide-btn"
              className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80 transition cursor-pointer shadow-lg"
              title="Hide HUD Controls (Press H to restore)"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              data-testid="hud-fullscreen-btn"
              className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80 transition cursor-pointer shadow-lg hidden sm:flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={async () => {
                await dispatchRoomAction({ type: 'leave' });
                setRoom(null);
              }}
              data-testid="leave-room-btn"
              className="px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg"
              title="Exit 3D Theatre"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Restore HUD Floating Pill when HUD is hidden */}
      {hudHidden && (
        <button
          onClick={() => setHudHidden(false)}
          data-testid="hud-restore-btn"
          className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          Show HUD
        </button>
      )}

      {/* 4. CONTEXTUAL PROXIMITY PROMPT BANNER (TOP-CENTER) */}
      {!hudHidden && nearbyZone.zone !== 'none' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="px-4 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-amber-500/50 text-white shadow-2xl flex items-center gap-3">
            <span className="text-xs font-semibold text-amber-300">
              {nearbyZone.zone === 'popcorn_counter' && '🍿 At Popcorn Counter'}
              {nearbyZone.zone === 'drinks_counter' && '🥤 At Cold-Drinks Counter'}
              {nearbyZone.zone === 'browser_kiosk' && '🌐 At NEXUS Web Browser Kiosk'}
              {nearbyZone.zone === 'exit_door' && '🚪 At Auditorium Exit Doors'}
              {nearbyZone.zone === 'seat' && `💺 Near Seat ${nearbyZone.seatLabel}`}
            </span>
            <button
              onClick={handleContextInteract}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              {nearbyZone.zone === 'browser_kiosk'
                ? 'Open Browser (E)'
                : nearbyZone.zone === 'exit_door'
                ? 'Exit Theatre (E)'
                : nearbyZone.zone === 'popcorn_counter'
                ? 'Grab Popcorn (E)'
                : nearbyZone.zone === 'drinks_counter'
                ? 'Grab Cold Drink (E)'
                : `Sit in ${nearbyZone.seatLabel} (E)`}
            </button>
          </div>
        </div>
      )}

      {/* Host Visitor Control Request Banner */}
      {isHost && room.playback.controlRequests && room.playback.controlRequests.length > 0 && !hudHidden && (
        <div
          data-testid="visitor-control-request-banner"
          className="absolute top-16 right-4 z-40 max-w-sm p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/60 shadow-2xl backdrop-blur-md space-y-2 pointer-events-auto"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Control Request
            </span>
            <button
              onClick={() => dispatchRoomAction({ type: 'playback', action: 'dismiss_control_request' })}
              className="p-1 rounded text-amber-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-amber-100">
            <strong>{room.playback.controlRequests[0].displayName}</strong> requested permission to control shared playback.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => dispatchRoomAction({ type: 'playback', action: 'grant_control' })}
              className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
            >
              Grant Control
            </button>
            <button
              onClick={() =>
                dispatchRoomAction({
                  type: 'playback',
                  action: 'dismiss_control_request',
                  targetUid: room.playback.controlRequests[0].uid,
                })
              }
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer border border-slate-700"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* 5. BOTTOM-LEFT: 360° ANALOG VIRTUAL JOYSTICK COMPONENT */}
      {!hudHidden && (
        <div
          style={{ opacity: settings.hudOpacity }}
          className="absolute bottom-5 left-5 z-30 flex items-end gap-3 pointer-events-auto select-none touch-none"
        >
          <VirtualJoystick
            cameraYaw={cameraAnglesRef.current.yaw}
            sensitivity={settings.joystickSensitivity}
            onMove={handleJoystickMove}
            label="Move · 360°"
          />

          {/* Held Refreshment Status Pill next to Joystick */}
          {myParticipant && myParticipant.holdingItem !== 'none' && (
            <div className="mb-4 px-3 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 flex items-center gap-2 shadow-xl">
              <span className="text-xs font-semibold text-amber-300">
                {myParticipant.holdingItem.startsWith('popcorn_') ? '🍿 Popcorn' : '🥤 Cold Drink'}{' '}
                ({myParticipant.itemPortionsRemaining}/5)
              </span>
              <button
                onClick={() =>
                  dispatchRoomAction({
                    type: 'refreshment',
                    action: myParticipant.holdingItem.startsWith('popcorn_')
                      ? 'eat_popcorn'
                      : 'drink_beverage',
                  })
                }
                data-testid="consume-held-refreshment-btn"
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
              >
                {myParticipant.holdingItem.startsWith('popcorn_') ? 'Eat' : 'Sip'}
              </button>
              <button
                onClick={() =>
                  dispatchRoomAction({ type: 'refreshment', action: 'put_away' })
                }
                className="text-[10px] text-slate-400 hover:text-white px-1 cursor-pointer"
              >
                Drop
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. BOTTOM-RIGHT: GAME ACTION CLUSTER (JUMP, SPRINT, INTERACT, SIT/STAND, POPCORN, DRINK, WAVE, CAMERA) */}
      {!hudHidden && (
        <div
          style={{ opacity: settings.hudOpacity }}
          className="absolute bottom-5 right-5 z-30 flex flex-col items-end gap-2 pointer-events-auto select-none"
        >
          {/* Upper utility row: Camera Mode, Reset Camera, Mic */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const nextState = !micEnabled;
                setMicEnabled(nextState);
                dispatchRoomAction({
                  type: 'voice_state',
                  isMuted: !nextState,
                  isSpeaking: nextState,
                  voiceMode: nextState ? 'open_mic' : 'off',
                });
              }}
              data-testid="action-mic-toggle"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg ${
                micEnabled
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-300 hover:bg-slate-900'
              }`}
              title="Toggle Voice Chat Microphone"
            >
              {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{micEnabled ? 'Mic On' : 'Muted'}</span>
            </button>

            <button
              onClick={() =>
                setCameraMode((prev) =>
                  prev === 'third_person_follow'
                    ? 'first_person'
                    : prev === 'first_person'
                    ? 'cinema_screen_view'
                    : prev === 'cinema_screen_view'
                    ? 'free_orbit'
                    : 'third_person_follow'
                )
              }
              data-testid="action-camera-mode"
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg"
              title="Switch Camera Mode (3rd-Person / 1st-Person / Screen / Orbit)"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">
                {cameraMode === 'third_person_follow'
                  ? '3rd-Person'
                  : cameraMode === 'first_person'
                  ? '1st-Person'
                  : cameraMode === 'cinema_screen_view'
                  ? 'Screen View'
                  : 'Orbit'}
              </span>
            </button>

            <button
              onClick={() => setQualityPanelOpen((prev) => !prev)}
              data-testid="action-media-quality"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg ${
                qualityPanelOpen
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-950/85 border-slate-700/80 text-slate-200 hover:bg-slate-900'
              }`}
              title="Screen Resolution, Playback Speed & Picture Fit"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Quality</span>
            </button>

            <button
              onClick={handleResetCamera}
              data-testid="action-reset-camera"
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg"
              title="Reset Camera Behind Player"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reset Cam</span>
            </button>
          </div>

          {/* Primary 6-Button Game Action Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Grab / Eat Popcorn */}
            <button
              onClick={() => {
                const holdingPopcorn = myParticipant?.holdingItem.startsWith('popcorn_');
                playInteractionSfx(holdingPopcorn ? 'eat' : 'popcorn');
                dispatchRoomAction({
                  type: 'refreshment',
                  action: holdingPopcorn ? 'eat_popcorn' : 'pickup_popcorn',
                  itemVariant: 'popcorn_butter',
                });
              }}
              data-testid="action-popcorn"
              className="px-3 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px]"
            >
              <Popcorn className="w-4 h-4" />
              <span className="text-[10px]">
                {myParticipant?.holdingItem.startsWith('popcorn_') ? 'Eat 🍿' : 'Popcorn'}
              </span>
            </button>

            {/* Grab / Sip Cold Drink */}
            <button
              onClick={() => {
                const holdingDrink = myParticipant?.holdingItem.startsWith('drink_');
                playInteractionSfx(holdingDrink ? 'sip' : 'drink');
                dispatchRoomAction({
                  type: 'refreshment',
                  action: holdingDrink ? 'drink_beverage' : 'pickup_drink',
                  itemVariant: 'drink_cola',
                });
              }}
              data-testid="action-drink"
              className="px-3 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px]"
            >
              <CupSoda className="w-4 h-4" />
              <span className="text-[10px]">
                {myParticipant?.holdingItem.startsWith('drink_') ? 'Sip 🥤' : 'Drink'}
              </span>
            </button>

            {/* Wave / Emote */}
            <button
              onClick={() => {
                playInteractionSfx('emote');
                dispatchRoomAction({ type: 'emote', emote: 'wave' });
              }}
              data-testid="action-wave"
              className="px-3 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px]"
            >
              <Hand className="w-4 h-4" />
              <span className="text-[10px]">Wave</span>
            </button>

            {/* Sit / Stand */}
            <button
              onClick={() => {
                playInteractionSfx('seat');
                dispatchRoomAction({ type: 'seat' });
              }}
              data-testid="action-sit"
              className={`px-3 py-2.5 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px] ${
                myParticipant?.seatIndex !== null && myParticipant?.seatIndex !== undefined
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-950/85 hover:bg-slate-900 border-slate-700/80 text-slate-200'
              }`}
            >
              <Armchair className="w-4 h-4" />
              <span className="text-[10px]">
                {myParticipant?.seatIndex !== null && myParticipant?.seatIndex !== undefined
                  ? 'Stand Up'
                  : 'Sit'}
              </span>
            </button>

            {/* Run / Sprint Toggle */}
            <button
              onClick={() => setIsSprinting((prev) => !prev)}
              data-testid="action-sprint"
              className={`px-3 py-2.5 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px] ${
                isSprinting
                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                  : 'bg-slate-950/85 hover:bg-slate-900 border-slate-700/80 text-slate-200'
              }`}
            >
              <Footprints className="w-4 h-4" />
              <span className="text-[10px]">{isSprinting ? 'Sprinting' : 'Sprint'}</span>
            </button>

            {/* Jump Button */}
            <button
              onClick={handleJumpAction}
              data-testid="action-jump"
              className="px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xl transition active:scale-95 cursor-pointer min-w-[72px]"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[10px]">Jump</span>
            </button>
          </div>

          {/* Primary Context Interact Bar */}
          <button
            onClick={handleContextInteract}
            data-testid="action-interact"
            className="w-full py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl transition active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {nearbyZone.zone === 'popcorn_counter'
                ? 'Interact: Grab Popcorn'
                : nearbyZone.zone === 'drinks_counter'
                ? 'Interact: Grab Cold Drink'
                : nearbyZone.zone === 'browser_kiosk'
                ? 'Interact: Open Web Browser'
                : nearbyZone.zone === 'exit_door'
                ? 'Interact: Exit Theatre'
                : nearbyZone.zone === 'seat'
                ? `Interact: Sit in ${nearbyZone.seatLabel}`
                : 'Interact (E)'}
            </span>
          </button>
        </div>
      )}

      {/* 7. COLLAPSIBLE TRANSLUCENT RIGHT SIDE PANEL (PLAYERS, CHAT, INTERACTIONS, ROOM SECURITY) */}
      {sideDrawerOpen && (
        <div
          data-testid="cinema-side-drawer"
          className="absolute top-16 bottom-4 right-4 w-80 sm:w-96 max-w-[92vw] z-40 bg-slate-950/92 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Drawer Header & Tabs */}
          <div className="p-2.5 border-b border-slate-800 flex items-center justify-between gap-1">
            <div className="grid grid-cols-4 gap-1 flex-1">
              {(
                [
                  { id: 'participants', label: `Players (${participantList.length})` },
                  { id: 'chat', label: 'Chat' },
                  { id: 'interactions', label: 'Snacks' },
                  { id: 'room', label: 'Room' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveDrawerTab(t.id)}
                  data-testid={`drawer-tab-${t.id}`}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    activeDrawerTab === t.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSideDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Close Panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {/* TAB 1: PARTICIPANTS & INSPECTED PLAYER */}
            {activeDrawerTab === 'participants' && (
              <div className="space-y-3">
                {selectedParticipant && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{
                            backgroundColor: selectedParticipant.appearance.primaryColor,
                          }}
                        />
                        <span className="text-xs font-bold text-white">
                          {selectedParticipant.displayName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {selectedParticipant.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        State: <strong className="text-slate-200">{selectedParticipant.animation}</strong>
                      </span>
                      <span>
                        Seat:{' '}
                        <strong className="text-slate-200">
                          {selectedParticipant.seatIndex !== null
                            ? `${THEATRE_SEAT_LAYOUT[selectedParticipant.seatIndex]?.rowLabel}${
                                THEATRE_SEAT_LAYOUT[selectedParticipant.seatIndex]?.seatNumber
                              }`
                            : 'Standing'}
                        </strong>
                      </span>
                      <span>
                        Item:{' '}
                        <strong className="text-amber-300">
                          {selectedParticipant.holdingItem}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  {participantList.map((p) => (
                    <div
                      key={p.uid}
                      onClick={() => setSelectedParticipantUid(p.uid)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                        selectedParticipant?.uid === p.uid
                          ? 'bg-blue-950/40 border-blue-500/50'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.appearance.primaryColor }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            {p.displayName}
                            {p.role === 'host' && (
                              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {p.seatIndex !== null
                              ? `Seat ${THEATRE_SEAT_LAYOUT[p.seatIndex]?.rowLabel}${
                                  THEATRE_SEAT_LAYOUT[p.seatIndex]?.seatNumber
                                }`
                              : 'In Lobby / Aisle'}{' '}
                            · {p.animation}
                          </p>
                        </div>
                      </div>

                      {isHost && p.uid !== account?.uid && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatchRoomAction({
                                type: 'promote_cohost',
                                targetUid: p.uid,
                                makeCoHost: p.role !== 'co_host',
                              });
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 cursor-pointer"
                          >
                            {p.role === 'co_host' ? 'Demote' : 'Co-Host'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatchRoomAction({
                                type: 'transfer_host',
                                newHostUid: p.uid,
                              });
                            }}
                            className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono cursor-pointer"
                          >
                            Host
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Multi-Participant Load Simulator for Host */}
                {isHost && (
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      3D Crowd Stress Simulator (Up to {room.capacity})
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[20, 30, 35].map((cnt) => (
                        <button
                          key={cnt}
                          disabled={isBusy || cnt > room.capacity}
                          onClick={() => handleSimulateLoad(cnt)}
                          data-testid={`simulate-load-${cnt}-btn`}
                          className="py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 disabled:opacity-40 text-white text-[11px] font-mono transition cursor-pointer"
                        >
                          Fill {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LIVE CHAT & EMOTE REACTIONS */}
            {activeDrawerTab === 'chat' && (
              <div className="flex flex-col h-full space-y-3">
                {/* Emote Strip */}
                <div className="flex flex-wrap gap-1">
                  {EMOTE_LABELS.map((em) => (
                    <button
                      key={em.id}
                      onClick={() => {
                        playInteractionSfx('emote');
                        dispatchRoomAction({ type: 'emote', emote: em.id });
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs cursor-pointer"
                      title={em.label}
                    >
                      {em.symbol}
                    </button>
                  ))}
                </div>

                {/* Messages List */}
                <div className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {room.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: m.avatarColor }}>
                          {m.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {m.isNearbyOnly ? 'Nearby' : 'Room'}
                        </span>
                      </div>
                      <p className="text-slate-200 break-words leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!chatInput.trim()) return;
                    const text = chatInput;
                    setChatInput('');
                    await dispatchRoomAction({
                      type: 'chat',
                      text,
                      isNearbyOnly: nearbyChatOnly,
                    });
                  }}
                  className="space-y-2 pt-1"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      data-testid="cinema-chat-input"
                      placeholder="Message the theatre..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      data-testid="cinema-chat-send-btn"
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nearbyChatOnly}
                      onChange={(e) => setNearbyChatOnly(e.target.checked)}
                    />
                    Whisper to nearby seats only
                  </label>
                </form>
              </div>
            )}

            {/* TAB 3: SNACKS, SEATS & BROWSER SHORTCUT */}
            {activeDrawerTab === 'interactions' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <p className="text-[11px] font-mono uppercase text-amber-400">
                    Popcorn Counter Flavours
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'popcorn_butter', label: '🍿 Classic Butter' },
                        { id: 'popcorn_caramel', label: '🍿 Caramel Crunch' },
                        { id: 'popcorn_cheese', label: '🍿 Cheddar Tub' },
                        { id: 'popcorn_large_bucket', label: '🍿 Premiere Bucket' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          playInteractionSfx('popcorn');
                          dispatchRoomAction({
                            type: 'refreshment',
                            action: 'pickup_popcorn',
                            itemVariant: item.id,
                          });
                        }}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-slate-800 text-left text-xs text-slate-200 cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <p className="text-[11px] font-mono uppercase text-sky-400">
                    Cold-Drinks Fountain
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'drink_cola', label: '🥤 Classic Cola' },
                        { id: 'drink_blue_slush', label: '🧊 Electric Slush' },
                        { id: 'drink_iced_tea', label: '🍹 Peach Iced Tea' },
                        { id: 'drink_sparkling', label: '✨ Sparkling Lime' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          playInteractionSfx('drink');
                          dispatchRoomAction({
                            type: 'refreshment',
                            action: 'pickup_drink',
                            itemVariant: item.id,
                          });
                        }}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-sky-500/20 border border-slate-800 text-left text-xs text-slate-200 cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setBrowserOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  Launch In-App Web Browser
                </button>
              </div>
            )}

            {/* TAB 4: ROOM & SECURITY */}
            {activeDrawerTab === 'room' && (
              <div className="space-y-3">
                {room.roomMode === 'bot_sandbox' ? (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2.5">
                    <p className="text-[11px] font-mono uppercase text-emerald-300">
                      AI Bot Practice Theatre ({account?.accessMode === 'guest' ? 'Guest Mode' : 'Solo Mode'})
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      You are exploring with AI Cinema Bots. Upgrade this room to Friend Mode anytime
                      to get a shareable Room Invite Code without resetting your seat or playback.
                    </p>
                    <button
                      onClick={handleInviteFriendsInTheatre}
                      data-testid="drawer-invite-friends-btn"
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Friends to This Room</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-[11px] font-mono uppercase text-slate-400">
                      Room Invitation Code (Share with Friends)
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-blue-400 tracking-widest">
                        {room.inviteCode}
                      </span>
                      <button
                        onClick={handleCopyInvite}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Copy Room Link
                      </button>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => dispatchRoomAction({ type: 'regenerate_invite' })}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-200 cursor-pointer"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() =>
                            dispatchRoomAction({
                              type: 'lock_room',
                              isLocked: !room.isLocked,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-amber-300 cursor-pointer"
                        >
                          {room.isLocked ? 'Unlock Room' : 'Lock Room'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isHost && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-[11px] font-mono uppercase text-slate-400">
                      Live 3D Auditorium Theme
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(THEATRE_THEMES) as TheatreThemeId[]).map((tId) => (
                        <button
                          key={tId}
                          onClick={() =>
                            dispatchRoomAction({ type: 'theme', theme: tId })
                          }
                          className={`p-2 rounded-lg border text-left text-[11px] font-semibold cursor-pointer ${
                            room.theme === tId
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {THEATRE_THEMES[tId].name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================
          8. PROPER IN-APP WEB BROWSER / WEBSITE VIEWER OVERLAY
         ============================================================================ */}
      {browserOpen && (
        <div
          data-testid="in-app-browser-modal"
          className={`fixed z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-all ${
            browserFullscreen
              ? 'inset-0 rounded-none'
              : 'inset-3 sm:inset-6 rounded-3xl'
          }`}
        >
          {/* Browser Top Navigation Bar */}
          <div className="p-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center gap-2">
            {/* Back / Forward / Refresh / Home */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (browserHistoryIndex > 0) {
                    const nextIdx = browserHistoryIndex - 1;
                    setBrowserHistoryIndex(nextIdx);
                    navigateBrowserTo(browserHistory[nextIdx], false);
                  }
                }}
                disabled={browserHistoryIndex <= 0}
                data-testid="browser-back-btn"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (browserHistoryIndex < browserHistory.length - 1) {
                    const nextIdx = browserHistoryIndex + 1;
                    setBrowserHistoryIndex(nextIdx);
                    navigateBrowserTo(browserHistory[nextIdx], false);
                  }
                }}
                disabled={browserHistoryIndex >= browserHistory.length - 1}
                data-testid="browser-forward-btn"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                title="Forward"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIframeReloadKey((k) => k + 1);
                  navigateBrowserTo(browserUrl, false);
                }}
                data-testid="browser-refresh-btn"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Refresh Page"
              >
                <RefreshCw
                  className={`w-4 h-4 ${browserInspectState.loading ? 'animate-spin text-blue-400' : ''}`}
                />
              </button>
              <button
                onClick={() =>
                  navigateBrowserTo('https://en.m.wikipedia.org/wiki/Portal:Film')
                }
                data-testid="browser-home-btn"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Browser Home"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>

            {/* URL Address Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigateBrowserTo(browserAddressInput);
              }}
              className="flex-1 min-w-[180px] flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={browserAddressInput}
                  onChange={(e) => setBrowserAddressInput(e.target.value)}
                  data-testid="browser-url-input"
                  placeholder="Enter https:// URL or domain..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                data-testid="browser-go-btn"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Go
              </button>
            </form>

            {/* Quick Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!browserSearchInput.trim()) return;
                navigateBrowserTo(
                  `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(
                    browserSearchInput.trim()
                  )}`
                );
              }}
              className="hidden lg:flex items-center gap-1.5"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={browserSearchInput}
                  onChange={(e) => setBrowserSearchInput(e.target.value)}
                  data-testid="browser-search-input"
                  placeholder="Search film encyclopedia..."
                  className="w-44 pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </form>

            {/* Scroll, Zoom, Fullscreen & External Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBrowserScrollOffset((prev) => Math.max(0, prev - 220))}
                data-testid="browser-scroll-up"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Scroll Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBrowserScrollOffset((prev) => prev + 220)}
                data-testid="browser-scroll-down"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Scroll Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() =>
                  setBrowserZoom((z) => (z <= 75 ? 75 : z - 25))
                }
                data-testid="browser-zoom-out"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-300 px-1">
                {browserZoom}%
              </span>
              <button
                onClick={() =>
                  setBrowserZoom((z) => (z >= 150 ? 150 : z + 25))
                }
                data-testid="browser-zoom-in"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setBrowserFullscreen((prev) => !prev)}
                data-testid="browser-fullscreen-toggle"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Toggle Fullscreen Browser"
              >
                {browserFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              <a
                href={browserUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="browser-open-external"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1"
                title="Open in External Browser Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">External</span>
              </a>

              <button
                onClick={() => setBrowserOpen(false)}
                data-testid="browser-close-btn"
                className="px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Bookmarks & Status Strip */}
          <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono uppercase text-slate-500">
                Quick Portals:
              </span>
              {BROWSER_BOOKMARKS.map((bm) => (
                <button
                  key={bm.url}
                  onClick={() => navigateBrowserTo(bm.url)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    browserUrl === bm.url
                      ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {bm.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                {browserInspectState.reason}
              </span>
              <button
                onClick={() => {
                  setBrowserOpen(false);
                  setFilmPortalModalOpen(true);
                }}
                data-testid="browser-open-film-portal-btn"
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1 shadow"
              >
                <Film className="w-3.5 h-3.5" />
                Film Portal
              </button>
            </div>
          </div>

          {/* Browser Viewport Area */}
          <div className="flex-1 relative bg-slate-950 overflow-auto">
            {browserInspectState.canEmbed ? (
              <div
                style={{
                  transform: `scale(${browserZoom / 100}) translateY(-${browserScrollOffset}px)`,
                  transformOrigin: 'top left',
                  width: `${10000 / browserZoom}%`,
                  height: `${10000 / browserZoom}%`,
                }}
                className="w-full h-full transition-transform duration-150"
              >
                <iframe
                  key={`${browserUrl}-${iframeReloadKey}`}
                  src={browserUrl}
                  title="NEXUS In-App Website Viewer"
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            ) : (
              <div
                data-testid="browser-frame-blocked-notice"
                className="w-full h-full flex items-center justify-center p-6 text-center"
              >
                <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white">
                      External Website Blocks Embedded Iframes
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {browserInspectState.reason}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <a
                      href={browserUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in External Browser
                    </a>
                    <button
                      onClick={() => {
                        setBrowserOpen(false);
                        setFilmPortalModalOpen(true);
                      }}
                      data-testid="browser-frame-return-portal-btn"
                      className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Film className="w-4 h-4" />
                      Return to Film Portal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================
          8. FLOATING QUALITY & CINEMA SCREEN CONTROL PANEL HUD
         ============================================================================ */}
      {qualityPanelOpen && !hudHidden && (
        <div
          data-testid="quality-control-panel-hud"
          className="absolute bottom-24 right-4 sm:right-64 z-40 w-80 sm:w-88 max-w-[94vw] bg-slate-950/95 backdrop-blur-xl border border-blue-500/40 rounded-2xl p-4 shadow-2xl space-y-3.5 pointer-events-auto"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Screen & Stream Settings
              </span>
            </div>
            <button
              onClick={() => setQualityPanelOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Source Info */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Source:</span>
              <span
                className="font-semibold text-white truncate max-w-[170px]"
                title={room.playback.mediaSource.title}
              >
                {room.playback.mediaSource.title}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Resolution:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formattedSourceResolution}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Aspect / Type:</span>
              <span className="font-mono text-slate-300">
                {room.playback.mediaSource.aspectRatioLabel || '16:9'} ·{' '}
                {room.playback.mediaSource.sourceType.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">WebGL Sync Drift:</span>
              <span className="font-mono text-cyan-400">±{syncDriftMs}ms</span>
            </div>
          </div>

          {/* Playback Speed (Authoritative) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Playback Speed</span>
              <span className="text-blue-400 font-mono font-bold">
                {room.playback.playbackSpeed || 1.0}x
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => {
                const isCurrent = (room.playback.playbackSpeed || 1.0) === s;
                return (
                  <button
                    key={s}
                    disabled={!canControlPlayback}
                    onClick={() => {
                      dispatchRoomAction({
                        type: 'playback',
                        action: 'set_speed',
                        playbackSpeed: s,
                      });
                    }}
                    className={`py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    } disabled:opacity-40`}
                  >
                    {s}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Picture Fit Mode (Aspect Ratio Handling) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Cinema Screen Picture Fit</span>
              <span className="text-amber-400 text-[10px] font-mono uppercase">
                {room.playback.pictureFitMode || 'fit'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'fit', label: 'Fit (Letterbox)' },
                  { id: 'fill', label: 'Fill Screen' },
                  { id: 'original', label: '1:1 Native' },
                ] as const
              ).map((mode) => {
                const isCurrent = (room.playback.pictureFitMode || 'fit') === mode.id;
                return (
                  <button
                    key={mode.id}
                    disabled={!canControlPlayback}
                    onClick={() => {
                      dispatchRoomAction({
                        type: 'playback',
                        action: 'set_fit_mode',
                        pictureFitMode: mode.id,
                      });
                    }}
                    className={`p-1.5 rounded-xl border text-center transition cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600/30 border-blue-500 text-white font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    } disabled:opacity-40`}
                  >
                    <p className="text-[11px] font-semibold">{mode.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adaptive HLS Quality Levels if available */}
          {availableStreamQualities.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">HLS Stream Ladder</span>
                <span className="text-emerald-400 font-mono text-[10px]">
                  {currentStreamQuality}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {availableStreamQualities.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (hlsRef.current) {
                        hlsRef.current.currentLevel = q.index !== undefined ? q.index : -1;
                        setCurrentStreamQuality(q.label);
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                      currentStreamQuality === q.label
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Local Cinema Audio Volume Slider */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Theatre Audio
              </span>
              <span className="font-mono text-slate-300 text-[10px]">
                {Math.round(movieVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={movieVolume}
              onChange={(e) => setMovieVolume(parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Active Tab Casting Floating HUD Badge */}
      {isCastingActive && !hudHidden && (
        <div
          data-testid="active-tab-casting-badge"
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-purple-950/90 border border-purple-500/60 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-white pointer-events-auto"
        >
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </div>
          <span className="font-bold">Tab Casting Active:</span>
          <span className="font-mono text-purple-200 truncate max-w-xs">
            {castingTabLabel || 'Browser Tab'}
          </span>
          <button
            onClick={stopTabCasting}
            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer transition shadow-xs"
          >
            Stop Casting
          </button>
        </div>
      )}

      {/* ============================================================================
          9. NEXUS FILM PORTAL MODAL (MY MEDIA, LOCAL UPLOADS, STREAMS, DISCOVER)
         ============================================================================ */}
      <NexusFilmPortalModal
        isOpen={filmPortalModalOpen || mediaGatewayModalOpen}
        onClose={() => {
          setFilmPortalModalOpen(false);
          setMediaGatewayModalOpen(false);
        }}
        currentRoom={room}
        canControlPlayback={canControlPlayback}
        onApplyMediaSource={(sourceConfig) => {
          handleApplyMediaSourceConfig(sourceConfig);
        }}
        onOpenBrowserUrl={(url) => {
          setFilmPortalModalOpen(false);
          setMediaGatewayModalOpen(false);
          navigateBrowserTo(url);
        }}
        authHeader={bearerToken ? `Bearer ${bearerToken}` : undefined}
        onStartTabCasting={startTabCasting}
        onStopTabCasting={stopTabCasting}
        isCastingActive={isCastingActive}
      />
      {/* ============================================================================
          9B. PROJECTION SCREEN FULLSCREEN OVERLAY
         ============================================================================ */}
      {isProjectionScreenFullscreen && (
        <div
          data-testid="projection-screen-fullscreen-overlay"
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden p-3 sm:p-5 pointer-events-auto select-none"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between bg-slate-950/85 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800 z-10">
            <div className="flex items-center gap-3">
              <span
                data-testid="fullscreen-role-badge"
                className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
                  isHost
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}
              >
                {isHost ? 'HOST' : 'VIEWER'}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {room.playback.mediaSource.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {room.playback.mediaSource.providerName} · {formattedSourceResolution} ·{' '}
                  {room.playback.mediaSource.aspectRatioLabel || '16:9'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Toggle Entire Theatre Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entire Theatre</span>
              </button>
              <button
                onClick={() => setIsProjectionScreenFullscreen(false)}
                data-testid="exit-projection-fullscreen-btn"
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <X className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Center Direct Mirror Video Container */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden py-2">
            {videoRef.current && (videoRef.current.src || videoRef.current.srcObject) ? (
              <video
                ref={(el) => {
                  if (el && videoRef.current && videoRef.current.srcObject) {
                    el.srcObject = videoRef.current.srcObject;
                  }
                }}
                src={videoRef.current.src || undefined}
                autoPlay
                playsInline
                controls={false}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl mx-auto"
                style={{
                  width: room.playback.pictureFitMode === 'fill' ? '100%' : 'auto',
                  height: room.playback.pictureFitMode === 'fill' ? '100%' : 'auto',
                }}
              />
            ) : (
              <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Tv className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No Movie Loaded</h3>
                <p className="text-xs text-slate-400">Open Film Portal to select a movie stream.</p>
              </div>
            )}
          </div>

          {/* Bottom Player Control Bar */}
          <div className="bg-slate-950/90 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 space-y-3 z-10 max-w-4xl mx-auto w-full">
            {/* Timeline Progress Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">
                  {Math.floor((videoRef.current?.currentTime || room.playback.positionSeconds) / 60)}:
                  {String(Math.floor((videoRef.current?.currentTime || room.playback.positionSeconds) % 60)).padStart(2, '0')}
                </span>
                <span className="text-slate-400">
                  {Math.floor((room.playback.durationSeconds || 0) / 60)}:
                  {String(Math.floor((room.playback.durationSeconds || 0) % 60)).padStart(2, '0')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={room.playback.durationSeconds || 100}
                value={videoRef.current?.currentTime || room.playback.positionSeconds}
                disabled={!canControlPlayback}
                onChange={(e) => {
                  const targetSec = parseFloat(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = targetSec;
                  dispatchRoomAction({ type: 'playback', action: 'seek', positionSeconds: targetSec });
                }}
                className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Main Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {canControlPlayback ? (
                  <button
                    onClick={() =>
                      dispatchRoomAction({
                        type: 'playback',
                        action: room.playback.isPlaying ? 'pause' : 'play',
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {room.playback.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{room.playback.isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => dispatchRoomAction({ type: 'playback', action: 'request_control' })}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs cursor-pointer"
                  >
                    Request Control
                  </button>
                )}

                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) video.currentTime = computeAuthoritativePlaybackPosition(room);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Resynchronize timeline to host position"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resync</span>
                </button>
              </div>

              {/* Local Volume & Mute */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMovieVolume((v) => (v > 0 ? 0 : 0.85))}
                  className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                >
                  {movieVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={movieVolume}
                  onChange={(e) => setMovieVolume(parseFloat(e.target.value))}
                  className="w-28 accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          10. SETTINGS & CUSTOMISATION MODAL (GRAPHICS, SENSITIVITY, AUDIO, HUD, AVATAR)
         ============================================================================ */}
      {settingsModalOpen && (
        <div
          data-testid="cinema-settings-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
                  3D Engine & Controls Configuration
                </span>
                <h3 className="text-base font-bold text-white">
                  Theatre Settings & Customisation
                </h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                data-testid="close-cinema-settings-btn"
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Graphics & Performance */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-white">Graphics Quality & Performance</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as GraphicsQualityPreset[]).map((q) => (
                    <button
                      key={q}
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, graphicsQuality: q }))
                      }
                      data-testid={`graphics-preset-${q}`}
                      className={`py-2 rounded-xl text-xs font-mono uppercase border transition cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-blue-600 border-blue-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <label className="flex items-center justify-between text-xs text-slate-300 pt-1 cursor-pointer">
                  <span>Low-Latency Performance Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.performanceMode}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        performanceMode: e.target.checked,
                      }))
                    }
                  />
                </label>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Camera Field of View (FOV)</span>
                    <span className="font-mono">{settings.cameraFov}°</span>
                  </div>
                  <input
                    type="range"
                    min={45}
                    max={75}
                    value={settings.cameraFov}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        cameraFov: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Joystick, Camera & Movement Sensitivity */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-white">Control & Camera Sensitivity</p>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Virtual Joystick Sensitivity</span>
                    <span className="font-mono">{settings.joystickSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.1}
                    value={settings.joystickSensitivity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        joystickSensitivity: Number(e.target.value),
                      }))
                    }
                    data-testid="slider-joystick-sensitivity"
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Camera Rotation Sensitivity</span>
                    <span className="font-mono">{settings.cameraSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.1}
                    value={settings.cameraSensitivity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        cameraSensitivity: Number(e.target.value),
                      }))
                    }
                    data-testid="slider-camera-sensitivity"
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Movement Speed Multiplier</span>
                    <span className="font-mono">{settings.movementSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.1}
                    value={settings.movementSensitivity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        movementSensitivity: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Sound, Ambience & HUD Opacity */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-white">Audio Mix & Interface Opacity</p>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Master Theatre & Movie Volume</span>
                    <span className="font-mono">{Math.round(settings.soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.soundVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        soundVolume: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Ambience & Spatial Effects Volume</span>
                    <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.musicVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        musicVolume: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>HUD Translucent Opacity</span>
                    <span className="font-mono">{Math.round(settings.hudOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={1.0}
                    step={0.05}
                    value={settings.hudOpacity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        hudOpacity: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Quick Character & Camera Customisation */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-white">Camera Mode & HUD Visibility</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'third_person_follow', label: '3rd Person' },
                      { id: 'cinema_screen_view', label: 'Screen View' },
                      { id: 'free_orbit', label: 'Free Orbit' },
                    ] as const
                  ).map((cm) => (
                    <button
                      key={cm.id}
                      onClick={() => setCameraMode(cm.id)}
                      className={`py-2 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                        cameraMode === cm.id
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSettings(DEFAULT_CINEMA_SETTINGS);
                      handleResetCamera();
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={() => {
                      setSettingsModalOpen(false);
                      setHudHidden(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Hide All HUD
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM SUBTITLES OVERLAY */}
      {activeSubtitleText && subtitleStyle.activeTrackId !== 'off' && (
        <div
          data-testid="subtitle-overlay"
          className={`fixed inset-x-0 z-40 flex justify-center pointer-events-none transition-all ${
            subtitleStyle.position === 'top' ? 'top-16' : 'bottom-20 sm:bottom-28'
          }`}
        >
          <div
            style={{
              backgroundColor: subtitleStyle.backgroundColor,
              color: subtitleStyle.textColor,
            }}
            className={`px-4 py-2 rounded-xl text-center max-w-2xl font-sans font-semibold drop-shadow-md shadow-2xl transition-all ${
              subtitleStyle.fontSize === 'xs'
                ? 'text-xs'
                : subtitleStyle.fontSize === 'sm'
                ? 'text-sm'
                : subtitleStyle.fontSize === 'lg'
                ? 'text-lg'
                : subtitleStyle.fontSize === 'xl'
                ? 'text-xl'
                : 'text-base'
            }`}
          >
            {activeSubtitleText}
          </div>
        </div>
      )}

      {/* STREAMING DIAGNOSTICS STATS OVERLAY */}
      {diagnosticsVisible && (
        <MediaDiagnosticsOverlay
          metrics={diagnosticsMetrics}
          onClose={() => setDiagnosticsVisible(false)}
        />
      )}

      {/* MEDIA STREAMING SETTINGS 2.0 MODAL */}
      {mediaSettingsOpen && (
        <MediaSettingsModal
          onClose={() => setMediaSettingsOpen(false)}
          qualityLevels={availableStreamQualities}
          selectedQuality={currentStreamQuality}
          onSelectQuality={(q) => {
            setCurrentStreamQuality(q);
            if (hlsRef.current) {
              const lvlIdx = availableStreamQualities.findIndex((l) => `${l.height}p` === q || l.label === q);
              hlsRef.current.currentLevel = lvlIdx !== -1 ? lvlIdx : -1;
            }
          }}
          pictureFitMode={room.playback.pictureFitMode || 'fit'}
          onSelectFitMode={(m) =>
            dispatchRoomAction({ type: 'playback', action: 'set_fit_mode', pictureFitMode: m })
          }
          playbackSpeed={room.playback.playbackSpeed || 1.0}
          onSelectPlaybackSpeed={(s) =>
            dispatchRoomAction({ type: 'playback', action: 'set_speed', playbackSpeed: s })
          }
          subtitleTracks={[{ id: 'custom', label: 'Custom SRT / VTT Track', language: 'en' }]}
          subtitleStyle={subtitleStyle}
          onUpdateSubtitleStyle={(s) => setSubtitleStyle((prev) => ({ ...prev, ...s }))}
          onUploadCustomSubtitle={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = String(e.target?.result || '');
              const cues = parseSrtToCues(text);
              setCustomSubtitleCues(cues);
              setSubtitleStyle((prev) => ({ ...prev, activeTrackId: 'custom' }));
              notify(`Loaded ${cues.length} subtitle cues from ${file.name}!`, 'success');
            };
            reader.readAsText(file);
          }}
          viewingMode={viewingMode}
          onSelectViewingMode={(mode) => {
            setViewingMode(mode);
            if (mode === 'cinema_focus') setCameraMode('cinema_screen_view');
            else if (mode === 'avatar_follow') setCameraMode('third_person_follow');
          }}
        />
      )}
    </div>
  );
}
