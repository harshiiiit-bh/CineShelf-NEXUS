import 'dotenv/config';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CURATED_CATALOG,
  hydrateCatalogItemArtwork,
  queryLocalCatalog,
} from './src/utils/catalog';
import {
  mapTvMazeShowToCatalogItem,
  mergeCatalogItemPreservingEdits,
  parseAndValidateCatalogueImport,
  searchMultiSourceMetadata,
} from './src/utils/metadataProviders';
import fs from 'fs';
import os from 'os';
import {
  SocialCinemaServerManager,
  validateAndClassifyMediaSource,
  generateDefaultAppearanceForUid,
  CURATED_DIRECT_CINEMA_STREAMS,
} from './src/utils/socialEngine';
import {
  TemporaryAuthServerManager,
  AccessMode,
} from './src/utils/tempAuthEngine';
import {
  CatalogItem,
  CharacterAnimationState,
  CharacterAppearance,
  RefreshmentItemType,
  RoomCapacityOption,
  SocialEmoteId,
  TheatreThemeId,
} from './src/types/nexus';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory LRU-style cache for metadata proxy responses
const metadataCache = new Map<string, { expiresAt: number; data: unknown }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Server-side Local Movie Catalogue store seeded from src/data/localMovies.json
let serverMovieCatalog: CatalogItem[] = [...CURATED_CATALOG];

function getCached<T>(key: string): T | null {
  const entry = metadataCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    metadataCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown) {
  if (metadataCache.size > 250) {
    const firstKey = metadataCache.keys().next().value;
    if (firstKey) metadataCache.delete(firstKey);
  }
  metadataCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

// Authoritative singleton NEXUS SOCIAL 3D Cinema Server Manager
export const socialCinemaManager = new SocialCinemaServerManager();

// Temporary Room-Scoped Media Storage Directory & Map for Multiplayer Video Sharing
export const ROOM_MEDIA_DIR = path.join(os.tmpdir(), 'cineshelf-room-media');
try {
  if (!fs.existsSync(ROOM_MEDIA_DIR)) {
    fs.mkdirSync(ROOM_MEDIA_DIR, { recursive: true });
  }
} catch {
  // Directory might already exist or handled by OS
}

export interface RoomSharedMediaRecord {
  roomId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  localPath: string;
  uploadedAt: number;
  hostUid: string;
}

export const roomSharedMediaMap = new Map<string, RoomSharedMediaRecord>();

// Authoritative singleton Temporary Login & Session Manager (Guest Mode + Friend Mode)
export const tempAuthManager = new TemporaryAuthServerManager();

export interface RequestSessionContext {
  uid: string;
  emailVerified: boolean;
  accessMode: AccessMode;
  guestId?: string;
  loginId?: string;
  displayName?: string;
}

export function decodeSessionContext(token: string): RequestSessionContext | null {
  if (!token) return null;

  // 1. Validate Guest Mode or Friend Mode Temporary Session Token (gst_... or usr_...)
  if (token.startsWith('gst_') || token.startsWith('usr_')) {
    const validated = tempAuthManager.validateSessionToken(token, { touchActivity: true });
    if (!validated) {
      return null;
    }
    return {
      uid: validated.uid,
      emailVerified: validated.accessMode === 'friend',
      accessMode: validated.accessMode,
      guestId: validated.guestId,
      loginId: validated.loginId,
      displayName: validated.displayName,
    };
  }

  // 2. Support verified development sandbox token ONLY for the isolated local sandbox UID
  if (token.startsWith('sandbox-token:')) {
    // Development sandbox tokens are forgeable by design; never accept them on a public production API.
    if (process.env.NODE_ENV === 'production') return null;
    const sandboxUid = token.slice('sandbox-token:'.length).trim();
    if (sandboxUid && /^[a-zA-Z0-9_\-]+$/.test(sandboxUid)) {
      const isGuestFallbackUid = sandboxUid.startsWith('guest_fallback_');
      return {
        uid: sandboxUid,
        emailVerified: !isGuestFallbackUid,
        accessMode: isGuestFallbackUid ? 'guest' : 'friend',
      };
    }
    return null;
  }

  // 3. Decode Firebase JWT payload (3-segment JWT) and validate basic claims
  const parts = token.split('.');
  if (parts.length === 3) {
    // Do not trust decoded Firebase JWT payloads without signature verification.
    // Firebase ID token verification must be implemented before enabling this in production.
    if (process.env.NODE_ENV === 'production') return null;
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      const uid = payload.user_id || payload.sub;
      const exp = payload.exp;
      if (typeof uid === 'string' && uid.length > 0) {
        if (typeof exp === 'number' && exp * 1000 < Date.now()) {
          return null; // Expired token
        }
        return {
          uid,
          emailVerified: Boolean(payload.email_verified ?? true),
          accessMode: 'friend',
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Decodes and validates a Firebase ID token, Temporary Login token, or Sandbox token header,
 * strictly enforcing that the authenticated caller's UID equals the target `:uid` route parameter.
 * Never allows one account to read or mutate another account's server-side resources.
 */
export function extractAuthenticatedUid(req: Request): { uid: string; emailVerified: boolean } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return decodeBearerToken(token);
}

export function decodeBearerToken(token: string): { uid: string; emailVerified: boolean } | null {
  const ctx = decodeSessionContext(token);
  if (!ctx) return null;
  return { uid: ctx.uid, emailVerified: ctx.emailVerified };
}

export function extractSessionContext(req: Request): RequestSessionContext | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return decodeSessionContext(token);
}

export function requireStrictUidOwnership(req: Request, res: Response, next: NextFunction) {
  const authUser = extractAuthenticatedUid(req);
  if (!authUser) {
    res.status(401).json({
      error: 'UNAUTHENTICATED: Valid Authorization Bearer token is required.',
      code: 'PERMISSION_DENIED',
    });
    return;
  }
  const targetUid = req.params.uid || req.body?.uid;
  if (!targetUid || authUser.uid !== targetUid) {
    res.status(403).json({
      error: 'FORBIDDEN: Cross-account access is strictly prohibited. Ownership UID mismatch.',
      code: 'PERMISSION_DENIED',
    });
    return;
  }
  next();
}

export function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const sessionCtx = extractSessionContext(req);
  if (!sessionCtx) {
    res.status(401).json({
      error: 'UNAUTHENTICATED: Your session is missing or has expired. Please continue as Guest or log in.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  (req as Request & { authUser?: RequestSessionContext }).authUser = sessionCtx;
  next();
}

function getAllowedCorsOrigins(): Set<string> {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaults = ['https://harshiiiit-bh.github.io'];

  if (process.env.NODE_ENV !== 'production') {
    defaults.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    );
  }

  return new Set([...defaults, ...configured]);
}

export function createApp(onRoomBroadcast?: (roomId: string, eventType: string, payload: unknown) => void) {
  const app = express();

  // GitHub Pages hosts the browser app separately from this Express API.
  // Explicit CORS handling is required for JSON + Authorization preflight requests.
  const allowedCorsOrigins = getAllowedCorsOrigins();
  app.use((req, res, next) => {
    const origin = String(req.headers.origin || '');

    if (origin && allowedCorsOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-Media-Filename, Range, Accept'
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Accept-Ranges, Content-Length, Content-Range, Content-Type'
      );
      res.setHeader('Access-Control-Max-Age', '600');
    }

    if (req.method === 'OPTIONS') {
      if (origin && !allowedCorsOrigins.has(origin)) {
        res.status(403).end();
        return;
      }
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(express.json({ limit: '5mb' }));

  const broadcastRoomState = (roomId: string, eventType: string, payload: unknown) => {
    if (onRoomBroadcast) {
      onRoomBroadcast(roomId, eventType, payload);
    }
  };

  // Health check endpoints for Google Cloud Run container readiness & liveness probes
  app.get(['/api/health', '/healthz'], (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'cineshelf-nexus',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      catalogCount: serverMovieCatalog.length,
    });
  });

  // ============================================================================
  // TEMPORARY LOGIN & GUEST SESSION ENDPOINTS (/api/auth/*)
  // ============================================================================

  // 1. Continue as Guest — creates a temporary guest identity & unique Guest ID
  app.post('/api/auth/guest', (req, res) => {
    const { displayName, inactivityTimeoutMinutes } = (req.body || {}) as {
      displayName?: string;
      inactivityTimeoutMinutes?: number;
    };
    const created = tempAuthManager.createGuestSession({
      displayName,
      inactivityTimeoutMinutes,
    });
    res.status(201).json(created);
  });

  // 2. Login to Play with Friends (New Temporary Login) — generates unique Login ID & Temporary Login Code
  app.post('/api/auth/login-create', (req, res) => {
    const { displayName, guestToken, guestUid } = (req.body || {}) as {
      displayName?: string;
      guestToken?: string;
      guestUid?: string;
    };
    try {
      const created = tempAuthManager.registerTemporaryAccount({
        displayName: String(displayName || ''),
        guestToken,
        guestUid,
      });
      res.status(201).json({
        ...created,
        account: {
          uid: created.session.uid,
          loginId: created.credentials.loginId,
          displayName: created.session.displayName,
        },
        loginCode: created.credentials.loginCode,
        migratedFromGuestUid: created.session.migratedFromGuestUid,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to create temporary login.',
      });
    }
  });

  // 3. Returning Login on Another Device — verifies Login ID + Temporary Login Code
  app.post('/api/auth/login-verify', (req, res) => {
    const { loginId, loginCode, guestToken, guestUid } = (req.body || {}) as {
      loginId?: string;
      loginCode?: string;
      guestToken?: string;
      guestUid?: string;
    };
    try {
      const verified = tempAuthManager.loginWithTemporaryCode({
        loginId: String(loginId || ''),
        loginCode: String(loginCode || ''),
        guestToken,
        guestUid,
      });
      res.json({
        ...verified,
        account: {
          uid: verified.session.uid,
          loginId: verified.session.loginId,
          displayName: verified.session.displayName,
        },
        migratedFromGuestUid: verified.session.migratedFromGuestUid,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid Login ID or Temporary Login Code.';
      const status = msg.startsWith('RATE_LIMITED') ? 429 : 401;
      res.status(status).json({ error: msg });
    }
  });

  // 4. Validate Current Session & Refresh Activity Heartbeat
  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ valid: false, error: 'NO_TOKEN' });
      return;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (token.startsWith('gst_') || token.startsWith('usr_')) {
      const session = tempAuthManager.validateSessionToken(token, { touchActivity: true });
      if (!session) {
        res.status(401).json({
          valid: false,
          error: 'SESSION_EXPIRED: Your temporary session has expired due to inactivity.',
        });
        return;
      }
      res.json({ valid: true, session });
      return;
    }

    const fallbackCtx = decodeSessionContext(token);
    if (!fallbackCtx) {
      res.status(401).json({ valid: false, error: 'INVALID_SESSION' });
      return;
    }
    res.json({
      valid: true,
      session: {
        uid: fallbackCtx.uid,
        accessMode: fallbackCtx.accessMode,
        displayName: fallbackCtx.displayName || 'CineShelf Member',
        guestId: fallbackCtx.guestId,
        loginId: fallbackCtx.loginId,
        inactivityTimeoutMinutes: 30,
      },
    });
  });

  // 5. Update Session Settings (e.g. Display Name or Guest Inactivity Timeout)
  app.post('/api/auth/session/config', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
    if (!token.startsWith('gst_') && !token.startsWith('usr_')) {
      res.status(400).json({ error: 'Session configuration requires an active guest or temporary login token.' });
      return;
    }
    try {
      const updated = tempAuthManager.updateSessionConfig(token, {
        displayName: req.body?.displayName,
        inactivityTimeoutMinutes:
          typeof req.body?.inactivityTimeoutMinutes === 'number'
            ? req.body.inactivityTimeoutMinutes
            : undefined,
      });
      res.json({ session: updated });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Session expired.',
      });
    }
  });

  // 6. Logout & Revoke Session Token
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
    if (token) {
      tempAuthManager.revokeSessionToken(token);
    }
    res.json({ loggedOut: true });
  });

  // Health & API-Independent Local Movie Database Status Endpoint (no secrets exposed)
  app.get('/api/status', (_req, res) => {
    const livekitWsUrl = process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || '';
    const livekitConfigured = Boolean(
      livekitWsUrl.trim() &&
        process.env.LIVEKIT_API_KEY?.trim() &&
        process.env.LIVEKIT_API_SECRET?.trim()
    );
    res.json({
      service: 'CineShelf NEXUS API',
      status: 'ok',
      localDatabaseReady: true,
      catalogCount: serverMovieCatalog.length,
      wikidataImportSupported: true,
      adminCatalogueSupported: true,
      tvmazeConfigured: true,
      curatedCatalogConfigured: true,
      manualEntryConfigured: true,
      guestModeSupported: true,
      temporaryLoginSupported: true,
      livekitConfigured,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      attribution:
        'Movies powered by CineShelf Local JSON Database, Wikidata Open Data (CC0), and Administrator Catalogue. Television series metadata provided by TVmaze.com (CC BY-SA).',
    });
  });

  // Get full Local Movie Database Catalogue
  app.get('/api/catalog', (_req, res) => {
    res.json({
      items: serverMovieCatalog,
      totalCount: serverMovieCatalog.length,
      sources: ['local_json', 'wikidata', 'admin_catalogue', 'tvmaze'],
    });
  });

  // Upsert a movie or series record in the Server Catalogue
  app.post('/api/catalog', (req, res) => {
    const incoming = req.body as Partial<CatalogItem>;
    if (!incoming || !incoming.title || !String(incoming.title).trim()) {
      res.status(400).json({ error: 'Movie title is required.' });
      return;
    }

    const hydrated = hydrateCatalogItemArtwork({
      ...incoming,
      movieId:
        incoming.movieId ||
        `admin-${String(incoming.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}-${incoming.releaseYear || 2024}`,
      metadataProvider: incoming.metadataProvider || 'admin_catalogue',
      title: String(incoming.title).trim(),
      contentType: incoming.contentType || 'movie',
      releaseYear: Number(incoming.releaseYear) || 2024,
      language: incoming.language || 'English',
      country: incoming.country || 'United States',
      director: incoming.director || 'Independent',
      cast: Array.isArray(incoming.cast) ? incoming.cast : [],
      genres: Array.isArray(incoming.genres) && incoming.genres.length > 0 ? incoming.genres : ['Drama'],
      tags: Array.isArray(incoming.tags) ? incoming.tags : [],
      runtimeMinutes: Number(incoming.runtimeMinutes) || 120,
      communityRating: Number(incoming.communityRating) || 8.0,
      popularityScore: Number(incoming.popularityScore) || 85,
      overview: incoming.overview || 'Verified entry in the CineShelf NEXUS catalogue.',
      posterUrl: incoming.posterUrl || '',
      backdropUrl: incoming.backdropUrl || '',
      streamingByRegion: incoming.streamingByRegion || {},
      addedAt: incoming.addedAt || new Date().toISOString().slice(0, 10),
    });

    const existingIdx = serverMovieCatalog.findIndex(
      (m) =>
        m.movieId === hydrated.movieId ||
        (m.title.toLowerCase() === hydrated.title.toLowerCase() && m.releaseYear === hydrated.releaseYear)
    );

    if (existingIdx >= 0) {
      serverMovieCatalog[existingIdx] = mergeCatalogItemPreservingEdits(
        serverMovieCatalog[existingIdx],
        hydrated
      ).merged;
      res.json({ item: serverMovieCatalog[existingIdx], updated: true, totalCount: serverMovieCatalog.length });
    } else {
      serverMovieCatalog = [hydrated, ...serverMovieCatalog];
      res.status(201).json({ item: hydrated, created: true, totalCount: serverMovieCatalog.length });
    }
  });

  // Delete a movie record from the Server Catalogue
  app.delete('/api/catalog/:movieId', (req, res) => {
    const movieId = String(req.params.movieId || '').trim();
    const before = serverMovieCatalog.length;
    serverMovieCatalog = serverMovieCatalog.filter((m) => m.movieId !== movieId);
    res.json({
      deleted: serverMovieCatalog.length < before,
      movieId,
      totalCount: serverMovieCatalog.length,
    });
  });

  // Bulk Import JSON / CSV / Wikidata Offline Dataset into the Server Catalogue
  app.post('/api/catalog/import', (req, res) => {
    const { rawContent, items, formatHint } = req.body as {
      rawContent?: string;
      items?: CatalogItem[];
      formatHint?: 'json' | 'csv' | 'wikidata';
    };

    const effectiveRaw =
      typeof rawContent === 'string' && rawContent.trim().length > 0
        ? rawContent
        : Array.isArray(items) && items.length > 0
          ? JSON.stringify(items)
          : '';

    const preview = parseAndValidateCatalogueImport(
      effectiveRaw,
      serverMovieCatalog,
      formatHint
    );
    if (!preview.isValid) {
      res.status(400).json({ preview });
      return;
    }

    const next = [...serverMovieCatalog];
    for (const incoming of preview.parsedItems) {
      const idx = next.findIndex(
        (existing) =>
          existing.movieId === incoming.movieId ||
          (existing.wikidataId && incoming.wikidataId && existing.wikidataId === incoming.wikidataId) ||
          (existing.title.toLowerCase() === incoming.title.toLowerCase() &&
            existing.releaseYear === incoming.releaseYear)
      );
      if (idx >= 0) {
        next[idx] = mergeCatalogItemPreservingEdits(next[idx], incoming).merged;
      } else {
        next.unshift(incoming);
      }
    }
    serverMovieCatalog = next;
    res.json({
      preview,
      totalCount: serverMovieCatalog.length,
    });
  });

  // Flexible Multi-Source Metadata Search (Local JSON + Wikidata + Admin Catalogue + TVmaze Public API)
  app.get('/api/metadata/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const contentType = String(req.query.contentType || 'all').trim();
    const providerFilter = String(req.query.provider || 'all').trim();
    const cacheKey = `multi:${query.toLowerCase()}:${contentType}:${providerFilter}:${serverMovieCatalog.length}`;

    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const response = await searchMultiSourceMetadata(
        query,
        (providerFilter === 'all' ? 'auto' : providerFilter) as any,
        serverMovieCatalog
      );
      setCached(cacheKey, response);
      res.json(response);
    } catch (err) {
      res.json({
        results: serverMovieCatalog,
        providersUsed: ['local_json'],
        providerStates: {
          local_json: 'active',
          wikidata: 'active',
          admin_catalogue: 'active',
          tvmaze: 'unavailable',
          curated_catalog: 'active',
          manual: 'active',
        },
        errorNotice:
          err instanceof Error
            ? err.message
            : 'External TVmaze metadata provider temporarily unavailable; serving local movie database.',
      });
    }
  });

  // TVmaze Full Show Details (Seasons, Episodes, Cast, Official Artwork)
  app.get('/api/metadata/tvmaze/show/:id', async (req, res) => {
    const showId = String(req.params.id || '').replace(/^tvmaze-/, '').trim();
    if (!showId || !/^\d+$/.test(showId)) {
      res.status(400).json({ error: 'Valid numeric TVmaze show ID is required.' });
      return;
    }

    const cacheKey = `tvmaze:show:${showId}`;
    const cached = getCached<CatalogItem>(cacheKey);
    if (cached) {
      res.json({ item: cached, provider: 'tvmaze', attribution: 'TVmaze.com (CC BY-SA)' });
      return;
    }

    try {
      const url = `https://api.tvmaze.com/shows/${encodeURIComponent(showId)}?embed[]=episodes&embed[]=cast&embed[]=seasons`;
      const resp = await fetch(url);
      if (!resp.ok) {
        res.status(404).json({ error: 'Show not found on TVmaze.' });
        return;
      }
      const rawShow = (await resp.json()) as Record<string, unknown>;
      const item = mapTvMazeShowToCatalogItem(rawShow);
      setCached(cacheKey, item);
      res.json({
        item,
        provider: 'tvmaze',
        attribution: 'Data & artwork provided by TVmaze.com (CC BY-SA)',
      });
    } catch {
      res.status(503).json({
        error: 'TVmaze public API is temporarily unreachable. You can still enter or edit metadata manually.',
      });
    }
  });

  // Local-First Movie & Series Discovery Endpoint
  app.get('/api/catalog/discover', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const actor = String(req.query.actor || '').trim();
    const director = String(req.query.director || 'all').trim();
    const genre = String(req.query.genre || 'all').trim();
    const language = String(req.query.language || 'all').trim();
    const country = String(req.query.country || 'all').trim();
    const year = String(req.query.year || 'all').trim();
    const minRating = Number(req.query.minRating || 0);
    const maxRuntime = Number(req.query.maxRuntime || 1000);
    const contentType = String(req.query.contentType || 'all').trim();
    const sortBy = String(req.query.sortBy || 'popularity').trim() as any;

    const results = queryLocalCatalog(serverMovieCatalog, {
      query,
      actor,
      director,
      genre,
      language,
      country,
      year,
      minRating,
      maxRuntime,
      contentType,
      sortBy,
    });

    res.json({
      results,
      source: 'local_movie_database',
      totalCatalogSize: serverMovieCatalog.length,
    });
  });

  // Protected User-Scoped Gemini Explainable Discovery Route
  app.post('/api/user/:uid/recommendations/ai-explain', requireStrictUidOwnership, async (req, res) => {
    const { prompt, watchedTitles = [], favouriteGenres = [] } = req.body as {
      prompt?: string;
      watchedTitles?: string[];
      favouriteGenres?: string[];
    };

    const userQuery = String(prompt || 'Show me more movies like the last five films I watched').slice(0, 500);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        curatorSummary: `Based on your recent viewing history (${watchedTitles.slice(0, 5).join(', ') || 'your library'}) and preference for ${favouriteGenres.slice(0, 3).join(', ') || 'high-tension storytelling'}, our deterministic recommendation engine prioritized tactical realism, strong biographical arcs, and auteur thrillers.`,
        picks: [],
        mode: 'deterministic_engine',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `User Request: "${userQuery}"
User's Recently Watched Titles: ${watchedTitles.slice(0, 8).join(', ') || 'Uri: The Surgical Strike, Lakshya, Severance'}
User's Favourite Genres: ${favouriteGenres.slice(0, 5).join(', ') || 'Military Drama, Espionage, Sci-Fi'}
Provide a concise 2-sentence curator analysis and 3 specific film/series recommendations with clear "whyRecommended" explanations referencing the user's watched titles.`,
        config: {
          systemInstruction:
            'You are the private cinema curator for CineShelf NEXUS. Never recommend titles the user already watched unless asked for rewatches. Always explain WHY each title matches the user’s specific viewing history.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              curatorSummary: {
                type: Type.STRING,
                description: '2-sentence synthesis of the user’s recent viewing pattern.',
              },
              picks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    releaseYear: { type: Type.NUMBER },
                    genre: { type: Type.STRING },
                    whyRecommended: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        curatorSummary: parsed.curatorSummary || 'Curated analysis based on your private viewing history.',
        picks: Array.isArray(parsed.picks) ? parsed.picks : [],
        mode: 'gemini_assisted',
      });
    } catch (error) {
      res.status(200).json({
        curatorSummary: `Deterministic synthesis from your recent viewings (${watchedTitles.slice(0, 5).join(', ') || 'your library'}): prioritizing high-craft cinema in ${favouriteGenres.slice(0, 2).join(' & ') || 'Military Drama & Thriller'}.`,
        picks: [],
        mode: 'deterministic_fallback',
        notice: error instanceof Error ? error.message : 'Using deterministic recommendation engine.',
      });
    }
  });

  // Protected User-Scoped Security Verification Endpoint (Mandatory Scenario 9)
  app.get('/api/user/:uid/security-verify', requireStrictUidOwnership, (req, res) => {
    res.json({
      verified: true,
      uid: req.params.uid,
      isolationModel: 'users/{uid}/...',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // NEXUS SOCIAL — REAL-TIME 3D MULTIPLAYER CINEMA API ROUTES
  // ============================================================================

  // Validate a media URL via NEXUS MEDIA GATEWAY
  app.post('/api/social/media/validate', requireAuthenticatedUser, (req, res) => {
    const { url, title } = req.body as { url?: string; title?: string };
    const result = validateAndClassifyMediaSource(String(url || ''), title);
    res.json({ mediaSource: result });
  });

  // Inspect a website URL for In-App Browser iframe compatibility (X-Frame-Options & CSP frame-ancestors)
  app.get('/api/social/browser/inspect', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      res.status(400).json({ canEmbed: false, reason: 'Please enter a valid website URL or search query.' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`);
    } catch {
      res.json({
        url: rawUrl,
        host: rawUrl,
        canEmbed: false,
        reason: 'Malformed URL format.',
      });
      return;
    }

    const host = parsed.hostname.toLowerCase();
    // Known sites that strictly block cross-origin iframes via X-Frame-Options: DENY / SAMEORIGIN
    const knownFrameBlocked = [
      'google.com',
      'www.google.com',
      'youtube.com',
      'www.youtube.com',
      'netflix.com',
      'www.netflix.com',
      'primevideo.com',
      'www.primevideo.com',
      'disneyplus.com',
      'www.disneyplus.com',
      'github.com',
      'twitter.com',
      'x.com',
      'reddit.com',
      'www.reddit.com',
      'imdb.com',
      'www.imdb.com',
      'letterboxd.com',
      'bingr.one',
      'www.bingr.one',
      'cinejoy.to',
    ];

    if (knownFrameBlocked.some((d) => host === d || host.endsWith(`.${d}`))) {
      res.json({
        url: parsed.toString(),
        host,
        canEmbed: false,
        reason: `${host} sets X-Frame-Options / CSP frame-ancestors security headers that disallow embedded browsing. Use "Open in External Browser" below to view it directly.`,
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(parsed.toString(), {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CineShelfNexusBrowser/1.0)',
        },
      });
      clearTimeout(timer);

      const xfo = (response.headers.get('x-frame-options') || '').toLowerCase();
      const csp = (response.headers.get('content-security-policy') || '').toLowerCase();

      if (xfo.includes('deny') || xfo.includes('sameorigin')) {
        res.json({
          url: parsed.toString(),
          host,
          canEmbed: false,
          reason: `${host} blocks embedded viewing via X-Frame-Options (${xfo.toUpperCase()}).`,
        });
        return;
      }

      if (csp.includes('frame-ancestors')) {
        const match = csp.split(';').find((dir) => dir.trim().startsWith('frame-ancestors'));
        if (match && (match.includes("'none'") || match.includes("'self'"))) {
          res.json({
            url: parsed.toString(),
            host,
            canEmbed: false,
            reason: `${host} restricts iframe embedding via Content-Security-Policy (${match.trim()}).`,
          });
          return;
        }
      }

      res.json({
        url: parsed.toString(),
        host,
        canEmbed: true,
        reason: 'Verified embeddable in NEXUS In-App Browser.',
      });
    } catch {
      clearTimeout(timer);
      // If HEAD fails or times out, allow iframe attempt while providing external browser fallback
      res.json({
        url: parsed.toString(),
        host,
        canEmbed: true,
        reason: 'Attempting direct iframe load. If blocked by browser security, use Open in External Browser.',
      });
    }
  });

  // Upload personal video file to room session storage for synchronized multiplayer playback
  app.post('/api/social/rooms/:roomId/media/upload', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: RequestSessionContext }).authUser;
    const roomId = req.params.roomId;
    let room;
    try {
      room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
    } catch {
      res.status(404).json({ error: 'Room not found or user is not a participant.' });
      return;
    }

    const p = room.participants[authUser.uid];
    if (p.role !== 'host' && p.role !== 'co_host') {
      res.status(403).json({ error: 'Only the Host or Co-Host can upload shared media to this theatre room.' });
      return;
    }

    const rawFilename = req.headers['x-media-filename'] || 'shared-movie.mp4';
    const fileName = decodeURIComponent(Array.isArray(rawFilename) ? rawFilename[0] : rawFilename);
    const mimeType = String(req.headers['content-type'] || 'video/mp4').toLowerCase();

    // 500 MB session limit
    const MAX_MEDIA_BYTES = 500 * 1024 * 1024;
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_MEDIA_BYTES) {
      res.status(413).json({ error: 'File size exceeds the 500MB session streaming limit.' });
      return;
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeExt = path.extname(fileName) || '.mp4';
    const filePath = path.join(ROOM_MEDIA_DIR, `${roomId}-${fileId}${safeExt}`);

    // If an existing file exists for this room, unlink it
    const existing = roomSharedMediaMap.get(roomId);
    if (existing) {
      try {
        if (fs.existsSync(existing.localPath)) {
          fs.unlinkSync(existing.localPath);
        }
      } catch {
        // ignore
      }
    }

    const writeStream = fs.createWriteStream(filePath);
    let bytesReceived = 0;
    let isAborted = false;

    req.on('data', (chunk: Buffer) => {
      if (isAborted) return;
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_MEDIA_BYTES) {
        isAborted = true;
        writeStream.destroy();
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
        res.status(413).json({ error: 'File size exceeds the 500MB session streaming limit.' });
        return;
      }
      writeStream.write(chunk);
    });

    req.on('end', () => {
      if (isAborted) return;
      writeStream.end();
    });

    writeStream.on('finish', () => {
      if (isAborted) return;
      const stats = fs.statSync(filePath);
      const record: RoomSharedMediaRecord = {
        roomId,
        fileId,
        fileName,
        mimeType,
        fileSize: stats.size,
        localPath: filePath,
        uploadedAt: Date.now(),
        hostUid: authUser.uid,
      };
      roomSharedMediaMap.set(roomId, record);

      const sizeFormatted = stats.size > 1024 * 1024 * 1024
        ? `${(stats.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : `${(stats.size / (1024 * 1024)).toFixed(1)} MB`;

      const streamUrl = `/api/social/rooms/${roomId}/media/stream`;
      const playback = socialCinemaManager.controlPlayback({
        roomId,
        uid: authUser.uid,
        action: 'set_source',
        sourceUrl: streamUrl,
        sourceTitle: fileName,
        sourceConfig: {
          id: `room-shared-${fileId}`,
          url: streamUrl,
          title: fileName,
          sourceType: 'room_shared_file',
          providerName: 'Host Shared Media Server',
          isAuthorized: true,
          supportsAutoSync: true,
          fileName,
          mimeType,
          fileSizeFormatted: sizeFormatted,
        },
      });

      broadcastRoomState(roomId, 'playback_updated', { playback });

      res.json({
        success: true,
        streamUrl,
        fileId,
        fileName,
        fileSize: stats.size,
        fileSizeFormatted: sizeFormatted,
        playback,
      });
    });

    writeStream.on('error', (err) => {
      if (isAborted) return;
      isAborted = true;
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      res.status(500).json({ error: 'Failed to save media upload on server: ' + err.message });
    });

    req.on('error', (err) => {
      if (isAborted) return;
      isAborted = true;
      writeStream.destroy();
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      res.status(500).json({ error: 'Stream error during media upload.' });
    });
  });

  // Stream shared room media supporting HTTP 206 Partial Content (range requests)
  app.get('/api/social/rooms/:roomId/media/stream', (req, res) => {
    const roomId = req.params.roomId;
    const media = roomSharedMediaMap.get(roomId);
    if (!media || !fs.existsSync(media.localPath)) {
      res.status(404).json({ error: 'No media currently shared for this room.' });
      return;
    }

    const stat = fs.statSync(media.localPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(media.localPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': media.mimeType,
        'Cache-Control': 'no-cache',
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': media.mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(media.localPath).pipe(res);
    }
  });

  // Remove shared room media and revert to default cinema stream
  app.delete('/api/social/rooms/:roomId/media', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: RequestSessionContext }).authUser;
    const roomId = req.params.roomId;
    let room;
    try {
      room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
    } catch {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    const p = room.participants[authUser.uid];
    if (p.role !== 'host') {
      res.status(403).json({ error: 'Only the room host can remove shared media.' });
      return;
    }

    const media = roomSharedMediaMap.get(roomId);
    if (media) {
      try {
        if (fs.existsSync(media.localPath)) fs.unlinkSync(media.localPath);
      } catch {
        // ignore
      }
      roomSharedMediaMap.delete(roomId);
    }

    const playback = socialCinemaManager.controlPlayback({
      roomId,
      uid: authUser.uid,
      action: 'set_source',
      sourceUrl: CURATED_DIRECT_CINEMA_STREAMS[0].url,
      sourceTitle: CURATED_DIRECT_CINEMA_STREAMS[0].title,
    });
    broadcastRoomState(roomId, 'playback_updated', { playback });
    res.json({ success: true, playback });
  });

  // Create a 3D cinema room (Bot Sandbox allowed for Guests & Logged-in users; Friends room requires Friend Mode login)
  app.post('/api/social/rooms', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: RequestSessionContext }).authUser;
    const { roomName, hostName, roomMode, theme, capacity, appearance } = req.body as {
      roomName?: string;
      hostName?: string;
      roomMode?: 'bot_sandbox' | 'friends';
      theme?: TheatreThemeId;
      capacity?: RoomCapacityOption;
      appearance?: CharacterAppearance;
    };

    const requestedMode: 'bot_sandbox' | 'friends' =
      roomMode === 'bot_sandbox' ? 'bot_sandbox' : 'friends';

    // Server-side enforcement: Guests may freely create 'bot_sandbox' 3D theatres to test controls & AI bots,
    // but creating a private multiplayer room with friends requires Friend Mode login.
    if (requestedMode === 'friends' && authUser.accessMode === 'guest') {
      res.status(403).json({
        error: 'FRIEND_LOGIN_REQUIRED: Please log in to create a private multiplayer room with friends. Guests can freely use the 3D theatre with AI bots.',
        code: 'FRIEND_LOGIN_REQUIRED',
      });
      return;
    }

    try {
      const room = socialCinemaManager.createRoom({
        hostUid: authUser.uid,
        hostName: String(hostName || appearance?.displayName || authUser.displayName || 'Cinema Host').slice(0, 60),
        roomName: String(
          roomName ||
            (requestedMode === 'bot_sandbox'
              ? '3D Cinema Practice & AI Bots'
              : 'NEXUS Private 3D Premiere')
        ).slice(0, 80),
        roomMode: requestedMode,
        theme,
        capacity,
        appearance,
      });
      res.status(201).json({ room });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to create room.',
      });
    }
  });

  // Join a friend's private 3D cinema room by invitation code (Requires Friend Mode login)
  app.post('/api/social/rooms/join', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: RequestSessionContext }).authUser;

    // Server-side enforcement: Guests cannot join friend multiplayer rooms until logged in
    if (authUser.accessMode === 'guest') {
      res.status(403).json({
        error: 'FRIEND_LOGIN_REQUIRED: Please log in to join a friend’s multiplayer room.',
        code: 'FRIEND_LOGIN_REQUIRED',
      });
      return;
    }

    const { inviteCode, displayName, appearance } = req.body as {
      inviteCode?: string;
      displayName?: string;
      appearance?: CharacterAppearance;
    };

    try {
      const room = socialCinemaManager.joinRoomByInviteCode({
        uid: authUser.uid,
        displayName: String(displayName || appearance?.displayName || authUser.displayName || 'CineShelf Member').slice(0, 60),
        inviteCode: String(inviteCode || ''),
        appearance,
      });
      broadcastRoomState(room.roomId, 'room_snapshot', { room });
      res.json({ room });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join room.';
      const status =
        message.startsWith('ROOM_CAPACITY_FULL') || message.startsWith('ROOM_LOCKED')
          ? 409
          : message.startsWith('RATE_LIMITED')
          ? 429
          : 400;
      res.status(status).json({ error: message });
    }
  });

  // Upgrade an active Guest / Bot Sandbox room into a Friend Mode multiplayer room without resetting the 3D theatre
  app.post('/api/social/rooms/:roomId/upgrade-to-friends', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: RequestSessionContext }).authUser;
    if (authUser.accessMode === 'guest') {
      res.status(403).json({
        error: 'FRIEND_LOGIN_REQUIRED: Log in to upgrade this theatre to Friend Mode.',
        code: 'FRIEND_LOGIN_REQUIRED',
      });
      return;
    }

    const { previousGuestUid, displayName } = (req.body || {}) as {
      previousGuestUid?: string;
      displayName?: string;
    };

    try {
      const room = socialCinemaManager.upgradeBotRoomToFriendsRoom({
        roomId: req.params.roomId,
        previousHostUid: previousGuestUid,
        newHostUid: authUser.uid,
        newHostName: String(displayName || authUser.displayName || 'Cinema Host').slice(0, 60),
      });
      broadcastRoomState(room.roomId, 'room_snapshot', { room });
      res.json({ room });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Unable to upgrade room.',
      });
    }
  });

  // Fetch authoritative room state (members only)
  app.get('/api/social/rooms/:roomId', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: { uid: string } }).authUser;
    try {
      const room = socialCinemaManager.getRoomForMember(req.params.roomId, authUser.uid);
      res.json({ room });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Access denied.',
      });
    }
  });

  // Perform an authoritative room action (movement, refreshment, seat, emote, chat, playback, moderation, leave)
  app.post('/api/social/rooms/:roomId/action', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: { uid: string } }).authUser;
    const roomId = req.params.roomId;
    const body = req.body as Record<string, any>;
    const actionType = String(body.type || '');

    try {
      switch (actionType) {
        case 'move': {
          const { participant, collided } = socialCinemaManager.updateParticipantMovement({
            roomId,
            authenticatedUid: authUser.uid,
            targetUid: body.targetUid,
            x: Number(body.x ?? 0),
            y: typeof body.y === 'number' ? Number(body.y) : undefined,
            z: Number(body.z ?? 10),
            rotationY: Number(body.rotationY ?? Math.PI),
            animation: body.animation as CharacterAnimationState | undefined,
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'participant_updated', { participant });
          res.json({ participant, collided, room });
          return;
        }
        case 'refreshment': {
          const participant = socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: authUser.uid,
            action: body.action,
            itemVariant: body.itemVariant as RefreshmentItemType | undefined,
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'participant_updated', { participant });
          res.json({ participant, room });
          return;
        }
        case 'seat': {
          const participant = socialCinemaManager.toggleSeat({
            roomId,
            uid: authUser.uid,
            requestedSeatIndex:
              typeof body.seatIndex === 'number' ? body.seatIndex : undefined,
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'participant_updated', { participant });
          res.json({ participant, room });
          return;
        }
        case 'emote': {
          const participant = socialCinemaManager.triggerEmote({
            roomId,
            uid: authUser.uid,
            emote: body.emote as SocialEmoteId,
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'participant_updated', { participant });
          res.json({ participant, room });
          return;
        }
        case 'chat': {
          const message = socialCinemaManager.sendChatMessage({
            roomId,
            uid: authUser.uid,
            text: String(body.text || ''),
            isNearbyOnly: Boolean(body.isNearbyOnly),
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'chat_message', { message });
          res.json({ message, room });
          return;
        }
        case 'playback': {
          const playback = socialCinemaManager.controlPlayback({
            roomId,
            uid: authUser.uid,
            action: body.action,
            positionSeconds:
              typeof body.positionSeconds === 'number' ? body.positionSeconds : undefined,
            durationSeconds:
              typeof body.durationSeconds === 'number' ? body.durationSeconds : undefined,
            sourceUrl: body.sourceUrl,
            sourceTitle: body.sourceTitle,
            sourceConfig: body.sourceConfig,
            playbackSpeed:
              typeof body.playbackSpeed === 'number' ? body.playbackSpeed : undefined,
            pictureFitMode: body.pictureFitMode,
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'playback_updated', { playback });
          res.json({ playback, room });
          return;
        }
        case 'theme': {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error('HOST_ONLY: Only the room host can change the 3D theatre theme.');
          }
          room.theme = body.theme as TheatreThemeId;
          room.updatedAtMs = Date.now();
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'voice_state': {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          const p = room.participants[authUser.uid];
          if (typeof body.isMuted === 'boolean') p.isMuted = body.isMuted;
          if (typeof body.isSpeaking === 'boolean') p.isSpeaking = body.isSpeaking && !p.isMuted && !p.isHostMuted;
          if (body.voiceMode) p.voiceMode = body.voiceMode;
          broadcastRoomState(roomId, 'participant_updated', { participant: p });
          res.json({ participant: p, room });
          return;
        }
        case 'regenerate_invite': {
          const inviteCode = socialCinemaManager.regenerateInviteCode(roomId, authUser.uid);
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ inviteCode, room });
          return;
        }
        case 'revoke_invite': {
          socialCinemaManager.revokeInviteCode(roomId, authUser.uid);
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'lock_room': {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error('HOST_ONLY: Only the host can lock or unlock the room.');
          }
          room.isLocked = Boolean(body.isLocked);
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'transfer_host': {
          const room = socialCinemaManager.transferHost({
            roomId,
            currentHostUid: authUser.uid,
            newHostUid: String(body.newHostUid || ''),
          });
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'promote_cohost': {
          const room = socialCinemaManager.promoteCoHost({
            roomId,
            hostUid: authUser.uid,
            targetUid: String(body.targetUid || ''),
            makeCoHost: Boolean(body.makeCoHost),
          });
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'kick_member': {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error('HOST_ONLY: Only the host can remove a participant.');
          }
          const targetUid = String(body.targetUid || '');
          if (targetUid && targetUid !== authUser.uid) {
            socialCinemaManager.leaveRoom(roomId, targetUid);
          }
          broadcastRoomState(roomId, 'room_snapshot', { room });
          res.json({ room });
          return;
        }
        case 'leave': {
          const outcome = socialCinemaManager.leaveRoom(roomId, authUser.uid);
          try {
            const room = socialCinemaManager.getRoomForMember(roomId, outcome.promotedHostUid || '');
            broadcastRoomState(roomId, 'room_snapshot', { room });
          } catch {
            // Room may have no remaining members
          }
          res.json({ left: true, ...outcome });
          return;
        }
        default:
          res.status(400).json({ error: `Unknown action type: ${actionType}` });
      }
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Action rejected by authoritative server.',
      });
    }
  });

  // Multi-Participant Load Simulator (populates up to capacity or N synthetic 3D participants for live stress testing)
  app.post('/api/social/rooms/:roomId/simulate-load', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: { uid: string } }).authUser;
    const roomId = req.params.roomId;
    const targetCount = Math.min(35, Math.max(1, Number(req.body?.targetCount || 30)));

    try {
      const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      if (room.hostUid !== authUser.uid) {
        res.status(403).json({ error: 'HOST_ONLY: Only the room host can trigger the load simulator.' });
        return;
      }

      const maxAllowed = Math.min(room.capacity, targetCount, 35);
      let addedCount = 0;
      let idx = 1;

      while (Object.keys(room.participants).length < maxAllowed && idx <= 50) {
        const simUid = `sim_patron_${idx}`;
        idx += 1;
        if (room.participants[simUid]) continue;

        const simName = `Patron #${Object.keys(room.participants).length + 1}`;
        const appearance = generateDefaultAppearanceForUid(simUid, simName);
        socialCinemaManager.joinRoomByInviteCode({
          uid: simUid,
          displayName: simName,
          inviteCode: room.inviteCode,
          appearance,
        });

        // Have ~75% of simulated patrons take a stadium seat and some hold popcorn/drinks
        if (idx % 4 !== 0) {
          socialCinemaManager.toggleSeat({ roomId, uid: simUid });
        }
        if (idx % 3 === 0) {
          socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: simUid,
            action: 'pickup_popcorn',
            itemVariant: idx % 2 === 0 ? 'popcorn_butter' : 'popcorn_caramel',
          });
        } else if (idx % 5 === 0) {
          socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: simUid,
            action: 'pickup_drink',
            itemVariant: 'drink_cola',
          });
        }
        addedCount += 1;
      }

      const updatedRoom = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      broadcastRoomState(roomId, 'room_snapshot', { room: updatedRoom });
      res.json({
        addedCount,
        totalParticipants: Object.keys(updatedRoom.participants).length,
        capacity: updatedRoom.capacity,
        room: updatedRoom,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Simulation failed.',
      });
    }
  });

  // Ephemeral Voice SFU Token Endpoint (Part 5 Section 4: Never expose secret keys in frontend code)
  app.post('/api/social/rooms/:roomId/voice-token', requireAuthenticatedUser, (req, res) => {
    const authUser = (req as Request & { authUser: { uid: string } }).authUser;
    const roomId = req.params.roomId;
    try {
      const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      const livekitWsUrl = (process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || '').trim();
      const sfuConfigured = Boolean(
        livekitWsUrl &&
          process.env.LIVEKIT_API_KEY?.trim() &&
          process.env.LIVEKIT_API_SECRET?.trim()
      );
      res.json({
        roomId: room.roomId,
        uid: authUser.uid,
        sfuConfigured,
        sfuUrl: livekitWsUrl || null,
        livekitWsUrl: livekitWsUrl || null,
        ephemeralToken: `nexus-sfu-ephemeral-${room.roomId}-${authUser.uid}-${Date.now()}`,
        spatialAudioMode: 'webrtc_mesh_and_panner_3d',
        expiresAtMs: Date.now() + 1000 * 60 * 30,
      });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Not authorized for room voice channel.',
      });
    }
  });

  return app;
}

export function createHttpServerAndApp() {
  const roomSockets = new Map<string, Set<WebSocket>>();

  const broadcastToRoom = (roomId: string, eventType: string, payload: unknown) => {
    const clients = roomSockets.get(roomId);
    if (!clients || clients.size === 0) return;
    const messageStr = JSON.stringify({
      type: eventType,
      roomId,
      timestampMs: Date.now(),
      ...(payload as Record<string, unknown>),
    });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  };

  const app = createApp(broadcastToRoom);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const requestOrigin = String(request.headers.origin || '');
      if (requestOrigin && !getAllowedCorsOrigins().has(requestOrigin)) {
        socket.end('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\n\\r\\n');
        socket.destroy();
        return;
      }
      const protocolHeader = String(request.headers['sec-websocket-protocol'] || '');
      if (protocolHeader.includes('vite-hmr') || protocolHeader.includes('vite-ping')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          if (protocolHeader.includes('vite-hmr')) {
            ws.send(JSON.stringify({ type: 'connected' }));
          }
          ws.on('error', () => {
            // Ignore transient client socket errors
          });
        });
        return;
      }
      if (url.pathname === '/ws/nexus-social') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
        return;
      }
      socket.destroy();
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    let subscribedRoomId: string | null = null;
    let authenticatedUid: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'subscribe') {
          const tokenInfo = decodeBearerToken(String(msg.token || ''));
          if (!tokenInfo) {
            ws.send(JSON.stringify({ type: 'error', error: 'UNAUTHENTICATED' }));
            return;
          }
          const roomId = String(msg.roomId || '');
          const room = socialCinemaManager.getRoomForMember(roomId, tokenInfo.uid);
          authenticatedUid = tokenInfo.uid;
          subscribedRoomId = roomId;

          if (!roomSockets.has(roomId)) {
            roomSockets.set(roomId, new Set());
          }
          roomSockets.get(roomId)!.add(ws);
          ws.send(JSON.stringify({ type: 'room_snapshot', room }));
          return;
        }

        if (!authenticatedUid || !subscribedRoomId) {
          ws.send(JSON.stringify({ type: 'error', error: 'NOT_SUBSCRIBED' }));
          return;
        }

        if (msg.type === 'move') {
          const { participant, collided } = socialCinemaManager.updateParticipantMovement({
            roomId: subscribedRoomId,
            authenticatedUid,
            x: Number(msg.x ?? 0),
            y: typeof msg.y === 'number' ? Number(msg.y) : undefined,
            z: Number(msg.z ?? 10),
            rotationY: Number(msg.rotationY ?? Math.PI),
            animation: msg.animation,
          });
          broadcastToRoom(subscribedRoomId, 'participant_updated', { participant, collided });
        } else if (msg.type === 'heartbeat') {
          const room = socialCinemaManager.getRoomForMember(subscribedRoomId, authenticatedUid);
          ws.send(
            JSON.stringify({
              type: 'playback_updated',
              playback: room.playback,
              serverTimestampMs: Date.now(),
            })
          );
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : 'Invalid WebSocket message',
          })
        );
      }
    });

    ws.on('close', () => {
      if (subscribedRoomId && roomSockets.has(subscribedRoomId)) {
        roomSockets.get(subscribedRoomId)!.delete(ws);
      }
      if (subscribedRoomId && authenticatedUid) {
        try {
          const outcome = socialCinemaManager.leaveRoom(subscribedRoomId, authenticatedUid);
          if (outcome.promotedHostUid) {
            const room = socialCinemaManager.getRoomForMember(subscribedRoomId, outcome.promotedHostUid);
            broadcastToRoom(subscribedRoomId, 'room_snapshot', {
              room,
              notification: `Host disconnected. Host authority transferred to ${room.hostName}.`,
            });
          }
        } catch {
          // ignore
        }
      }
    });
  });

  return { app, server, wss };
}

async function startServer() {
  const { app, server } = createHttpServerAndApp();
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });

    // Neutralize HMR WebSocket connection in /@vite/client when HMR is disabled behind Cloud Run proxy
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (transformed?.code) {
          const safeClientCode = transformed.code
            .replace(
              /transport\.connect\(createHMRHandler\(handleMessage\)\);/g,
              '/* HMR WebSocket disabled */'
            )
            .replace(
              /setupForwardConsoleHandler\(transport,\s*forwardConsole\);/g,
              '/* forwardConsole disabled */'
            )
            .replace(
              /reject\(\/\* @__PURE__ \*\/ new Error\("WebSocket closed without opened\."\)\);/g,
              'resolve();'
            )
            .replace(
              /reject\(new Error\("WebSocket closed without opened\."\)\);/g,
              'resolve();'
            );
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.status(200).send(safeClientCode);
          return;
        }
      } catch {
        // Fall through to default vite middleware
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`CineShelf NEXUS full-stack + WebSocket server running on http://0.0.0.0:${port}`);
  });
}

// Only start listening if server.ts is executed directly (allows unit testing createApp())
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer();
}
