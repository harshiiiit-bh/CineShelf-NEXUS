import {
  CharacterAccessoryId,
  CharacterAnimationState,
  CharacterAppearance,
  CharacterHairId,
  CharacterOutfitId,
  CharacterStyleId,
  MediaSourceConfig,
  RefreshmentItemType,
  RoomCapacityOption,
  RoomChatMessage,
  RoomMemberRole,
  RoomParticipantState,
  SocialCinemaRoom,
  SocialEmoteId,
  TheatreThemeId,
} from '../types/nexus';

// Unambiguous alphabet (no 0/O/1/I/L)
const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateSecureInviteCode(length = 9): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * INVITE_ALPHABET.length);
    chars.push(INVITE_ALPHABET[idx]);
  }
  return chars.join('');
}

export interface TheatreThemeSpec {
  id: TheatreThemeId;
  name: string;
  tagline: string;
  wallColor: string;
  floorColor: string;
  aisleGlowColor: string;
  seatFabricColor: string;
  seatFrameColor: string;
  trimMetalColor: string;
  sconceLightColor: string;
  ceilingLightColor: string;
  ambientHex: number;
  fogHex: number;
}

export const THEATRE_THEMES: Record<TheatreThemeId, TheatreThemeSpec> = {
  classic_cinema: {
    id: 'classic_cinema',
    name: 'Classic Cinema',
    tagline: 'Crimson velvet seats, warm brass wall sconces, and mahogany acoustic panels',
    wallColor: '#1E1116',
    floorColor: '#140B0E',
    aisleGlowColor: '#F59E0B',
    seatFabricColor: '#881337',
    seatFrameColor: '#27171C',
    trimMetalColor: '#D97706',
    sconceLightColor: '#FBBF24',
    ceilingLightColor: '#FDE68A',
    ambientHex: 0x26171e,
    fogHex: 0x0b0709,
  },
  modern_multiplex: {
    id: 'modern_multiplex',
    name: 'Modern Multiplex',
    tagline: 'Acoustic slate baffling, electric blue LED aisle strips, and ergonomic stadium seating',
    wallColor: '#0F172A',
    floorColor: '#090D16',
    aisleGlowColor: '#3B82F6',
    seatFabricColor: '#1E293B',
    seatFrameColor: '#0F172A',
    trimMetalColor: '#64748B',
    sconceLightColor: '#60A5FA',
    ceilingLightColor: '#93C5FD',
    ambientHex: 0x162032,
    fogHex: 0x070b14,
  },
  luxury_gold: {
    id: 'luxury_gold',
    name: 'Luxury Gold Theatre',
    tagline: 'Anisotropic brushed gold trim, champagne lighting, and plush leather recliners',
    wallColor: '#1C160D',
    floorColor: '#120E08',
    aisleGlowColor: '#FBBF24',
    seatFabricColor: '#78350F',
    seatFrameColor: '#292014',
    trimMetalColor: '#F59E0B',
    sconceLightColor: '#FDE047',
    ceilingLightColor: '#FEF08A',
    ambientHex: 0x292114,
    fogHex: 0x0c0905,
  },
  retro_cinema: {
    id: 'retro_cinema',
    name: 'Retro Cinema',
    tagline: '1970s grindhouse neon accents, warm magenta signage, and vintage patterned carpet',
    wallColor: '#1E1024',
    floorColor: '#130918',
    aisleGlowColor: '#EC4899',
    seatFabricColor: '#701A75',
    seatFrameColor: '#2E1035',
    trimMetalColor: '#F43F5E',
    sconceLightColor: '#F472B6',
    ceilingLightColor: '#FBCFE8',
    ambientHex: 0x281530,
    fogHex: 0x0d0611,
  },
  futuristic_scifi: {
    id: 'futuristic_scifi',
    name: 'Futuristic Sci-Fi Theatre',
    tagline: 'Orbital deck architecture, cyan holographic panels, and zero-bezel projection bay',
    wallColor: '#081C24',
    floorColor: '#051016',
    aisleGlowColor: '#06B6D4',
    seatFabricColor: '#155E75',
    seatFrameColor: '#082F49',
    trimMetalColor: '#22D3EE',
    sconceLightColor: '#38BDF8',
    ceilingLightColor: '#A5F3FC',
    ambientHex: 0x0f2936,
    fogHex: 0x040c11,
  },
  private_vip: {
    id: 'private_vip',
    name: 'Private VIP Screening Room',
    tagline: 'Intimate walnut-panelled director screening room with emerald club chairs',
    wallColor: '#0D1F18',
    floorColor: '#081410',
    aisleGlowColor: '#10B981',
    seatFabricColor: '#065F46',
    seatFrameColor: '#112A22',
    trimMetalColor: '#D97706',
    sconceLightColor: '#34D399',
    ceilingLightColor: '#A7F3D0',
    ambientHex: 0x132a21,
    fogHex: 0x060f0c,
  },
};

export interface SeatPositionSpec {
  seatIndex: number;
  rowLabel: string;
  seatNumber: number;
  x: number;
  y: number;
  z: number;
}

// 36 elevated stadium seats across 4 rows (Rows A, B, C, D) with central and side aisles
export const THEATRE_SEAT_LAYOUT: SeatPositionSpec[] = (() => {
  const seats: SeatPositionSpec[] = [];
  const rows = [
    { label: 'A', z: -4.2, y: 0.35 },
    { label: 'B', z: -0.8, y: 0.85 },
    { label: 'C', z: 2.6, y: 1.35 },
    { label: 'D', z: 6.0, y: 1.85 },
  ];
  // 9 seats per row: 3 left (-8.5, -6.7, -4.9), 3 center (-1.8, 0, 1.8), 3 right (4.9, 6.7, 8.5)
  const xCoords = [-8.5, -6.7, -4.9, -1.8, 0.0, 1.8, 4.9, 6.7, 8.5];
  let idx = 0;
  for (const r of rows) {
    xCoords.forEach((x, sIdx) => {
      seats.push({
        seatIndex: idx++,
        rowLabel: r.label,
        seatNumber: sIdx + 1,
        x,
        y: r.y,
        z: r.z,
      });
    });
  }
  return seats;
})();

const STYLES: CharacterStyleId[] = [
  'modern_casual',
  'cartoon_stylised',
  'stylised_game',
  'futuristic_cyber',
  'classic_cinema',
];
const HAIRS: CharacterHairId[] = [
  'short_crop',
  'wavy_part',
  'cyber_undercut',
  'bun_classic',
  'spiky',
];
const OUTFITS: CharacterOutfitId[] = [
  'hoodie_denim',
  'tuxedo_velvet',
  'neon_jacket',
  'retro_varsity',
  'vip_blazer',
];
const ACCESSORIES: CharacterAccessoryId[] = [
  'none',
  '3d_glasses',
  'cinema_beret',
  'gold_headset',
  'visor',
];
const PRIMARY_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#EF4444',
  '#14B8A6',
];
const SECONDARY_PALETTE = [
  '#1E293B',
  '#0F172A',
  '#312E81',
  '#3F3F46',
  '#1F2937',
  '#27272A',
];

export function generateDefaultAppearanceForUid(
  uid: string,
  displayName: string
): CharacterAppearance {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Avalanche mix so 1-char differences spread across all bit positions
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;

  const isFemale = (h % 2) === 1;
  const skinTones = ['#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#78350F', '#FEF3C7'];
  const hairColors = ['#1E1B4B', '#18181B', '#78350F', '#B45309', '#D97706', '#F59E0B', '#E11D48', '#2563EB'];
  const eyeColors = ['#0F172A', '#1E3A8A', '#065F46', '#92400E', '#4C1D95'];

  return {
    gender: isFemale ? 'female' : 'male',
    style: STYLES[h % STYLES.length],
    hairStyle: HAIRS[(h >>> 3) % HAIRS.length],
    outfit: OUTFITS[(h >>> 6) % OUTFITS.length],
    primaryColor: PRIMARY_PALETTE[(h >>> 9) % PRIMARY_PALETTE.length],
    secondaryColor: SECONDARY_PALETTE[(h >>> 12) % SECONDARY_PALETTE.length],
    topColor: PRIMARY_PALETTE[(h >>> 9) % PRIMARY_PALETTE.length],
    pantsColor: SECONDARY_PALETTE[(h >>> 12) % SECONDARY_PALETTE.length],
    shoesColor: '#0F172A',
    skinTone: skinTones[(h >>> 5) % skinTones.length],
    hairColor: hairColors[(h >>> 7) % hairColors.length],
    eyeColor: eyeColors[(h >>> 11) % eyeColors.length],
    accessory: ACCESSORIES[(h >>> 15) % ACCESSORIES.length],
    displayName: displayName || 'Cinephile',
  };
}

// Playable theatre boundaries & obstacle collision boxes
export const THEATRE_BOUNDS = {
  minX: -13.0,
  maxX: 13.0,
  minZ: -10.8, // In front of raised screen stage
  maxZ: 14.8,  // Rear lobby wall
};

// AABB obstacles (Popcorn Counter on rear-left, Cold Drinks Counter on rear-right, Stage front)
export const THEATRE_OBSTACLE_BOXES = [
  // Left Popcorn & Nachos Counter
  { name: 'popcorn_counter', minX: -10.2, maxX: -3.4, minZ: 11.8, maxZ: 14.9 },
  // Right Cold-Drinks Fountain Counter
  { name: 'drinks_counter', minX: 3.4, maxX: 10.2, minZ: 11.8, maxZ: 14.9 },
];

export function getFloorElevationAtZ(z: number): number {
  // Stadium seating slope between Z = -5.0 and Z = 7.5, flat in front screen pit and rear lobby
  if (z <= -5.0) return 0;
  if (z >= 8.0) return 1.9;
  const t = (z - -5.0) / (8.0 - -5.0);
  return Number((t * 1.9).toFixed(3));
}

export const POPCORN_COUNTER_ZONE = { x: -6.8, z: 13.2 };
export const COLD_DRINK_COUNTER_ZONE = { x: 6.8, z: 13.2 };
export const BROWSER_KIOSK_ZONE = { x: -2.2, z: 13.6 };
export const ENTRANCE_DOOR_ZONE = { x: -10.8, z: 14.2 };
export const EXIT_DOOR_ZONE = { x: 10.8, z: 14.2 };

export function getNearestInteractableZone(pos: {
  x: number;
  z: number;
}): 'popcorn_counter' | 'drink_counter' | 'browser_kiosk' | 'exit_door' | 'seat' | 'none' {
  // Check proximity to Rear Lobby Browser Kiosk (X in [-3.4, -0.8], Z in [11.6, 14.8])
  if (pos.x >= -3.4 && pos.x <= -0.8 && pos.z >= 11.6 && pos.z <= 14.8) {
    return 'browser_kiosk';
  }
  // Check proximity to Rear Exit Door (X in [9.2, 12.2], Z in [12.5, 15.0])
  if (pos.x >= 9.2 && pos.x <= 12.2 && pos.z >= 12.5 && pos.z <= 15.0) {
    return 'exit_door';
  }
  const res = getInteractiveZoneAtPosition(pos.x, pos.z);
  if (res.zone === 'drinks_counter') return 'drink_counter';
  return res.zone;
}

export function getInteractiveZoneAtPosition(
  x: number,
  z: number
): {
  zone: 'popcorn_counter' | 'drinks_counter' | 'seat' | 'none';
  nearestSeat?: SeatPositionSpec;
} {
  // Check proximity to Popcorn Counter front/side (X in [-10.8, -2.8], Z in [9.8, 12.5])
  if (x >= -10.8 && x <= -2.8 && z >= 9.8 && z <= 12.5) {
    return { zone: 'popcorn_counter' };
  }
  // Check proximity to Cold-Drinks Counter front/side (X in [2.8, 10.8], Z in [9.8, 12.5])
  if (x >= 2.8 && x <= 10.8 && z >= 9.8 && z <= 12.5) {
    return { zone: 'drinks_counter' };
  }
  // Check proximity to any cinema seat (within 1.35m)
  let bestSeat: SeatPositionSpec | undefined;
  let bestDistSq = 1.35 * 1.35;
  for (const seat of THEATRE_SEAT_LAYOUT) {
    const dx = x - seat.x;
    const dz = z - seat.z;
    const dSq = dx * dx + dz * dz;
    if (dSq <= bestDistSq) {
      bestDistSq = dSq;
      bestSeat = seat;
    }
  }
  if (bestSeat) {
    return { zone: 'seat', nearestSeat: bestSeat };
  }
  return { zone: 'none' };
}

export interface CameraRelativeMovementVector {
  /** Normalized horizontal joystick input in [-1, 1] (-1 = left, +1 = right) */
  joystickX: number;
  /** Normalized vertical joystick input in [-1, 1] (-1 = up/forward, +1 = down/backward) */
  joystickY: number;
  /** 3D world X movement direction relative to cameraYaw */
  worldX: number;
  /** 3D world Z movement direction relative to cameraYaw */
  worldZ: number;
  /** Clamped movement magnitude in [0, 1.25] */
  magnitude: number;
  /** Resulting 3D character heading angle in radians */
  headingRad: number;
}

/**
 * Maps 2D mobile touch/pointer joystick vectors (x, y) in [-1, 1] into 3D world space (worldX, worldZ)
 * relative to the active camera horizontal orientation (cameraYaw in radians).
 */
export function mapJoystickVectorToCamera3D(
  joystickX: number,
  joystickY: number,
  cameraYaw = 0,
  sensitivity = 1.0
): CameraRelativeMovementVector {
  const safeX = Number.isFinite(joystickX) ? Math.max(-1, Math.min(1, joystickX)) : 0;
  const safeY = Number.isFinite(joystickY) ? Math.max(-1, Math.min(1, joystickY)) : 0;
  const safeSens = Number.isFinite(sensitivity) ? Math.max(0.1, Math.min(2.5, sensitivity)) : 1.0;

  const rawMag = Math.hypot(safeX, safeY);
  // Apply small radial deadzone (0.04) to prevent micro-drift on touch screens
  if (rawMag < 0.04) {
    return {
      joystickX: 0,
      joystickY: 0,
      worldX: 0,
      worldZ: 0,
      magnitude: 0,
      headingRad: 0,
    };
  }

  const clampedUnitMag = Math.min(1, rawMag);
  const normX = (safeX / rawMag) * clampedUnitMag;
  const normY = (safeY / rawMag) * clampedUnitMag;
  const scaledMag = Math.min(1.25, clampedUnitMag * safeSens);

  const localX = (normX / clampedUnitMag) * scaledMag;
  const localZ = (normY / clampedUnitMag) * scaledMag;

  const cosYaw = Math.cos(cameraYaw);
  const sinYaw = Math.sin(cameraYaw);

  const worldX = Number((localX * cosYaw + localZ * sinYaw).toFixed(4));
  const worldZ = Number((-localX * sinYaw + localZ * cosYaw).toFixed(4));
  const headingRad = Number(Math.atan2(worldX, worldZ).toFixed(4));

  return {
    joystickX: Number(normX.toFixed(3)),
    joystickY: Number(normY.toFixed(3)),
    worldX,
    worldZ,
    magnitude: Number(scaledMag.toFixed(3)),
    headingRad,
  };
}

export function resolveTheatreMovement(
  currentPos: { x: number; y: number; z: number },
  targetPos: { x: number; z: number },
  otherParticipants: { uid: string; position: { x: number; y: number; z: number }; seatIndex: number | null }[],
  selfUid: string
): { x: number; y: number; z: number; collidedWithWallOrCounter: boolean } {
  let x = targetPos.x;
  let z = targetPos.z;
  let collided = false;

  // 1. Clamp to outer theatre room walls
  if (x < THEATRE_BOUNDS.minX) {
    x = THEATRE_BOUNDS.minX;
    collided = true;
  } else if (x > THEATRE_BOUNDS.maxX) {
    x = THEATRE_BOUNDS.maxX;
    collided = true;
  }

  if (z < THEATRE_BOUNDS.minZ) {
    z = THEATRE_BOUNDS.minZ;
    collided = true;
  } else if (z > THEATRE_BOUNDS.maxZ) {
    z = THEATRE_BOUNDS.maxZ;
    collided = true;
  }

  // 2. Check AABB collision against Refreshment Counters
  const radius = 0.45;
  for (const box of THEATRE_OBSTACLE_BOXES) {
    if (
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ
    ) {
      collided = true;
      // Push out along shallowest penetration axis
      const overlapLeft = x + radius - box.minX;
      const overlapRight = box.maxX - (x - radius);
      const overlapFront = z + radius - box.minZ;
      const overlapBack = box.maxZ - (z - radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);
      if (minOverlap === overlapFront) z = box.minZ - radius;
      else if (minOverlap === overlapBack) z = box.maxZ + radius;
      else if (minOverlap === overlapLeft) x = box.minX - radius;
      else x = box.maxX + radius;
    }
  }

  // 3. Check seat row solid base collision (unless walking in aisles: X in [-3.4, -2.5] or [2.5, 3.4] or |X| > 9.3)
  for (const seat of THEATRE_SEAT_LAYOUT) {
    const dx = x - seat.x;
    const dz = z - seat.z;
    const distSq = dx * dx + dz * dz;
    const minSeatDist = 0.58;
    if (distSq < minSeatDist * minSeatDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const push = (minSeatDist - dist) / dist;
      x += dx * push;
      z += dz * push;
      collided = true;
    }
  }

  // 4. Character-to-Character separation so avatars never walk through one another
  const minPlayerSeparation = 0.65;
  for (const other of otherParticipants) {
    if (other.uid === selfUid || other.seatIndex !== null) continue;
    const dx = x - other.position.x;
    const dz = z - other.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minPlayerSeparation * minPlayerSeparation) {
      if (distSq < 0.0001) {
        x += 0.65;
      } else {
        const dist = Math.sqrt(distSq);
        const push = (minPlayerSeparation - dist) / dist;
        x += dx * push;
        z += dz * push;
      }
      collided = true;
    }
  }

  // Re-clamp after pushes
  x = Math.max(THEATRE_BOUNDS.minX, Math.min(THEATRE_BOUNDS.maxX, x));
  z = Math.max(THEATRE_BOUNDS.minZ, Math.min(THEATRE_BOUNDS.maxZ, z));
  const y = getFloorElevationAtZ(z);

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    collidedWithWallOrCounter: collided,
  };
}

// ============================================================================
// NEXUS MEDIA GATEWAY — AUTHORISED SOURCE VALIDATOR
// ============================================================================

export const CURATED_DIRECT_CINEMA_STREAMS: MediaSourceConfig[] = [
  {
    id: 'blender-tears-of-steel',
    title: 'Tears of Steel (Open Sci-Fi Cinema Showcase · 734s)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sourceType: 'direct_video',
    providerName: 'Direct HTTPS MP4 (CORS Authorised)',
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: 'Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync.',
    subtitleTrackLabel: 'English (CC)',
  },
  {
    id: 'blender-sintel',
    title: 'Sintel (Open Fantasy Featurette · 888s)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    sourceType: 'direct_video',
    providerName: 'Direct HTTPS MP4 (CORS Authorised)',
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: 'Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync.',
    subtitleTrackLabel: 'English (CC)',
  },
  {
    id: 'blender-big-buck-bunny',
    title: 'Big Buck Bunny (Open Animated Short · 596s)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sourceType: 'direct_video',
    providerName: 'Direct HTTPS MP4 (CORS Authorised)',
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: 'Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync.',
  },
];

const OFFICIAL_EMBED_ALLOWLIST = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
];

const KNOWN_UNSUPPORTED_STREAMING_DOMAINS = [
  'bingr.one',
  'www.bingr.one',
  'cinejoy',
  'cinejoy.to',
  'fmovies',
  'soap2day',
  '123movies',
  'netflix.com',
  'www.netflix.com',
  'primevideo.com',
  'www.primevideo.com',
  'hotstar.com',
  'www.hotstar.com',
];

export function validateAndClassifyMediaSource(
  rawUrl: string,
  customTitle?: string
): MediaSourceConfig {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return CURATED_DIRECT_CINEMA_STREAMS[0];
  }

  // Support local browser blob object URLs (for personal local-first media playback)
  if (trimmed.startsWith('blob:')) {
    return {
      id: `local-${Date.now()}`,
      url: trimmed,
      title: customTitle || 'Local Video File',
      sourceType: 'local_file',
      providerName: 'Personal Device Media',
      isAuthorized: true,
      supportsAutoSync: true,
      isLocalFile: true,
      compatibilityMessage:
        'Local device video file verified. Decoded natively via browser engine without external network dependencies.',
    };
  }

  // Support Room-Scoped Shared Media Stream endpoint
  if (trimmed.includes('/api/social/rooms/') && trimmed.includes('/media/stream')) {
    return {
      id: `room-shared-${Date.now()}`,
      url: trimmed,
      title: customTitle || 'Room Shared Movie Stream',
      sourceType: 'room_shared_file',
      providerName: 'Host Shared Media Server',
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage:
        'Host shared video stream verified. Multi-client synchronized HTTP 206 partial streaming enabled.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      id: `invalid-${Date.now()}`,
      url: trimmed,
      title: customTitle || 'Invalid URL',
      sourceType: 'unsupported_webpage',
      providerName: 'Unverified URL',
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage:
        'This website does not support integrated playback or synchronised controls in NEXUS. Please enter a valid HTTPS media URL.',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    return {
      id: `insecure-${Date.now()}`,
      url: trimmed,
      title: customTitle || parsed.hostname,
      sourceType: 'unsupported_webpage',
      providerName: parsed.hostname,
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage:
        'This website does not support integrated playback or synchronised controls in NEXUS. Only secure HTTPS sources are permitted.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const pathLower = parsed.pathname.toLowerCase();

  // Check explicitly named third-party sites or DRM/frame-blocked portals (e.g. bingr.one, cinejoy)
  if (
    KNOWN_UNSUPPORTED_STREAMING_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`) || host.includes('bingr') || host.includes('cinejoy')
    )
  ) {
    return {
      id: `unsupported-${Date.now()}`,
      url: trimmed,
      title: customTitle || `External Webpage (${host})`,
      sourceType: 'unsupported_webpage',
      providerName: host,
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage:
        'This website does not support integrated playback or synchronised controls in NEXUS.',
    };
  }

  // Type A: Direct HTTPS video files (.mp4, .webm, .ogg, .mov, .m4v, .mkv)
  if (
    pathLower.endsWith('.mp4') ||
    pathLower.endsWith('.webm') ||
    pathLower.endsWith('.ogg') ||
    pathLower.endsWith('.mov') ||
    pathLower.endsWith('.m4v') ||
    pathLower.endsWith('.mkv')
  ) {
    return {
      id: `direct-${Date.now()}`,
      url: trimmed,
      title: customTitle || parsed.pathname.split('/').pop() || 'Direct HTTPS Video',
      sourceType: 'direct_video',
      providerName: `Direct HTTPS Media (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage:
        'Direct HTTPS media stream verified. Supports 3D screen VideoTexture projection and authoritative timeline sync.',
    };
  }

  // Type A2: HLS Streams (.m3u8)
  if (pathLower.endsWith('.m3u8')) {
    return {
      id: `hls-${Date.now()}`,
      url: trimmed,
      title: customTitle || 'HLS Adaptive Stream',
      sourceType: 'hls_stream',
      providerName: `HLS Stream (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage:
        'HLS (.m3u8) adaptive stream verified via hls.js adapter with authoritative timeline sync.',
    };
  }

  // Type A3: MPEG-DASH Streams (.mpd)
  if (pathLower.endsWith('.mpd')) {
    return {
      id: `dash-${Date.now()}`,
      url: trimmed,
      title: customTitle || 'MPEG-DASH Stream',
      sourceType: 'dash_stream',
      providerName: `DASH Stream (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage:
        'MPEG-DASH (.mpd) stream detected with authoritative timeline sync.',
    };
  }

  // Type B: Strictly allowlisted official embeddable providers
  if (OFFICIAL_EMBED_ALLOWLIST.includes(host)) {
    return {
      id: `embed-${Date.now()}`,
      url: trimmed,
      title: customTitle || `Official Embed (${host})`,
      sourceType: 'official_embed',
      providerName: `Official Embed Adapter (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage: `Official embeddable player (${host}) verified against allowlist.`,
    };
  }

  // Type C: Arbitrary external webpage without verified embedding headers or player API
  return {
    id: `webpage-${Date.now()}`,
    url: trimmed,
    title: customTitle || `External Webpage (${host})`,
    sourceType: 'unsupported_webpage',
    providerName: host,
    isAuthorized: false,
    supportsAutoSync: false,
    manualCountdownFallbackOnly: true,
    compatibilityMessage:
      'This website does not support integrated playback or synchronised controls in NEXUS.',
  };
}

// ============================================================================
// AUTHORITATIVE SERVER ROOM & SYNCHRONISATION ENGINE
// ============================================================================

export function computeAuthoritativePlaybackPosition(
  room: SocialCinemaRoom,
  nowMs: number = Date.now()
): number {
  const pb = room.playback;
  if (!pb.isPlaying) {
    return pb.positionSeconds;
  }
  const speed = pb.playbackSpeed || 1.0;
  const elapsedSec = Math.max(0, ((nowMs - pb.lastSyncServerTimestampMs) / 1000) * speed);
  const pos = pb.positionSeconds + elapsedSec;
  if (pb.durationSeconds > 0 && pos >= pb.durationSeconds) {
    return pb.durationSeconds;
  }
  return Number(pos.toFixed(3));
}

export class SocialCinemaServerManager {
  private rooms = new Map<string, SocialCinemaRoom>();
  private inviteIndex = new Map<string, string>(); // inviteCode -> roomId
  private joinAttemptTracker = new Map<string, { count: number; windowStartMs: number }>();

  public createRoom(params: {
    hostUid: string;
    hostName: string;
    roomName: string;
    roomMode?: 'bot_sandbox' | 'friends';
    theme?: TheatreThemeId;
    capacity?: RoomCapacityOption;
    appearance?: CharacterAppearance;
    inviteTtlMs?: number;
  }): SocialCinemaRoom {
    const {
      hostUid,
      hostName,
      roomName,
      roomMode = 'friends',
      theme = 'classic_cinema',
      capacity = 35,
      appearance,
      inviteTtlMs = 1000 * 60 * 60 * 6, // 6 hours default
    } = params;

    if (!hostUid || !hostUid.trim()) {
      throw new Error('AUTH_REQUIRED: Authenticated UID required to create a room.');
    }

    const validCapacities: RoomCapacityOption[] = [20, 25, 30, 35];
    const safeCapacity: RoomCapacityOption = validCapacities.includes(capacity)
      ? capacity
      : 35;

    const nowMs = Date.now();
    const roomId = `room_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    let inviteCode = generateSecureInviteCode(9);
    while (this.inviteIndex.has(inviteCode)) {
      inviteCode = generateSecureInviteCode(9);
    }

    const hostAppearance =
      appearance || generateDefaultAppearanceForUid(hostUid, hostName);

    const initialSpawn = resolveTheatreMovement(
      { x: 0, y: 1.9, z: 8.8 },
      { x: 0, z: 8.8 },
      [],
      hostUid
    );

    const hostParticipant: RoomParticipantState = {
      uid: hostUid,
      displayName: hostName || hostAppearance.displayName,
      role: 'host',
      appearance: hostAppearance,
      position: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
      rotationY: Math.PI, // Facing toward the front screen (-Z)
      animation: 'idle',
      holdingItem: 'none',
      itemPortionsRemaining: 0,
      seatIndex: null,
      activeEmote: null,
      emoteExpiresAtMs: null,
      isMuted: true, // Voice disabled by default until user explicitly enables it
      isHostMuted: false,
      isSpeaking: false,
      voiceMode: 'off',
      isBuffering: false,
      joinedAtMs: nowMs,
      lastHeartbeatMs: nowMs,
    };

    const participantsMap: Record<string, RoomParticipantState> = {
      [hostUid]: hostParticipant,
    };

    // For Solo & AI Bot sandbox rooms, pre-populate 4 friendly AI Bots in the auditorium
    if (roomMode === 'bot_sandbox') {
      const botProfiles = [
        { uid: 'bot_aria', name: 'AI Bot · Aria', seatIdx: 12, item: 'popcorn_butter' as RefreshmentItemType },
        { uid: 'bot_kabir', name: 'AI Bot · Kabir', seatIdx: 14, item: 'drink_cola' as RefreshmentItemType },
        { uid: 'bot_nova', name: 'AI Bot · Nova', seatIdx: 22, item: 'popcorn_caramel' as RefreshmentItemType },
        { uid: 'bot_zane', name: 'AI Bot · Zane', seatIdx: null, item: 'none' as RefreshmentItemType },
      ];
      for (const b of botProfiles) {
        const botApp = generateDefaultAppearanceForUid(b.uid, b.name);
        const seatSpec = b.seatIdx !== null ? THEATRE_SEAT_LAYOUT[b.seatIdx] : null;
        participantsMap[b.uid] = {
          uid: b.uid,
          displayName: b.name,
          role: 'member',
          appearance: botApp,
          position: seatSpec
            ? { x: seatSpec.x, y: seatSpec.y, z: seatSpec.z }
            : { x: -4.2, y: 1.9, z: 10.4 },
          rotationY: seatSpec ? 0 : Math.PI,
          animation: seatSpec ? 'sitting' : 'idle',
          holdingItem: b.item,
          itemPortionsRemaining: b.item === 'none' ? 0 : 5,
          seatIndex: b.seatIdx,
          activeEmote: null,
          emoteExpiresAtMs: null,
          isMuted: true,
          isHostMuted: false,
          isSpeaking: false,
          voiceMode: 'off',
          isBuffering: false,
          isBot: true,
          joinedAtMs: nowMs,
          lastHeartbeatMs: nowMs,
        };
      }
    }

    const room: SocialCinemaRoom = {
      roomId,
      roomName: (roomName || `${hostName}'s Private 3D Cinema`).slice(0, 80),
      roomMode,
      hostUid,
      hostName,
      theme,
      capacity: safeCapacity,
      isPrivate: true,
      isLocked: false,
      chatRestricted: false,
      isClosed: false,
      inviteCode,
      inviteExpiresAtMs: nowMs + inviteTtlMs,
      inviteRevoked: false,
      playback: {
        mediaSource: CURATED_DIRECT_CINEMA_STREAMS[0],
        isPlaying: false,
        positionSeconds: 0,
        durationSeconds: 734,
        lastSyncServerTimestampMs: nowMs,
        revision: 1,
        hostUid,
        coHostUids: [],
        controlsLocked: true,
        subtitleTrack: 'English (CC)',
        manualCountdownStartedAtMs: null,
        controlRequests: [],
      },
      participants: participantsMap,
      messages: [
        {
          id: `msg_welcome_${nowMs}`,
          roomId,
          uid: hostUid,
          displayName: hostName,
          avatarColor: hostAppearance.primaryColor,
          text:
            roomMode === 'bot_sandbox'
              ? `Welcome to ${roomName || 'NEXUS 3D Bot Sandbox'}! AI Bots are in the theatre—test movement, snacks, seats, or spawn up to 35 bots. Log in anytime to invite real friends.`
              : `Welcome to ${roomName || 'NEXUS SOCIAL 3D Cinema'}! Grab popcorn or a cold drink at the rear counter and pick a seat.`,
          isNearbyOnly: false,
          senderPosition: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
          reactions: {},
          createdAtMs: nowMs,
        },
      ],
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    this.rooms.set(roomId, room);
    this.inviteIndex.set(inviteCode, roomId);
    return room;
  }

  /**
   * Seamlessly transitions a Guest's active 3D room into a Friend-Mode multiplayer room
   * without resetting their position, held refreshments, seat, or playback timeline.
   */
  public upgradeBotRoomToFriendsRoom(params: {
    roomId: string;
    previousHostUid?: string;
    newHostUid: string;
    newHostName: string;
  }): SocialCinemaRoom {
    const { roomId, previousHostUid, newHostUid, newHostName } = params;
    const room = this.rooms.get(roomId);
    if (!room || room.isClosed) {
      throw new Error('ROOM_NOT_FOUND: Room does not exist.');
    }

    const effectiveOldUid =
      previousHostUid && room.participants[previousHostUid]
        ? previousHostUid
        : room.hostUid;

    if (effectiveOldUid !== room.hostUid && newHostUid !== room.hostUid) {
      throw new Error('HOST_ONLY: Only the room host can upgrade this session to Friend Mode.');
    }

    const existingHostParticipant = room.participants[effectiveOldUid];
    if (existingHostParticipant && effectiveOldUid !== newHostUid) {
      delete room.participants[effectiveOldUid];
      existingHostParticipant.uid = newHostUid;
      existingHostParticipant.displayName = newHostName || existingHostParticipant.displayName;
      existingHostParticipant.appearance = {
        ...existingHostParticipant.appearance,
        displayName: newHostName || existingHostParticipant.displayName,
      };
      room.participants[newHostUid] = existingHostParticipant;
    } else if (room.participants[newHostUid]) {
      room.participants[newHostUid].displayName =
        newHostName || room.participants[newHostUid].displayName;
    }

    room.hostUid = newHostUid;
    room.hostName = newHostName || room.hostName;
    room.playback.hostUid = newHostUid;
    room.roomMode = 'friends';
    room.updatedAtMs = Date.now();

    return room;
  }

  private recordJoinAttemptAndCheckRateLimit(uidOrKey: string, nowMs: number): void {
    const entry = this.joinAttemptTracker.get(uidOrKey);
    if (!entry || nowMs - entry.windowStartMs > 60_000) {
      this.joinAttemptTracker.set(uidOrKey, { count: 1, windowStartMs: nowMs });
      return;
    }
    if (entry.count >= 8) {
      throw new Error('RATE_LIMITED: Too many unsuccessful join attempts. Please wait 60 seconds.');
    }
  }

  private incrementFailedJoinAttempt(uidOrKey: string, nowMs: number): void {
    const entry = this.joinAttemptTracker.get(uidOrKey);
    if (!entry || nowMs - entry.windowStartMs > 60_000) {
      this.joinAttemptTracker.set(uidOrKey, { count: 1, windowStartMs: nowMs });
    } else {
      entry.count += 1;
    }
  }

  public joinRoomByInviteCode(params: {
    uid: string;
    displayName: string;
    inviteCode: string;
    appearance?: CharacterAppearance;
    nowMs?: number;
  }): SocialCinemaRoom {
    const { uid, displayName, inviteCode, appearance, nowMs = Date.now() } = params;
    if (!uid || !uid.trim()) {
      throw new Error('AUTH_REQUIRED: Only authenticated CineShelf users may join a room.');
    }

    this.recordJoinAttemptAndCheckRateLimit(uid, nowMs);

    const normalizedCode = (inviteCode || '').trim().toUpperCase();
    const roomId = this.inviteIndex.get(normalizedCode);
    if (!roomId) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error('INVALID_INVITE: Invitation code not found or no longer active.');
    }

    const room = this.rooms.get(roomId);
    if (!room || room.isClosed) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error('ROOM_CLOSED: This cinema session has ended.');
    }

    if (room.inviteRevoked) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error('INVITE_REVOKED: The host has revoked this invitation code.');
    }

    if (nowMs > room.inviteExpiresAtMs) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error('INVITE_EXPIRED: This invitation code has expired.');
    }

    // Reconnection check: if already a member of the room, allow returning even if full/locked
    if (room.participants[uid]) {
      room.participants[uid].lastHeartbeatMs = nowMs;
      if (appearance) {
        room.participants[uid].appearance = appearance;
      }
      // Sync authoritative playback position on reconnect
      room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
      room.playback.lastSyncServerTimestampMs = nowMs;
      room.updatedAtMs = nowMs;
      return room;
    }

    if (room.isLocked) {
      throw new Error('ROOM_LOCKED: The host has locked this theatre to new entrants.');
    }

    // Atomic Server-Side Capacity Enforcement (hard cap at room.capacity and absolute max 35)
    const currentCount = Object.keys(room.participants).length;
    const effectiveLimit = Math.min(room.capacity, 35);
    if (currentCount >= effectiveLimit) {
      throw new Error(
        `ROOM_CAPACITY_FULL: Room has reached its maximum capacity of ${effectiveLimit} participants.`
      );
    }

    const memberAppearance =
      appearance || generateDefaultAppearanceForUid(uid, displayName);

    // Compute non-overlapping spawn position in rear lobby aisle
    const offsetIndex = currentCount;
    const spawnCandidateX = ((offsetIndex % 7) - 3) * 0.85;
    const spawnCandidateZ = 9.2 + Math.floor(offsetIndex / 7) * 0.75;
    const resolvedPos = resolveTheatreMovement(
      { x: 0, y: 1.9, z: 10.0 },
      { x: spawnCandidateX, z: Math.min(14.2, spawnCandidateZ) },
      Object.values(room.participants),
      uid
    );

    room.participants[uid] = {
      uid,
      displayName: displayName || memberAppearance.displayName,
      role: 'member',
      appearance: memberAppearance,
      position: { x: resolvedPos.x, y: resolvedPos.y, z: resolvedPos.z },
      rotationY: Math.PI,
      animation: 'idle',
      holdingItem: 'none',
      itemPortionsRemaining: 0,
      seatIndex: null,
      activeEmote: null,
      emoteExpiresAtMs: null,
      isMuted: true,
      isHostMuted: false,
      isSpeaking: false,
      voiceMode: 'off',
      isBuffering: false,
      joinedAtMs: nowMs,
      lastHeartbeatMs: nowMs,
    };

    // Keep late-joiner synchronized to exact current shared playback position
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;
    room.updatedAtMs = nowMs;

    return room;
  }

  public getRoomForMember(roomId: string, uid: string): SocialCinemaRoom {
    if (!uid) {
      throw new Error('AUTH_REQUIRED: Authentication required.');
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('ROOM_NOT_FOUND: Room does not exist.');
    }
    if (!room.participants[uid]) {
      throw new Error('NOT_A_MEMBER: Access denied. You are not a member of this private room.');
    }
    // Keep playback position fresh
    const nowMs = Date.now();
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;
    return room;
  }

  public updateParticipantMovement(params: {
    roomId: string;
    authenticatedUid: string;
    targetUid?: string;
    x: number;
    y?: number;
    z: number;
    rotationY: number;
    animation?: CharacterAnimationState;
  }): { participant: RoomParticipantState; collided: boolean } {
    const { roomId, authenticatedUid, targetUid, x, y, z, rotationY, animation } = params;
    if (targetUid && targetUid !== authenticatedUid) {
      throw new Error('FORBIDDEN_AVATAR_CONTROL: Cannot control another participant avatar.');
    }
    const room = this.getRoomForMember(roomId, authenticatedUid);
    const participant = room.participants[authenticatedUid];

    // If sitting, moving stands the character up first
    participant.seatIndex = null;

    const resolved = resolveTheatreMovement(
      participant.position,
      { x, z },
      Object.values(room.participants),
      authenticatedUid
    );

    const resolvedY =
      typeof y === 'number' && Number.isFinite(y)
        ? Math.max(resolved.y, Math.min(resolved.y + 2.5, Number(y.toFixed(3))))
        : resolved.y;

    participant.position = { x: resolved.x, y: resolvedY, z: resolved.z };
    participant.rotationY = Number(rotationY.toFixed(3));
    if (animation) {
      participant.animation = animation;
    } else if (participant.holdingItem.startsWith('popcorn')) {
      participant.animation = 'holding_popcorn';
    } else if (participant.holdingItem.startsWith('drink')) {
      participant.animation = 'holding_drink';
    } else {
      participant.animation = 'walking';
    }
    participant.lastHeartbeatMs = Date.now();
    room.updatedAtMs = participant.lastHeartbeatMs;

    return { participant, collided: resolved.collidedWithWallOrCounter };
  }

  public interactWithRefreshment(params: {
    roomId: string;
    uid: string;
    action:
      | 'pickup_popcorn'
      | 'eat_popcorn'
      | 'pickup_drink'
      | 'drink_beverage'
      | 'refill'
      | 'put_away';
    itemVariant?: RefreshmentItemType;
  }): RoomParticipantState {
    const { roomId, uid, action, itemVariant } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];

    switch (action) {
      case 'pickup_popcorn': {
        p.holdingItem =
          itemVariant && itemVariant.startsWith('popcorn_')
            ? itemVariant
            : 'popcorn_butter';
        p.itemPortionsRemaining = 5;
        p.animation = 'holding_popcorn';
        break;
      }
      case 'eat_popcorn': {
        if (!p.holdingItem.startsWith('popcorn_')) {
          p.holdingItem = 'popcorn_butter';
          p.itemPortionsRemaining = 5;
        }
        p.itemPortionsRemaining = Math.max(0, p.itemPortionsRemaining - 1);
        p.animation = 'eating_popcorn';
        break;
      }
      case 'pickup_drink': {
        p.holdingItem =
          itemVariant && itemVariant.startsWith('drink_')
            ? itemVariant
            : 'drink_cola';
        p.itemPortionsRemaining = 5;
        p.animation = 'holding_drink';
        break;
      }
      case 'drink_beverage': {
        if (!p.holdingItem.startsWith('drink_')) {
          p.holdingItem = 'drink_cola';
          p.itemPortionsRemaining = 5;
        }
        p.itemPortionsRemaining = Math.max(0, p.itemPortionsRemaining - 1);
        p.animation = 'drinking';
        break;
      }
      case 'refill': {
        if (p.holdingItem !== 'none') {
          p.itemPortionsRemaining = 5;
        }
        break;
      }
      case 'put_away': {
        p.holdingItem = 'none';
        p.itemPortionsRemaining = 0;
        p.animation = p.seatIndex !== null ? 'sitting' : 'idle';
        break;
      }
    }

    p.lastHeartbeatMs = Date.now();
    room.updatedAtMs = p.lastHeartbeatMs;
    return p;
  }

  public toggleSeat(params: {
    roomId: string;
    uid: string;
    requestedSeatIndex?: number | null;
  }): RoomParticipantState {
    const { roomId, uid, requestedSeatIndex } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];

    if (p.seatIndex !== null && requestedSeatIndex === undefined) {
      // Stand up in aisle behind seat
      p.seatIndex = null;
      p.position.z = Math.min(THEATRE_BOUNDS.maxZ, p.position.z + 0.65);
      p.position.y = getFloorElevationAtZ(p.position.z);
      p.animation = 'standing';
      return p;
    }

    // Find target seat or nearest unoccupied seat
    const occupiedSeats = new Set(
      Object.values(room.participants)
        .filter((other) => other.uid !== uid && other.seatIndex !== null)
        .map((other) => other.seatIndex as number)
    );

    let chosenSeat: SeatPositionSpec | undefined;
    if (typeof requestedSeatIndex === 'number' && !occupiedSeats.has(requestedSeatIndex)) {
      chosenSeat = THEATRE_SEAT_LAYOUT.find((s) => s.seatIndex === requestedSeatIndex);
    }

    if (!chosenSeat) {
      let bestDistSq = Infinity;
      for (const s of THEATRE_SEAT_LAYOUT) {
        if (occupiedSeats.has(s.seatIndex)) continue;
        const dx = p.position.x - s.x;
        const dz = p.position.z - s.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          chosenSeat = s;
        }
      }
    }

    if (chosenSeat) {
      p.seatIndex = chosenSeat.seatIndex;
      p.position = { x: chosenSeat.x, y: chosenSeat.y, z: chosenSeat.z };
      p.rotationY = 0; // Face the giant movie screen (-Z)
      p.animation = 'sitting';
    }

    p.lastHeartbeatMs = Date.now();
    room.updatedAtMs = p.lastHeartbeatMs;
    return p;
  }

  public triggerEmote(params: {
    roomId: string;
    uid: string;
    emote: SocialEmoteId;
  }): RoomParticipantState {
    const { roomId, uid, emote } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    const nowMs = Date.now();
    p.activeEmote = emote;
    p.emoteExpiresAtMs = nowMs + 4000;
    if (emote === 'wave') p.animation = 'wave';
    else if (emote === 'laugh') p.animation = 'laughing';
    else if (emote === 'cheer' || emote === 'applause' || emote === 'dancing') {
      p.animation = 'celebrating';
    }
    p.lastHeartbeatMs = nowMs;
    room.updatedAtMs = nowMs;
    return p;
  }

  public sendChatMessage(params: {
    roomId: string;
    uid: string;
    text: string;
    isNearbyOnly?: boolean;
  }): RoomChatMessage {
    const { roomId, uid, text, isNearbyOnly = false } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];

    if (p.isHostMuted) {
      throw new Error('MUTED_BY_HOST: You have been muted by the room host.');
    }
    if (room.chatRestricted && p.role === 'member') {
      throw new Error('CHAT_RESTRICTED: Chat is currently restricted to Host and Co-Hosts.');
    }

    const cleanText = (text || '').trim().slice(0, 500);
    if (!cleanText) {
      throw new Error('EMPTY_MESSAGE: Message cannot be empty.');
    }

    const nowMs = Date.now();
    const msg: RoomChatMessage = {
      id: `msg_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      uid,
      displayName: p.displayName,
      avatarColor: p.appearance.primaryColor,
      text: cleanText,
      isNearbyOnly,
      senderPosition: { ...p.position },
      reactions: {},
      createdAtMs: nowMs,
    };

    room.messages.push(msg);
    if (room.messages.length > 150) {
      room.messages.shift();
    }
    room.updatedAtMs = nowMs;
    return msg;
  }

  public controlPlayback(params: {
    roomId: string;
    uid: string;
    action:
      | 'play'
      | 'pause'
      | 'seek'
      | 'set_source'
      | 'set_speed'
      | 'set_fit_mode'
      | 'lock_controls'
      | 'unlock_controls'
      | 'request_control'
      | 'grant_control'
      | 'dismiss_control_request'
      | 'start_manual_countdown';
    positionSeconds?: number;
    durationSeconds?: number;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceConfig?: Partial<MediaSourceConfig>;
    playbackSpeed?: number;
    pictureFitMode?: 'fit' | 'original' | 'fill';
    targetUid?: string;
    nowMs?: number;
  }): SocialCinemaRoom['playback'] {
    const {
      roomId,
      uid,
      action,
      positionSeconds,
      durationSeconds,
      sourceUrl,
      sourceTitle,
      sourceConfig,
      playbackSpeed,
      pictureFitMode,
      nowMs = Date.now(),
    } = params;

    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    const pb = room.playback;

    if (action === 'request_control') {
      if (!pb.controlRequests.some((r) => r.uid === uid)) {
        pb.controlRequests.push({
          uid,
          displayName: p.displayName,
          requestedAtMs: nowMs,
        });
      }
      return pb;
    }

    const hasAuthority =
      p.role === 'host' ||
      p.role === 'co_host' ||
      !pb.controlsLocked;

    if (!hasAuthority) {
      throw new Error(
        'UNAUTHORIZED_PLAYBACK_CONTROL: Only the Host or Co-Host may control shared playback while controls are locked.'
      );
    }

    // First snapshot current authoritative position before changing state
    const currentPos = computeAuthoritativePlaybackPosition(room, nowMs);

    switch (action) {
      case 'play': {
        pb.positionSeconds =
          typeof positionSeconds === 'number' ? Math.max(0, positionSeconds) : currentPos;
        pb.isPlaying = true;
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case 'pause': {
        pb.positionSeconds =
          typeof positionSeconds === 'number' ? Math.max(0, positionSeconds) : currentPos;
        pb.isPlaying = false;
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case 'seek': {
        pb.positionSeconds = Math.max(0, Number(positionSeconds || 0));
        if (typeof durationSeconds === 'number' && durationSeconds > 0) {
          pb.durationSeconds = durationSeconds;
        }
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case 'set_source': {
        const validated = validateAndClassifyMediaSource(sourceUrl || '', sourceTitle);
        pb.mediaSource = {
          ...validated,
          ...(sourceConfig || {}),
        };
        // Do not crash room or reset if unsupported; only reset timeline if supported source changed
        if (pb.mediaSource.supportsAutoSync) {
          pb.positionSeconds = 0;
          pb.isPlaying = false;
        }
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case 'set_speed': {
        const speedVal = Number(playbackSpeed || 1.0);
        pb.playbackSpeed = Math.max(0.25, Math.min(3.0, speedVal));
        pb.positionSeconds = currentPos;
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case 'set_fit_mode': {
        if (pictureFitMode) {
          pb.pictureFitMode = pictureFitMode;
          pb.revision += 1;
        }
        break;
      }
      case 'lock_controls': {
        if (p.role !== 'host') {
          throw new Error('HOST_ONLY: Only the room host can lock playback controls.');
        }
        pb.controlsLocked = true;
        pb.revision += 1;
        break;
      }
      case 'unlock_controls': {
        if (p.role !== 'host') {
          throw new Error('HOST_ONLY: Only the room host can unlock playback controls.');
        }
        pb.controlsLocked = false;
        pb.revision += 1;
        break;
      }
      case 'grant_control': {
        if (p.role !== 'host') {
          throw new Error('HOST_ONLY: Only the room host can grant playback control.');
        }
        pb.controlsLocked = false;
        pb.controlRequests = [];
        pb.revision += 1;
        break;
      }
      case 'dismiss_control_request': {
        if (p.role !== 'host') {
          throw new Error('HOST_ONLY: Only the room host can dismiss control requests.');
        }
        if (params.targetUid) {
          pb.controlRequests = pb.controlRequests.filter((r) => r.uid !== params.targetUid);
        } else {
          pb.controlRequests = [];
        }
        pb.revision += 1;
        break;
      }
      case 'start_manual_countdown': {
        pb.manualCountdownStartedAtMs = nowMs;
        pb.revision += 1;
        break;
      }
    }

    room.updatedAtMs = nowMs;
    return pb;
  }

  public reportBufferingState(roomId: string, uid: string, isBuffering: boolean): RoomParticipantState {
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    // Individual buffering does NOT alter room.playback.isPlaying
    p.isBuffering = isBuffering;
    p.lastHeartbeatMs = Date.now();
    return p;
  }

  public transferHost(params: {
    roomId: string;
    currentHostUid: string;
    newHostUid: string;
  }): SocialCinemaRoom {
    const { roomId, currentHostUid, newHostUid } = params;
    const room = this.getRoomForMember(roomId, currentHostUid);
    if (room.hostUid !== currentHostUid) {
      throw new Error('HOST_ONLY: Only the current host can transfer hosting privileges.');
    }
    const target = room.participants[newHostUid];
    if (!target) {
      throw new Error('TARGET_NOT_FOUND: Target participant is not in the room.');
    }

    room.participants[currentHostUid].role = 'co_host';
    target.role = 'host';
    room.hostUid = newHostUid;
    room.hostName = target.displayName;
    room.playback.hostUid = newHostUid;
    room.playback.revision += 1;
    room.updatedAtMs = Date.now();
    return room;
  }

  public promoteCoHost(params: {
    roomId: string;
    hostUid: string;
    targetUid: string;
    makeCoHost: boolean;
  }): SocialCinemaRoom {
    const { roomId, hostUid, targetUid, makeCoHost } = params;
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error('HOST_ONLY: Only the host can assign co-host privileges.');
    }
    const target = room.participants[targetUid];
    if (!target || targetUid === hostUid) return room;

    target.role = makeCoHost ? 'co_host' : 'member';
    if (makeCoHost && !room.playback.coHostUids.includes(targetUid)) {
      room.playback.coHostUids.push(targetUid);
    } else if (!makeCoHost) {
      room.playback.coHostUids = room.playback.coHostUids.filter((id) => id !== targetUid);
    }
    room.updatedAtMs = Date.now();
    return room;
  }

  public regenerateInviteCode(roomId: string, hostUid: string, ttlMs = 1000 * 60 * 60 * 6): string {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error('HOST_ONLY: Only the host can regenerate invitation codes.');
    }
    this.inviteIndex.delete(room.inviteCode);
    let nextCode = generateSecureInviteCode(9);
    while (this.inviteIndex.has(nextCode)) {
      nextCode = generateSecureInviteCode(9);
    }
    room.inviteCode = nextCode;
    room.inviteExpiresAtMs = Date.now() + ttlMs;
    room.inviteRevoked = false;
    this.inviteIndex.set(nextCode, roomId);
    return nextCode;
  }

  public revokeInviteCode(roomId: string, hostUid: string): void {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error('HOST_ONLY: Only the host can revoke invitations.');
    }
    room.inviteRevoked = true;
  }

  public leaveRoom(roomId: string, uid: string): { roomClosed: boolean; promotedHostUid?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants[uid]) {
      return { roomClosed: false };
    }

    const wasHost = room.hostUid === uid;
    // Snapshot shared playback before removing user so remaining members are unaffected
    const nowMs = Date.now();
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;

    delete room.participants[uid];
    const remaining = Object.values(room.participants);

    if (remaining.length === 0) {
      // Keep room active briefly for reconnect, do not silently destroy if others might return, or mark idle
      return { roomClosed: false };
    }

    if (wasHost) {
      // Promote first co-host if available, otherwise pause playback & promote longest-standing member
      const nextHost =
        remaining.find((m) => m.role === 'co_host') ||
        remaining.sort((a, b) => a.joinedAtMs - b.joinedAtMs)[0];
      if (nextHost) {
        nextHost.role = 'host';
        room.hostUid = nextHost.uid;
        room.hostName = nextHost.displayName;
        room.playback.hostUid = nextHost.uid;
        return { roomClosed: false, promotedHostUid: nextHost.uid };
      }
    }

    return { roomClosed: false };
  }

  public closeRoom(roomId: string, hostUid: string): void {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error('HOST_ONLY: Only the host can close the room.');
    }
    room.isClosed = true;
    room.playback.isPlaying = false;
    this.inviteIndex.delete(room.inviteCode);
  }
}
