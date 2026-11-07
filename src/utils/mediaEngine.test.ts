import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndClassifyMediaSource,
  computeAuthoritativePlaybackPosition,
  SocialCinemaServerManager,
  CURATED_DIRECT_CINEMA_STREAMS
} from './socialEngine';
import {
  parseSrtToCues,
  IntelligentABRController,
  formatResolutionDisplay,
} from './mediaEngine';
import { SocialCinemaRoom } from '../types/nexus';
import {
  saveRecentMediaEntry,
  getRecentMediaHistory,
} from '../components/NexusFilmPortalModal';

test('Media Engine: Source Classification & Compatibility Checks', () => {
  // 1. Local device blob: URL
  const blobCheck = validateAndClassifyMediaSource('blob:http://localhost:3000/1234-abcd', 'MyDownloadedMovie.mp4');
  assert.equal(blobCheck.sourceType, 'local_file');
  assert.equal(blobCheck.isAuthorized, true);
  assert.equal(blobCheck.supportsAutoSync, true);
  assert.match(blobCheck.compatibilityMessage, /Local Device Video/i);

  // 2. Room shared media stream endpoint
  const roomStreamCheck = validateAndClassifyMediaSource('/api/social/rooms/room_test_123/media/stream?token=abc', 'SharedMovie.mp4');
  assert.equal(roomStreamCheck.sourceType, 'room_shared_file');
  assert.equal(roomStreamCheck.isAuthorized, true);
  assert.equal(roomStreamCheck.supportsAutoSync, true);

  // 3. Direct HTTPS MP4 / WebM
  const mp4Check = validateAndClassifyMediaSource('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'Big Buck Bunny');
  assert.equal(mp4Check.sourceType, 'direct_video');
  assert.equal(mp4Check.isAuthorized, true);
  assert.equal(mp4Check.supportsAutoSync, true);

  // 4. HLS Stream (.m3u8)
  const hlsCheck = validateAndClassifyMediaSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'Big Buck Bunny HLS');
  assert.equal(hlsCheck.sourceType, 'hls_stream');
  assert.equal(hlsCheck.isAuthorized, true);
  assert.equal(hlsCheck.supportsAutoSync, true);

  // 5. MPEG-DASH Stream (.mpd)
  const dashCheck = validateAndClassifyMediaSource('https://dash.akamaized.net/akamai/test/sample.mpd', 'Akamai DASH');
  assert.equal(dashCheck.sourceType, 'dash_stream');
  assert.equal(dashCheck.isAuthorized, true);
  assert.equal(dashCheck.supportsAutoSync, true);

  // 6. External webpage with X-Frame-Options / CSP restrictions (e.g., bingr.one or ordinary web page)
  const blockedWebCheck = validateAndClassifyMediaSource('https://bingr.one/watch/sample-movie', 'Bingr Stream Page');
  assert.equal(blockedWebCheck.sourceType, 'unsupported_webpage');
  assert.equal(blockedWebCheck.isAuthorized, false);
  assert.equal(blockedWebCheck.supportsAutoSync, false);
  assert.match(blockedWebCheck.compatibilityMessage, /does not support integrated playback/i);
});

test('Media Engine: Authoritative Timeline factoring Playback Speed', () => {
  const mockRoom: Partial<SocialCinemaRoom> = {
    playback: {
      mediaSource: {
        id: 'stream-bunny',
        url: CURATED_DIRECT_CINEMA_STREAMS[0].url,
        title: CURATED_DIRECT_CINEMA_STREAMS[0].title,
        sourceType: 'direct_video',
        providerName: 'Open Cinema Curated',
        isAuthorized: true,
        supportsAutoSync: true,
        compatibilityMessage: 'Direct MP4',
      },
      isPlaying: true,
      positionSeconds: 10,
      durationSeconds: 120,
      lastSyncServerTimestampMs: 1000000,
      revision: 1,
      hostUid: 'host-101',
      coHostUids: [],
      controlsLocked: false,
      subtitleTrack: 'off',
      controlRequests: [],
      playbackSpeed: 1.5,
      pictureFitMode: 'fit',
      sourceResolution: '1920×1080 (FHD)',
    },
  };

  // 4 seconds elapsed on server clock -> at 1.5x speed, position should advance by 6 seconds!
  const posAt1004000 = computeAuthoritativePlaybackPosition(mockRoom as SocialCinemaRoom, 1004000);
  assert.equal(posAt1004000, 16);

  // Paused timeline does not advance
  (mockRoom.playback as any).isPlaying = false;
  const posPaused = computeAuthoritativePlaybackPosition(mockRoom as SocialCinemaRoom, 1008000);
  assert.equal(posPaused, 10);
});

test('Media Engine: SocialCinemaEngine set_speed & set_fit_mode Actions', () => {
  const engine = new SocialCinemaServerManager();
  const room = engine.createRoom({
    roomName: 'Speed & Fit Cinema',
    hostName: 'Director Zane',
    hostUid: 'host-101',
    theme: 'classic_cinema',
    capacity: 20,
    roomMode: 'friends',
  });

  // Host sets playback speed to 1.25x
  const updatedPb = engine.controlPlayback({
    roomId: room.roomId,
    uid: 'host-101',
    action: 'set_speed',
    playbackSpeed: 1.25,
  });
  assert.equal(updatedPb.playbackSpeed, 1.25);

  // Host sets picture fit mode to 'original'
  const updatedPbFit = engine.controlPlayback({
    roomId: room.roomId,
    uid: 'host-101',
    action: 'set_fit_mode',
    pictureFitMode: 'original',
  });
  assert.equal(updatedPbFit.pictureFitMode, 'original');

  // Clamps extreme speeds between 0.25x and 3.0x
  const clampedPb = engine.controlPlayback({
    roomId: room.roomId,
    uid: 'host-101',
    action: 'set_speed',
    playbackSpeed: 10.0,
  });
  assert.equal(clampedPb.playbackSpeed, 3.0);
});

test('Media Engine: LocalStorage Continue Watching Persistence', () => {
  // Mock localStorage in Node.js environment
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  saveRecentMediaEntry({
    id: 'film-1',
    title: 'Interstellar',
    url: 'https://example.com/interstellar.mp4',
    sourceType: 'direct_video',
    durationSeconds: 10140,
    lastPositionSeconds: 3200,
    aspectRatioLabel: '2.39:1',
    sourceResolution: '3840×2160 (4K UHD)',
  });

  const history = getRecentMediaHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].title, 'Interstellar');
  assert.equal(history[0].sourceResolution, '3840×2160 (4K UHD)');
  assert.equal(history[0].lastPositionSeconds, 3200);
});

test('Media Engine: My Media Panel Queuing & Curated Presets', () => {
  // Mock sessionStorage in Node.js environment
  const sessionStore = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => sessionStore.get(key) || null,
    setItem: (key: string, val: string) => sessionStore.set(key, val),
    removeItem: (key: string) => sessionStore.delete(key),
    clear: () => sessionStore.clear(),
  };

  // Verify curated streams list exists and contains at least 3 high quality test films
  assert.ok(CURATED_DIRECT_CINEMA_STREAMS.length >= 3);
  const tearsOfSteel = CURATED_DIRECT_CINEMA_STREAMS.find(s => s.title.includes('Tears of Steel'));
  assert.ok(tearsOfSteel);
  assert.match(tearsOfSteel!.url, /\.mp4$/i);

  // Simulate queuing media from MyMediaPanel to 3D theatre
  const sampleMedia = {
    url: tearsOfSteel!.url,
    title: tearsOfSteel!.title,
    sourceType: 'direct_video',
    description: tearsOfSteel!.description,
    sourceResolution: '3840×2160 (4K UHD)',
    aspectRatio: '2.40:1',
    durationSeconds: tearsOfSteel!.durationSeconds,
    providerName: 'Open Movie Project',
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: 'Verified 4K UHD Direct MP4',
  };

  sessionStorage.setItem('cineshelf_queued_media', JSON.stringify(sampleMedia));
  const rawQueued = sessionStorage.getItem('cineshelf_queued_media');
  assert.ok(rawQueued);
  const parsedQueued = JSON.parse(rawQueued);
  assert.equal(parsedQueued.title, tearsOfSteel!.title);
  assert.equal(parsedQueued.sourceResolution, '3840×2160 (4K UHD)');
  assert.equal(parsedQueued.isAuthorized, true);

  // Test HLS validation for Streaming Source mode
  const hlsUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const hlsValidation = validateAndClassifyMediaSource(hlsUrl, 'Live Broadcast');
  assert.equal(hlsValidation.sourceType, 'hls_stream');
  assert.equal(hlsValidation.isAuthorized, true);
});

test('Media Engine 2.0: SRT Subtitle Parser & Intelligent ABR Controller', () => {
  // 1. SRT Subtitle Parsing
  const rawSrt = `1
00:00:01,200 --> 00:00:04,500
Welcome to CinemaShelf NEXUS 3D Theatre!

2
00:00:05,000 --> 00:00:08,200
Synchronised multi-client streaming enabled.`;

  const cues = parseSrtToCues(rawSrt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startTimeSeconds, 1.2);
  assert.equal(cues[0].endTimeSeconds, 4.5);
  assert.match(cues[0].text, /Welcome to CinemaShelf/i);
  assert.equal(cues[1].startTimeSeconds, 5.0);

  // 2. Intelligent ABR Manager
  const abr = new IntelligentABRController();
  const levels = [
    { id: '0', label: '480p', height: 480, bitrate: 1000000 },
    { id: '1', label: '720p', height: 720, bitrate: 2500000 },
    { id: '2', label: '1080p', height: 1080, bitrate: 5000000 },
  ];

  // Low buffer condition (< 2.5s) triggers quality downgrade
  const degradedLevel = abr.evaluateTargetLevel(1.5, levels, 2);
  assert.equal(degradedLevel, 1); // Drops from 1080p to 720p

  // Manual Lock preference
  abr.setPreferredQuality('1080p');
  const lockedLevel = abr.evaluateTargetLevel(10.0, levels, 0);
  assert.equal(lockedLevel, 2); // Locks to 1080p index

  // Resolution Display Formatter
  assert.equal(formatResolutionDisplay(3840, 2160), '3840×2160 (4K UHD)');
  assert.equal(formatResolutionDisplay(1920, 1080), '1920×1080 (FHD)');
});


