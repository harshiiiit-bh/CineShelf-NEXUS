import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SocialCinemaServerManager,
  computeAuthoritativePlaybackPosition,
  validateAndClassifyMediaSource,
  resolveTheatreMovement,
  mapJoystickVectorToCamera3D,
  THEATRE_BOUNDS,
} from './socialEngine';
import {
  mapTvMazeShowToCatalogItem,
  buildGoogleImagesPosterSearchUrl,
  getMetadataProviderLabel,
} from './metadataProviders';

test('Multi-Source Metadata Engine: Maps TVmaze show with episodes/cast and builds Google Images shortcut', () => {
  const sampleTvMaze = {
    id: 169,
    name: 'Breaking Bad',
    type: 'Scripted',
    language: 'English',
    genres: ['Drama', 'Crime', 'Thriller'],
    status: 'Ended',
    runtime: 60,
    averageRuntime: 60,
    premiered: '2008-01-20',
    rating: { average: 9.2 },
    network: { name: 'AMC', country: { name: 'United States' } },
    image: {
      medium: 'https://static.tvmaze.com/uploads/images/medium_portrait/0/2400.jpg',
      original: 'https://static.tvmaze.com/uploads/images/original_untouched/0/2400.jpg',
    },
    summary: '<p>A high school chemistry teacher diagnosed with lung cancer.</p>',
    _embedded: {
      seasons: [{ number: 1, episodeOrder: 7 }],
      episodes: [
        { season: 1, number: 1, name: 'Pilot', airdate: '2008-01-20', runtime: 58 },
        { season: 1, number: 2, name: "Cat's in the Bag...", airdate: '2008-01-27', runtime: 48 },
      ],
      cast: [
        { person: { name: 'Bryan Cranston' } },
        { person: { name: 'Aaron Paul' } },
      ],
    },
  };

  const mapped = mapTvMazeShowToCatalogItem(sampleTvMaze);
  assert.equal(mapped.metadataProvider, 'tvmaze');
  assert.equal(mapped.providerExternalId, '169');
  assert.equal(mapped.title, 'Breaking Bad');
  assert.equal(mapped.releaseYear, 2008);
  assert.equal(mapped.showStatus, 'completed');
  assert.equal(mapped.episodes?.length, 2);
  assert.equal(mapped.episodes?.[0].code, 'S1E1');
  assert.deepEqual(mapped.cast, ['Bryan Cranston', 'Aaron Paul']);
  assert.ok(mapped.providerAttribution?.includes('TVmaze'));
  assert.equal(getMetadataProviderLabel('tvmaze'), 'TVmaze');

  const gUrl = buildGoogleImagesPosterSearchUrl('Lakshya', 2004, 'movie');
  assert.ok(gUrl.startsWith('https://www.google.com/search?tbm=isch&q='));
  assert.ok(gUrl.includes('Lakshya'));
});

test('NEXUS SOCIAL Mandatory Scenarios 1–12: Room creation, joining, 20/30/35 load simulation, 36th rejection, invite expiry, and unauthorized access denial', () => {
  const manager = new SocialCinemaServerManager();

  // 1. User 1 creates a room with capacity 35
  const room = manager.createRoom({
    hostUid: 'user_1',
    hostName: 'Harshit (Host)',
    roomName: 'Premiere Screening Room',
    theme: 'luxury_gold',
    capacity: 35,
  });

  assert.equal(room.capacity, 35);
  assert.equal(room.isPrivate, true);
  assert.ok(room.inviteCode.length >= 8);

  // 2 & 3. User 2 joins using the code; both see each other's avatars
  const afterUser2 = manager.joinRoomByInviteCode({
    uid: 'user_2',
    displayName: 'Aarav',
    inviteCode: room.inviteCode,
  });
  assert.equal(Object.keys(afterUser2.participants).length, 2);
  assert.ok(afterUser2.participants['user_1']);
  assert.ok(afterUser2.participants['user_2']);
  // Distinct default appearances
  assert.notEqual(
    afterUser2.participants['user_1'].appearance.primaryColor,
    afterUser2.participants['user_2'].appearance.primaryColor
  );

  // 6, 7, 8, 9. System handles 3rd user, 20 users, 30 users, and 35 users (Simulated Load Test)
  for (let i = 3; i <= 35; i++) {
    manager.joinRoomByInviteCode({
      uid: `user_${i}`,
      displayName: `Participant ${i}`,
      inviteCode: room.inviteCode,
    });
    if (i === 20 || i === 30 || i === 35) {
      assert.equal(Object.keys(room.participants).length, i);
    }
  }

  // 10. The 36th participant is strictly rejected
  assert.throws(
    () =>
      manager.joinRoomByInviteCode({
        uid: 'user_36',
        displayName: 'Overflow Guest',
        inviteCode: room.inviteCode,
      }),
    /ROOM_CAPACITY_FULL/
  );
  assert.equal(Object.keys(room.participants).length, 35);

  // 12. Unauthorized user (user_36) cannot access room state
  assert.throws(
    () => manager.getRoomForMember(room.roomId, 'user_36'),
    /NOT_A_MEMBER/
  );

  // 11. Invitation codes expire properly
  const expiredRoom = manager.createRoom({
    hostUid: 'host_exp',
    hostName: 'Host Exp',
    roomName: 'Expired Room',
    inviteTtlMs: 1000,
  });
  assert.throws(
    () =>
      manager.joinRoomByInviteCode({
        uid: 'guest_late',
        displayName: 'Late Guest',
        inviteCode: expiredRoom.inviteCode,
        nowMs: Date.now() + 5000,
      }),
    /INVITE_EXPIRED/
  );
});

test('NEXUS SOCIAL Mandatory Scenarios 4, 5, 13–18: Independent movement, wall/counter collisions, popcorn & cold drink interactions, eating/drinking animations, and chat', () => {
  const manager = new SocialCinemaServerManager();
  const room = manager.createRoom({
    hostUid: 'harshit',
    hostName: 'Harshit',
    roomName: 'Snack & Move Room',
  });
  manager.joinRoomByInviteCode({
    uid: 'meera',
    displayName: 'Meera',
    inviteCode: room.inviteCode,
  });

  // 4 & 5. Both move independently; cannot spoof another participant's avatar
  const move1 = manager.updateParticipantMovement({
    roomId: room.roomId,
    authenticatedUid: 'harshit',
    x: -6.0,
    z: 11.0,
    rotationY: 0,
  });
  assert.equal(move1.participant.position.x, -6.0);

  assert.throws(
    () =>
      manager.updateParticipantMovement({
        roomId: room.roomId,
        authenticatedUid: 'meera',
        targetUid: 'harshit',
        x: 0,
        z: 0,
        rotationY: 0,
      }),
    /FORBIDDEN_AVATAR_CONTROL/
  );

  // 13. Characters cannot move through outer walls
  const wallAttempt = resolveTheatreMovement(
    { x: 0, y: 0, z: 0 },
    { x: -99, z: 99 },
    [],
    'harshit'
  );
  assert.equal(wallAttempt.x, THEATRE_BOUNDS.minX);
  assert.equal(wallAttempt.z, THEATRE_BOUNDS.maxZ);
  assert.equal(wallAttempt.collidedWithWallOrCounter, true);

  // 14 & 16. Popcorn pickup and eating animations work and sync to room state
  const afterPopcorn = manager.interactWithRefreshment({
    roomId: room.roomId,
    uid: 'harshit',
    action: 'pickup_popcorn',
    itemVariant: 'popcorn_caramel',
  });
  assert.equal(afterPopcorn.holdingItem, 'popcorn_caramel');
  assert.equal(afterPopcorn.animation, 'holding_popcorn');
  assert.equal(afterPopcorn.itemPortionsRemaining, 5);

  const afterEat = manager.interactWithRefreshment({
    roomId: room.roomId,
    uid: 'harshit',
    action: 'eat_popcorn',
  });
  assert.equal(afterEat.animation, 'eating_popcorn');
  assert.equal(afterEat.itemPortionsRemaining, 4);

  // 15 & 17. Drink pickup and drinking animations work
  const afterDrink = manager.interactWithRefreshment({
    roomId: room.roomId,
    uid: 'meera',
    action: 'pickup_drink',
    itemVariant: 'drink_cola',
  });
  assert.equal(afterDrink.holdingItem, 'drink_cola');
  assert.equal(afterDrink.animation, 'holding_drink');

  const afterSip = manager.interactWithRefreshment({
    roomId: room.roomId,
    uid: 'meera',
    action: 'drink_beverage',
  });
  assert.equal(afterSip.animation, 'drinking');
  assert.equal(afterSip.itemPortionsRemaining, 4);

  // 18. Chat messages appear for room participants
  const chatMsg = manager.sendChatMessage({
    roomId: room.roomId,
    uid: 'harshit',
    text: 'Grabbed caramel popcorn, sitting in Row B!',
  });
  assert.equal(chatMsg.displayName, 'Harshit');
  assert.equal(room.messages[room.messages.length - 1].text, 'Grabbed caramel popcorn, sitting in Row B!');
});

test('NEXUS SOCIAL Mandatory Scenarios 19–35: Authoritative playback sync, late joiner sync, unsupported URL gateway (BINGR.ONE / Cinejoy), host transfer, and graceful exit', () => {
  const manager = new SocialCinemaServerManager();
  const baseTime = 1_700_000_000_000;
  const room = manager.createRoom({
    hostUid: 'host_u',
    hostName: 'Host User',
    roomName: 'Sync Room',
  });
  manager.joinRoomByInviteCode({
    uid: 'member_u',
    displayName: 'Member User',
    inviteCode: room.inviteCode,
    nowMs: baseTime,
  });

  // 19. Non-host cannot control playback when locked
  assert.throws(
    () =>
      manager.controlPlayback({
        roomId: room.roomId,
        uid: 'member_u',
        action: 'play',
        nowMs: baseTime,
      }),
    /UNAUTHORIZED_PLAYBACK_CONTROL/
  );

  // 20, 21, 22. Host plays, seeks to 120s, and advances 30s in real time
  manager.controlPlayback({
    roomId: room.roomId,
    uid: 'host_u',
    action: 'play',
    positionSeconds: 120,
    nowMs: baseTime,
  });
  assert.equal(room.playback.isPlaying, true);
  assert.equal(computeAuthoritativePlaybackPosition(room, baseTime + 30_000), 150);

  // 23. Late joining starts at the exact current shared position (150s)
  const afterLateJoin = manager.joinRoomByInviteCode({
    uid: 'late_u',
    displayName: 'Late Joiner',
    inviteCode: room.inviteCode,
    nowMs: baseTime + 30_000,
  });
  assert.equal(afterLateJoin.playback.positionSeconds, 150);

  // 28 & 29. Unsupported third-party sites (BINGR.ONE / Cinejoy) are rejected with exact message; direct MP4 is accepted
  const bingrCheck = validateAndClassifyMediaSource('https://bingr.one/watch/movie-123');
  assert.equal(bingrCheck.isAuthorized, false);
  assert.equal(bingrCheck.supportsAutoSync, false);
  assert.equal(
    bingrCheck.compatibilityMessage,
    'This website does not support integrated playback or synchronised controls in NEXUS.'
  );

  const cinejoyCheck = validateAndClassifyMediaSource('https://cinejoy.to/film/456');
  assert.equal(cinejoyCheck.isAuthorized, false);
  assert.equal(
    cinejoyCheck.compatibilityMessage,
    'This website does not support integrated playback or synchronised controls in NEXUS.'
  );

  const mp4Check = validateAndClassifyMediaSource(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  );
  assert.equal(mp4Check.isAuthorized, true);
  assert.equal(mp4Check.supportsAutoSync, true);
  assert.equal(mp4Check.sourceType, 'direct_video');

  // 33. Host transfer works
  manager.transferHost({
    roomId: room.roomId,
    currentHostUid: 'host_u',
    newHostUid: 'member_u',
  });
  assert.equal(room.hostUid, 'member_u');
  assert.equal(room.participants['member_u'].role, 'host');

  // 35. Users can exit without affecting playback session for others
  manager.leaveRoom(room.roomId, 'late_u');
  assert.equal(room.playback.isPlaying, true);
  assert.ok(!room.participants['late_u']);

  // 34. Room closure works
  manager.closeRoom(room.roomId, 'member_u');
  assert.equal(room.isClosed, true);
  assert.equal(room.playback.isPlaying, false);
});

test('Virtual Joystick 3D Camera-Relative Vector Mapper: Maps touch (x, y) vectors relative to cameraYaw', () => {
  // 1. Deadzone check
  const dead = mapJoystickVectorToCamera3D(0.01, -0.01, 0, 1.0);
  assert.equal(dead.magnitude, 0);
  assert.equal(dead.worldX, 0);
  assert.equal(dead.worldZ, 0);

  // 2. Forward push (joystickY = -1) when cameraYaw = 0 (facing -Z screen) -> moves along -Z
  const forwardZeroYaw = mapJoystickVectorToCamera3D(0, -1, 0, 1.0);
  assert.equal(forwardZeroYaw.worldX, 0);
  assert.equal(forwardZeroYaw.worldZ, -1);
  assert.equal(forwardZeroYaw.magnitude, 1);

  // 3. Forward push (joystickY = -1) when cameraYaw = Math.PI / 2 (rotated 90° left, facing -X) -> moves along -X
  const forwardRotated90 = mapJoystickVectorToCamera3D(0, -1, Math.PI / 2, 1.0);
  assert.ok(Math.abs(forwardRotated90.worldX - -1) < 0.001);
  assert.ok(Math.abs(forwardRotated90.worldZ) < 0.001);

  // 4. Forward push (joystickY = -1) when cameraYaw = Math.PI (rotated 180°, facing +Z rear lobby) -> moves along +Z
  const forwardRotated180 = mapJoystickVectorToCamera3D(0, -1, Math.PI, 1.0);
  assert.ok(Math.abs(forwardRotated180.worldX) < 0.001);
  assert.ok(Math.abs(forwardRotated180.worldZ - 1) < 0.001);

  // 5. Diagonal input is normalized to unit circle before sensitivity scaling
  const diag = mapJoystickVectorToCamera3D(1, 1, 0, 1.0);
  assert.equal(diag.magnitude, 1);
  assert.ok(Math.abs(diag.worldX - 0.7071) < 0.01);
  assert.ok(Math.abs(diag.worldZ - 0.7071) < 0.01);
});

