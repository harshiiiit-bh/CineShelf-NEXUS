import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type AccessMode = 'guest' | 'friend';

export interface PublicAuthSession {
  uid: string;
  accessMode: AccessMode;
  displayName: string;
  guestId?: string;
  loginId?: string;
  createdAtMs: number;
  lastActiveAtMs: number;
  expiresAtMs: number;
  inactivityTimeoutMinutes: number;
  migratedFromGuestUid?: string;
}

export interface IssuedTemporaryCredentials {
  loginId: string;
  loginCode: string;
  displayName: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

interface StoredAccountRecord {
  uid: string;
  loginId: string;
  displayName: string;
  salt: string;
  codeHash: string;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
}

interface StoredSessionRecord {
  token: string;
  uid: string;
  accessMode: AccessMode;
  displayName: string;
  guestId?: string;
  loginId?: string;
  createdAtMs: number;
  lastActiveAtMs: number;
  expiresAtMs: number;
  inactivityTimeoutMs: number;
  migratedFromGuestUid?: string;
  revoked: boolean;
}

const SAFE_ALPHANUM = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SAFE_DIGITS = '23456789';

function randomChars(alphabet: string, length: number): string {
  const bytes = crypto.randomBytes(length);
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(alphabet[bytes[i] % alphabet.length]);
  }
  return out.join('');
}

function hashLoginCode(loginCode: string, salt: string): string {
  const normalized = loginCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}

export function normalizeLoginId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const withoutPrefix = cleaned.startsWith('NXID') ? cleaned.slice(4) : cleaned;
  if (withoutPrefix.length === 8) {
    return `NXID-${withoutPrefix.slice(0, 4)}-${withoutPrefix.slice(4, 8)}`;
  }
  return String(raw || '').trim().toUpperCase();
}

export function normalizeLoginCode(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return String(raw || '').trim().toUpperCase();
}

export class TemporaryAuthServerManager {
  private accountsByLoginId = new Map<string, StoredAccountRecord>();
  private accountsByUid = new Map<string, StoredAccountRecord>();
  private sessionsByToken = new Map<string, StoredSessionRecord>();
  private activeGuestIds = new Set<string>();
  private loginAttempts = new Map<string, { count: number; windowStartMs: number }>();

  constructor() {
    this.loadPersistedState();
  }

  /**
   * Creates an instant, frictionless temporary Guest Session with a unique Guest ID.
   */
  public createGuestSession(params?: {
    displayName?: string;
    inactivityTimeoutMinutes?: number;
    nowMs?: number;
  }): {
    sessionToken: string;
    session: PublicAuthSession;
  } {
    const nowMs = params?.nowMs ?? Date.now();
    const timeoutMins = Math.min(
      180,
      Math.max(1, Number(params?.inactivityTimeoutMinutes ?? 30))
    );
    const inactivityTimeoutMs = timeoutMins * 60 * 1000;

    let shortCode = randomChars(SAFE_ALPHANUM, 6);
    let guestId = `GUEST-${shortCode}`;
    while (this.activeGuestIds.has(guestId)) {
      shortCode = randomChars(SAFE_ALPHANUM, 6);
      guestId = `GUEST-${shortCode}`;
    }
    this.activeGuestIds.add(guestId);

    const uid = `guest_${shortCode.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanName = String(params?.displayName || '').trim();
    const displayName = cleanName
      ? cleanName.slice(0, 40)
      : `Guest ${shortCode.slice(0, 4)}`;

    const sessionToken = `gst_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAtMs = nowMs + inactivityTimeoutMs;

    const record: StoredSessionRecord = {
      token: sessionToken,
      uid,
      accessMode: 'guest',
      displayName,
      guestId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs,
      inactivityTimeoutMs,
      revoked: false,
    };

    this.sessionsByToken.set(sessionToken, record);
    this.persistState();

    return {
      sessionToken,
      session: this.toPublicSession(record),
    };
  }

  /**
   * Registers a passwordless temporary Friend-Mode account using a Display Name.
   * Generates a unique Login ID (NXID-XXXX-XXXX) and secure Temporary Login Code (XXXX-XXXX).
   * Preserves display name and guest transition metadata when upgrading from a Guest session.
   */
  public registerTemporaryAccount(params: {
    displayName: string;
    guestToken?: string;
    guestUid?: string;
    nowMs?: number;
  }): {
    sessionToken: string;
    session: PublicAuthSession;
    credentials: IssuedTemporaryCredentials;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const rawName = String(params.displayName || '').trim();
    if (rawName.length < 2) {
      throw new Error('INVALID_DISPLAY_NAME: Please enter a display name (at least 2 characters).');
    }
    const displayName = rawName.slice(0, 40);

    let loginId = `NXID-${randomChars(SAFE_ALPHANUM, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    while (this.accountsByLoginId.has(loginId)) {
      loginId = `NXID-${randomChars(SAFE_ALPHANUM, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    }

    const loginCode = `${randomChars(SAFE_DIGITS, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashLoginCode(loginCode, salt);
    const uid = `usr_${loginId.replace(/[^A-Z0-9]/g, '').toLowerCase()}_${crypto
      .randomBytes(3)
      .toString('hex')}`;

    const accountTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const accountRecord: StoredAccountRecord = {
      uid,
      loginId,
      displayName,
      salt,
      codeHash,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs,
    };

    this.accountsByLoginId.set(loginId, accountRecord);
    this.accountsByUid.set(uid, accountRecord);

    let migratedFromGuestUid = params.guestUid;
    if (params.guestToken) {
      const prevGuest = this.sessionsByToken.get(params.guestToken);
      if (prevGuest && prevGuest.accessMode === 'guest') {
        migratedFromGuestUid = prevGuest.uid;
        prevGuest.revoked = true;
      }
    }

    const sessionToken = `usr_${crypto.randomBytes(24).toString('hex')}`;
    const sessionRecord: StoredSessionRecord = {
      token: sessionToken,
      uid,
      accessMode: 'friend',
      displayName,
      loginId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs,
      inactivityTimeoutMs: accountTtlMs,
      migratedFromGuestUid,
      revoked: false,
    };

    this.sessionsByToken.set(sessionToken, sessionRecord);
    this.persistState();

    return {
      sessionToken,
      session: this.toPublicSession(sessionRecord),
      credentials: {
        loginId,
        loginCode,
        displayName,
        issuedAtMs: nowMs,
        expiresAtMs: accountRecord.expiresAtMs,
      },
    };
  }

  /**
   * Authenticates a user on any device using their Login ID and Temporary Login Code.
   */
  public loginWithTemporaryCode(params: {
    loginId: string;
    loginCode: string;
    guestToken?: string;
    guestUid?: string;
    nowMs?: number;
  }): {
    sessionToken: string;
    session: PublicAuthSession;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const normalizedId = normalizeLoginId(params.loginId);
    const normalizedCode = normalizeLoginCode(params.loginCode);

    if (!normalizedId || !normalizedCode) {
      throw new Error('INVALID_CREDENTIALS: Both Login ID and Temporary Login Code are required.');
    }

    this.checkRateLimit(normalizedId, nowMs);

    const account = this.accountsByLoginId.get(normalizedId);
    if (!account) {
      this.recordFailedAttempt(normalizedId, nowMs);
      throw new Error('INVALID_CREDENTIALS: Login ID not found or incorrect Temporary Login Code.');
    }

    if (nowMs > account.expiresAtMs) {
      throw new Error('CREDENTIALS_EXPIRED: This temporary login account has expired. Please create a new temporary login.');
    }

    const computedHash = hashLoginCode(normalizedCode, account.salt);
    if (computedHash !== account.codeHash) {
      this.recordFailedAttempt(normalizedId, nowMs);
      throw new Error('INVALID_CREDENTIALS: Login ID not found or incorrect Temporary Login Code.');
    }

    let migratedFromGuestUid = params.guestUid;
    if (params.guestToken) {
      const prevGuest = this.sessionsByToken.get(params.guestToken);
      if (prevGuest && prevGuest.accessMode === 'guest') {
        migratedFromGuestUid = prevGuest.uid;
        prevGuest.revoked = true;
      }
    }

    const accountTtlMs = 7 * 24 * 60 * 60 * 1000;
    const sessionToken = `usr_${crypto.randomBytes(24).toString('hex')}`;
    const sessionRecord: StoredSessionRecord = {
      token: sessionToken,
      uid: account.uid,
      accessMode: 'friend',
      displayName: account.displayName,
      loginId: account.loginId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs,
      inactivityTimeoutMs: accountTtlMs,
      migratedFromGuestUid,
      revoked: false,
    };

    this.sessionsByToken.set(sessionToken, sessionRecord);
    this.persistState();

    return {
      sessionToken,
      session: this.toPublicSession(sessionRecord),
    };
  }

  /**
   * Validates a Bearer session token and enforces inactivity expiration for Guest sessions
   * and TTL expiration for Friend-Mode sessions.
   */
  public validateSessionToken(
    token: string,
    options?: { nowMs?: number; touchActivity?: boolean }
  ): PublicAuthSession | null {
    if (!token) return null;
    const nowMs = options?.nowMs ?? Date.now();
    const touch = options?.touchActivity ?? true;

    let record = this.sessionsByToken.get(token);

    // Auto-recover valid guest session tokens if memory was cleared or server restarted
    if (process.env.NODE_ENV !== 'production' && !record && token.startsWith('gst_') && /^gst_[a-zA-Z0-9_\-]{8,64}$/.test(token)) {
      const shortCode = token.slice(4, 10).toUpperCase();
      const guestId = `GUEST-${shortCode}`;
      const uid = `guest_${shortCode.toLowerCase()}`;
      record = {
        token,
        uid,
        accessMode: 'guest',
        displayName: `Guest ${shortCode.slice(0, 4)}`,
        guestId,
        createdAtMs: nowMs,
        lastActiveAtMs: nowMs,
        expiresAtMs: nowMs + 30 * 60 * 1000,
        inactivityTimeoutMs: 30 * 60 * 1000,
        revoked: false,
      };
      this.sessionsByToken.set(token, record);
      this.activeGuestIds.add(guestId);
      this.persistState();
    }

    if (!record || record.revoked) {
      return null;
    }

    if (record.accessMode === 'guest') {
      const idleMs = nowMs - record.lastActiveAtMs;
      if (idleMs > record.inactivityTimeoutMs || nowMs > record.expiresAtMs) {
        record.revoked = true;
        this.persistState();
        return null;
      }
      if (touch) {
        record.lastActiveAtMs = nowMs;
        record.expiresAtMs = nowMs + record.inactivityTimeoutMs;
      }
    } else {
      if (nowMs > record.expiresAtMs) {
        record.revoked = true;
        this.persistState();
        return null;
      }
      if (touch) {
        record.lastActiveAtMs = nowMs;
      }
    }

    return this.toPublicSession(record);
  }

  /**
   * Updates display name or guest inactivity timeout for an active session.
   */
  public updateSessionConfig(
    token: string,
    updates: { displayName?: string; inactivityTimeoutMinutes?: number; nowMs?: number }
  ): PublicAuthSession {
    const nowMs = updates.nowMs ?? Date.now();
    const current = this.validateSessionToken(token, { nowMs, touchActivity: true });
    if (!current) {
      throw new Error('SESSION_EXPIRED: Your session has expired.');
    }

    const record = this.sessionsByToken.get(token)!;
    if (typeof updates.displayName === 'string' && updates.displayName.trim().length >= 2) {
      record.displayName = updates.displayName.trim().slice(0, 40);
      const acc = this.accountsByUid.get(record.uid);
      if (acc) {
        acc.displayName = record.displayName;
        acc.updatedAtMs = nowMs;
      }
    }

    if (
      record.accessMode === 'guest' &&
      typeof updates.inactivityTimeoutMinutes === 'number' &&
      Number.isFinite(updates.inactivityTimeoutMinutes)
    ) {
      const mins = Math.min(180, Math.max(1, Math.round(updates.inactivityTimeoutMinutes)));
      record.inactivityTimeoutMs = mins * 60 * 1000;
      record.expiresAtMs = nowMs + record.inactivityTimeoutMs;
    }

    return this.toPublicSession(record);
  }

  public revokeSessionToken(token: string): boolean {
    const record = this.sessionsByToken.get(token);
    if (!record) return false;
    record.revoked = true;
    return true;
  }

  private checkRateLimit(key: string, nowMs: number): void {
    const entry = this.loginAttempts.get(key);
    if (!entry || nowMs - entry.windowStartMs > 60_000) {
      return;
    }
    if (entry.count >= 8) {
      throw new Error(
        'RATE_LIMITED: Too many failed login attempts for this Login ID. Please wait 60 seconds.'
      );
    }
  }

  private recordFailedAttempt(key: string, nowMs: number): void {
    const entry = this.loginAttempts.get(key);
    if (!entry || nowMs - entry.windowStartMs > 60_000) {
      this.loginAttempts.set(key, { count: 1, windowStartMs: nowMs });
    } else {
      entry.count += 1;
    }
  }

  private toPublicSession(record: StoredSessionRecord): PublicAuthSession {
    return {
      uid: record.uid,
      accessMode: record.accessMode,
      displayName: record.displayName,
      guestId: record.guestId,
      loginId: record.loginId,
      createdAtMs: record.createdAtMs,
      lastActiveAtMs: record.lastActiveAtMs,
      expiresAtMs: record.expiresAtMs,
      inactivityTimeoutMinutes: Math.round(record.inactivityTimeoutMs / 60000),
      migratedFromGuestUid: record.migratedFromGuestUid,
    };
  }

  private persistState(): void {
    try {
      const dataDir = path.resolve(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const data = {
        accounts: Array.from(this.accountsByLoginId.values()),
        sessions: Array.from(this.sessionsByToken.values()),
      };
      fs.writeFileSync(path.join(dataDir, 'auth_sessions.json'), JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // In-memory fallback if file system is read-only
    }
  }

  public loadPersistedState(): void {
    // Cloud Run's container filesystem is ephemeral. Never load checked-in or stale local sessions in production.
    if (process.env.NODE_ENV === 'production') return;
    try {
      const filePath = path.resolve(process.cwd(), '.data', 'auth_sessions.json');
      if (!fs.existsSync(filePath)) return;
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.accounts)) {
        for (const acc of data.accounts) {
          this.accountsByLoginId.set(acc.loginId, acc);
          this.accountsByUid.set(acc.uid, acc);
        }
      }
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          this.sessionsByToken.set(s.token, s);
          if (s.guestId) {
            this.activeGuestIds.add(s.guestId);
          }
        }
      }
    } catch {
      // Ignore corrupted cache
    }
  }
}

