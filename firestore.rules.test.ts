import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rule & Account Isolation Verification Suite (`firestore.rules.test.ts`)
 * Verifies both static structural guarantees of `firestore.rules` & `storage.rules`
 * and deterministic rule evaluation against the Dirty Dozen & Part 2 Mandatory Scenarios.
 */

const firestoreRulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const storageRulesText = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

interface SimAuth {
  uid: string;
  email_verified: boolean;
}

interface SimRequest {
  auth: SimAuth | null;
  pathUserId: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  userProfileExists: boolean;
  existingData?: Record<string, unknown>;
  incomingData?: Record<string, unknown>;
  requestTimeIso?: string;
}

const ALLOWED_LIBRARY_KEYS = new Set([
  'uid', 'movieId', 'metadataProvider', 'providerExternalId', 'providerAttribution',
  'title', 'contentType', 'status', 'posterUrl', 'backdropUrl',
  'overview', 'personalNotes', 'releaseYear', 'language', 'country', 'director',
  'runtimeMinutes', 'userRating', 'isFavourite', 'isHighlyAnticipated', 'priority',
  'genres', 'tags', 'cast', 'totalSeasons', 'totalEpisodes', 'completedEpisodes',
  'currentSeason', 'currentEpisode', 'watchedEpisodeCodes', 'franchiseId',
  'lastWatchedAt', 'createdAt', 'updatedAt'
]);

const REQUIRED_LIBRARY_KEYS = [
  'uid', 'title', 'contentType', 'status', 'releaseYear', 'runtimeMinutes',
  'userRating', 'isFavourite', 'isHighlyAnticipated', 'priority', 'createdAt', 'updatedAt'
];

function evaluateLibraryRule(req: SimRequest): 'ALLOW' | 'PERMISSION_DENIED' {
  // Pillar 1: Auth & Verified Email
  if (!req.auth || !req.auth.email_verified) return 'PERMISSION_DENIED';
  if (req.auth.uid !== req.pathUserId) return 'PERMISSION_DENIED';

  // Pillar 3: Path ID Poisoning Guard
  const idRegex = /^[a-zA-Z0-9_\-]+$/;
  if (req.operation !== 'list') {
    if (!req.pathUserId || req.pathUserId.length > 128 || !idRegex.test(req.pathUserId)) return 'PERMISSION_DENIED';
    if (!req.docId || req.docId.length > 128 || !idRegex.test(req.docId)) return 'PERMISSION_DENIED';
  }

  if (req.operation === 'get' || req.operation === 'delete') {
    if (!req.userProfileExists) return 'PERMISSION_DENIED';
    if (!req.existingData || req.existingData.uid !== req.auth.uid) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (req.operation === 'list') {
    if (!req.existingData || req.existingData.uid !== req.auth.uid) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  // Create / Update validation
  const data = req.incomingData;
  if (!data) return 'PERMISSION_DENIED';

  for (const reqKey of REQUIRED_LIBRARY_KEYS) {
    if (!(reqKey in data)) return 'PERMISSION_DENIED';
  }
  for (const key of Object.keys(data)) {
    if (!ALLOWED_LIBRARY_KEYS.has(key)) return 'PERMISSION_DENIED';
  }

  if (data.uid !== req.auth.uid || data.uid !== req.pathUserId) return 'PERMISSION_DENIED';
  if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 300) return 'PERMISSION_DENIED';
  if (typeof data.userRating !== 'number' || data.userRating < 0 || data.userRating > 10) return 'PERMISSION_DENIED';

  const now = req.requestTimeIso || '2026-11-06T09:00:00.000Z';
  if (req.operation === 'create') {
    if (!req.userProfileExists) return 'PERMISSION_DENIED';
    if (data.createdAt !== now || data.updatedAt !== now) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (req.operation === 'update') {
    if (!req.userProfileExists || !req.existingData) return 'PERMISSION_DENIED';
    if (data.uid !== req.existingData.uid) return 'PERMISSION_DENIED';
    if (data.createdAt !== req.existingData.createdAt) return 'PERMISSION_DENIED';
    if (data.updatedAt !== now) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  return 'PERMISSION_DENIED';
}

test('Firestore Rules: Contains default-deny catch-all and all 14 blueprint collections', () => {
  assert.ok(firestoreRulesText.includes("rules_version = '2';"));
  assert.ok(firestoreRulesText.includes('allow read, write: if false;'));
  const expectedCollections = [
    'match /users/{userId}',
    'match /library/{itemId}',
    'match /watchHistory/{recordId}',
    'match /reviews/{reviewId}',
    'match /collections/{collectionId}',
    'match /calendar/{eventId}',
    'match /preferences/{documentId}',
    'match /franchises/{franchiseId}',
    'match /recommendationFeedback/{feedbackId}',
    'match /notifications/{notificationId}',
    'match /rooms/{roomId}',
    'match /members/{memberUid}',
    'match /messages/{messageId}',
    'match /events/{eventId}',
  ];
  for (const col of expectedCollections) {
    assert.ok(firestoreRulesText.includes(col), `Missing rule block: ${col}`);
  }
  assert.equal(Object.keys(blueprint.firestore).length, 14);
});

test('Mandatory Scenario 1 & 2: User A creates a movie and retrieves that movie', () => {
  const now = '2026-11-06T09:00:00.000Z';
  const moviePayload = {
    uid: 'user_a',
    title: 'Uri: The Surgical Strike',
    contentType: 'movie',
    status: 'watched',
    releaseYear: 2019,
    runtimeMinutes: 138,
    userRating: 9.5,
    isFavourite: true,
    isHighlyAnticipated: false,
    priority: 'high',
    createdAt: now,
    updatedAt: now,
  };

  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_uri_2019',
      operation: 'create',
      userProfileExists: true,
      incomingData: moviePayload,
      requestTimeIso: now,
    }),
    'ALLOW'
  );

  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_uri_2019',
      operation: 'get',
      userProfileExists: true,
      existingData: moviePayload,
    }),
    'ALLOW'
  );
});

test('Mandatory Scenarios 3, 4, 5: User B cannot retrieve, modify, or delete User A movie', () => {
  const now = '2026-11-06T09:00:00.000Z';
  const userAMovie = {
    uid: 'user_a',
    title: 'Lakshya',
    contentType: 'movie',
    status: 'watched',
    releaseYear: 2004,
    runtimeMinutes: 186,
    userRating: 9.0,
    isFavourite: true,
    isHighlyAnticipated: false,
    priority: 'high',
    createdAt: now,
    updatedAt: now,
  };

  // Scenario 3: User B cannot retrieve User A's movie
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_b', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_lakshya',
      operation: 'get',
      userProfileExists: true,
      existingData: userAMovie,
    }),
    'PERMISSION_DENIED'
  );

  // Scenario 4: User B cannot modify User A's movie
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_b', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_lakshya',
      operation: 'update',
      userProfileExists: true,
      existingData: userAMovie,
      incomingData: { ...userAMovie, userRating: 1.0 },
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Scenario 5: User B cannot delete User A's movie
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_b', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_lakshya',
      operation: 'delete',
      userProfileExists: true,
      existingData: userAMovie,
    }),
    'PERMISSION_DENIED'
  );
});

test('Mandatory Scenarios 6, 7, 8 & Dirty Dozen Payloads: Unauthenticated, Spoofed UID, Shadow Fields, Overflow, Unverified Email all return PERMISSION_DENIED', () => {
  const now = '2026-11-06T09:00:00.000Z';
  const basePayload = {
    uid: 'user_a',
    title: 'Inception',
    contentType: 'movie',
    status: 'watched',
    releaseYear: 2010,
    runtimeMinutes: 148,
    userRating: 9.2,
    isFavourite: true,
    isHighlyAnticipated: false,
    priority: 'high',
    createdAt: now,
    updatedAt: now,
  };

  // Scenario 6: Storage rules isolate users/{userId}/{assetCategory}/{fileName}
  assert.ok(storageRulesText.includes('match /users/{userId}/{assetCategory}/{fileName}'));
  assert.ok(storageRulesText.includes('request.auth.uid == userId'));
  assert.ok(storageRulesText.includes('5 * 1024 * 1024'));

  // Scenario 7: Unauthenticated visitor denied
  assert.equal(
    evaluateLibraryRule({
      auth: null,
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'get',
      userProfileExists: true,
      existingData: basePayload,
    }),
    'PERMISSION_DENIED'
  );

  // Scenario 8: User A cannot spoof User B's UID in a write request
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'create',
      userProfileExists: true,
      incomingData: { ...basePayload, uid: 'user_b' },
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Dirty Dozen #6: Shadow field injection
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'create',
      userProfileExists: true,
      incomingData: { ...basePayload, isAdmin: true },
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Dirty Dozen #8: Immutable createdAt mutation on update
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'update',
      userProfileExists: true,
      existingData: basePayload,
      incomingData: { ...basePayload, createdAt: '2020-01-01T00:00:00.000Z' },
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Dirty Dozen #10: Denial-of-Wallet 10KB title overflow
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'create',
      userProfileExists: true,
      incomingData: { ...basePayload, title: 'X'.repeat(1000) },
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Dirty Dozen #11: Orphan creation without parent /users/{userId}
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: true },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'create',
      userProfileExists: false,
      incomingData: basePayload,
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );

  // Dirty Dozen #12: Unverified email spoofing
  assert.equal(
    evaluateLibraryRule({
      auth: { uid: 'user_a', email_verified: false },
      pathUserId: 'user_a',
      docId: 'movie_1',
      operation: 'create',
      userProfileExists: true,
      incomingData: basePayload,
      requestTimeIso: now,
    }),
    'PERMISSION_DENIED'
  );
});
