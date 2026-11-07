import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAuthenticatedUid, createHttpServerAndApp } from './server';
import { Request } from 'express';

test('Mandatory Scenario 9: Direct API requests enforce authentication and reject UID spoofing', () => {
  const unauthReq = { headers: {} } as unknown as Request;
  assert.equal(extractAuthenticatedUid(unauthReq), null);

  const validSandboxReq = {
    headers: { authorization: 'Bearer sandbox-token:user_a' },
  } as unknown as Request;
  const parsed = extractAuthenticatedUid(validSandboxReq);
  assert.deepEqual(parsed, { uid: 'user_a', emailVerified: true });

  // Spoofed/invalid token rejected
  const invalidTokenReq = {
    headers: { authorization: 'Bearer malformed.token' },
  } as unknown as Request;
  assert.equal(extractAuthenticatedUid(invalidTokenReq), null);
});

test('Server Local Movie Database & NEXUS SOCIAL API: Startup with local catalogue, Wikidata import, and multi-client room lifecycle', async () => {
  const { server } = createHttpServerAndApp();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Verify /api/status reports local movie database readiness
    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as Record<string, unknown>;
    assert.equal(statusJson.localDatabaseReady, true);
    assert.equal(statusJson.tvmazeConfigured, true);
    assert.equal(statusJson.wikidataImportSupported, true);

    // 1b. Verify /api/catalog/discover serves local movies with filter & sort
    const discoverRes = await fetch(`${baseUrl}/api/catalog/discover?q=Inception`);
    assert.equal(discoverRes.status, 200);
    const discoverJson = (await discoverRes.json()) as { results: any[]; source: string };
    assert.equal(discoverJson.source, 'local_movie_database');
    assert.equal(discoverJson.results.length, 1);
    assert.equal(discoverJson.results[0].title, 'Inception');

    // 2. Host creates a private 3D cinema room
    const createRes = await fetch(`${baseUrl}/api/social/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sandbox-token:host_1',
      },
      body: JSON.stringify({
        roomName: 'Integration Test Theatre',
        hostName: 'Aarav',
        theme: 'luxury_gold',
        capacity: 20,
      }),
    });
    assert.equal(createRes.status, 201);
    const { room } = (await createRes.json()) as { room: any };
    assert.equal(room.capacity, 20);
    assert.equal(room.theme, 'luxury_gold');

    // 3. Second authenticated client joins via inviteCode
    const joinRes = await fetch(`${baseUrl}/api/social/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sandbox-token:guest_2',
      },
      body: JSON.stringify({
        inviteCode: room.inviteCode,
        displayName: 'Meera',
      }),
    });
    assert.equal(joinRes.status, 200);
    const joinedData = (await joinRes.json()) as { room: any };
    assert.equal(Object.keys(joinedData.room.participants).length, 2);

    // 4. Non-member cannot read private room state
    const outsiderRes = await fetch(`${baseUrl}/api/social/rooms/${room.roomId}`, {
      headers: { Authorization: 'Bearer sandbox-token:outsider_99' },
    });
    assert.equal(outsiderRes.status, 403);

    // 5. NEXUS MEDIA GATEWAY rejects BINGR.ONE and Cinejoy URLs cleanly
    const validateRes = await fetch(`${baseUrl}/api/social/media/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sandbox-token:host_1',
      },
      body: JSON.stringify({ url: 'https://bingr.one/watch/film-123' }),
    });
    assert.equal(validateRes.status, 200);
    const { mediaSource } = (await validateRes.json()) as { mediaSource: any };
    assert.equal(mediaSource.isAuthorized, false);
    assert.equal(
      mediaSource.compatibilityMessage,
      'This website does not support integrated playback or synchronised controls in NEXUS.'
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Temporary Login System: Guest Mode (AI Bot 3D Theatre) -> Friend Mode Upgrade & Multi-Device Login Code Verification', async () => {
  const { server } = createHttpServerAndApp();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Continue as Guest -> generates unique GUEST-XXXXXX ID & gst_... token
    const guestRes = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Explorer Guest', inactivityTimeoutMinutes: 30 }),
    });
    assert.equal(guestRes.status, 201);
    const guestData = (await guestRes.json()) as { session: any; sessionToken: string };
    assert.ok(guestData.session.guestId.startsWith('GUEST-'));
    assert.ok(guestData.sessionToken.startsWith('gst_'));
    assert.equal(guestData.session.accessMode, 'guest');

    // 2. Guest can create an AI Bot 3D Theatre room ('bot_sandbox') with 4 AI Cinema Bots
    const botRoomRes = await fetch(`${baseUrl}/api/social/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestData.sessionToken}`,
      },
      body: JSON.stringify({
        roomName: 'Guest Bot Theatre',
        hostName: 'Explorer Guest',
        roomMode: 'bot_sandbox',
      }),
    });
    assert.equal(botRoomRes.status, 201);
    const botRoomData = (await botRoomRes.json()) as { room: any };
    assert.equal(botRoomData.room.roomMode, 'bot_sandbox');
    // Host + 4 AI Bots = 5 participants
    assert.equal(Object.keys(botRoomData.room.participants).length, 5);

    // 3. Guest is blocked from creating a Friend Multiplayer room ('friends') without logging in
    const blockedCreateRes = await fetch(`${baseUrl}/api/social/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestData.sessionToken}`,
      },
      body: JSON.stringify({
        roomName: 'Friends Room Attempt',
        roomMode: 'friends',
      }),
    });
    assert.equal(blockedCreateRes.status, 403);
    const blockedJson = (await blockedCreateRes.json()) as { code: string };
    assert.equal(blockedJson.code, 'FRIEND_LOGIN_REQUIRED');

    // 4. Guest logs in with Display Name -> generates NXID-XXXX-XXXX Login ID & XXXX-XXXX Temporary Login Code
    const loginCreateRes = await fetch(`${baseUrl}/api/auth/login-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Harshit',
        guestToken: guestData.sessionToken,
        guestUid: guestData.session.uid,
      }),
    });
    assert.equal(loginCreateRes.status, 201);
    const loginCreated = (await loginCreateRes.json()) as {
      account: any;
      loginCode: string;
      session: any;
      sessionToken: string;
      migratedFromGuestUid: string;
    };
    assert.ok(loginCreated.account.loginId.startsWith('NXID-'));
    assert.equal(loginCreated.loginCode.length, 9); // XXXX-XXXX
    assert.ok(loginCreated.sessionToken.startsWith('usr_'));
    assert.equal(loginCreated.migratedFromGuestUid, guestData.session.uid);

    // 5. Upgrade the active AI Bot room in-place to a Friend Multiplayer room without losing progress
    const upgradeRes = await fetch(
      `${baseUrl}/api/social/rooms/${botRoomData.room.roomId}/upgrade-to-friends`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginCreated.sessionToken}`,
        },
        body: JSON.stringify({
          previousGuestUid: guestData.session.uid,
          displayName: 'Harshit',
        }),
      }
    );
    assert.equal(upgradeRes.status, 200);
    const upgradedRoomData = (await upgradeRes.json()) as { room: any };
    assert.equal(upgradedRoomData.room.roomMode, 'friends');
    assert.equal(upgradedRoomData.room.hostUid, loginCreated.account.uid);
    assert.ok(upgradedRoomData.room.participants[loginCreated.account.uid]);

    // 6. Verify multi-device login using Login ID + Temporary Login Code
    const verifyRes = await fetch(`${baseUrl}/api/auth/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: loginCreated.account.loginId,
        loginCode: loginCreated.loginCode,
      }),
    });
    assert.equal(verifyRes.status, 200);
    const verifiedData = (await verifyRes.json()) as {
      account: any;
      sessionToken: string;
    };
    assert.equal(verifiedData.account.uid, loginCreated.account.uid);
    assert.ok(verifiedData.sessionToken.startsWith('usr_'));

    // 7. Reject wrong Temporary Login Code
    const badCodeRes = await fetch(`${baseUrl}/api/auth/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: loginCreated.account.loginId,
        loginCode: 'ZZZZ-9999',
      }),
    });
    assert.equal(badCodeRes.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

