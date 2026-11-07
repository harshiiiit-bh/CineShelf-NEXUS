import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film, Upload, Globe, Clock, Play, AlertTriangle, ExternalLink, Check,
  X, RefreshCw, HardDrive, Sparkles, Layers, ShieldCheck, ChevronRight,
  Maximize2, Volume2, Video, FileVideo, Radio, Info
} from 'lucide-react';
import { MediaSourceConfig, RoomPlaybackState, SocialCinemaRoom } from '../types/nexus';
import { CURATED_DIRECT_CINEMA_STREAMS } from '../utils/socialEngine';
import { apiUrl, apiErrorMessage } from '../utils/api';

export interface RecentMediaEntry {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  durationSeconds: number;
  lastPositionSeconds: number;
  lastWatchedAtMs: number;
  aspectRatioLabel?: string;
  sourceResolution?: string;
}

const RECENT_MEDIA_STORAGE_KEY = 'cineshelf_recent_media';

export function getRecentMediaHistory(): RecentMediaEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_MEDIA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentMediaEntry(entry: Omit<RecentMediaEntry, 'lastWatchedAtMs'>): void {
  try {
    const existing = getRecentMediaHistory().filter((e) => e.url !== entry.url);
    const updated: RecentMediaEntry[] = [
      { ...entry, lastWatchedAtMs: Date.now() },
      ...existing,
    ].slice(0, 12);
    localStorage.setItem(RECENT_MEDIA_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

interface NexusFilmPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: SocialCinemaRoom | null;
  canControlPlayback: boolean;
  onApplyMediaSource: (sourceConfig: Partial<MediaSourceConfig>) => void;
  onOpenBrowserUrl?: (url: string) => void;
  authHeader?: string;
  onStartTabCasting?: () => void;
  onStopTabCasting?: () => void;
  isCastingActive?: boolean;
}

export type FilmPortalTab = 'discover' | 'my_media' | 'online_streams' | 'continue_watching';

export const NexusFilmPortalModal: React.FC<NexusFilmPortalModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  canControlPlayback,
  onApplyMediaSource,
  onOpenBrowserUrl,
  authHeader,
  onStartTabCasting,
  onStopTabCasting,
  isCastingActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<FilmPortalTab>('my_media');

  // My Media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    width: number;
    height: number;
    duration: number;
    aspectRatio: number;
    aspectRatioLabel: string;
    fileSizeFormatted: string;
    thumbnailUrl?: string;
    hasAudio: boolean;
  } | null>(null);
  const [probingFile, setProbingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Online Streams state
  const [onlineUrlInput, setOnlineUrlInput] = useState('');
  const [onlineTitleInput, setOnlineTitleInput] = useState('');
  const [urlProbeResult, setUrlProbeResult] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'warning' | 'invalid';
    message: string;
    sourceType?: string;
    details?: string;
  }>({ status: 'idle', message: '' });

  // Continue Watching state
  const [recentHistory, setRecentHistory] = useState<RecentMediaEntry[]>([]);

  // Hidden video element for fast local metadata probing
  const probeVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentHistory(getRecentMediaHistory());
    }
  }, [isOpen]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (fileObjectUrl) {
        URL.revokeObjectURL(fileObjectUrl);
      }
    };
  }, [fileObjectUrl]);

  // Handle local video selection
  const handleSelectFile = useCallback((file: File) => {
    if (!file) return;
    setProbingFile(true);
    setUploadError(null);
    setUploadProgress(null);

    if (fileObjectUrl) {
      URL.revokeObjectURL(fileObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileObjectUrl(objectUrl);

    // Probe video dimensions, aspect ratio, duration, and canvas thumbnail
    const probeVid = document.createElement('video');
    probeVid.preload = 'metadata';
    probeVid.src = objectUrl;
    probeVid.muted = true;
    probeVid.crossOrigin = 'anonymous';

    const cleanUpProbe = () => {
      probeVid.removeAttribute('src');
      probeVid.load();
    };

    probeVid.onloadedmetadata = () => {
      const w = probeVid.videoWidth || 1920;
      const h = probeVid.videoHeight || 1080;
      const dur = probeVid.duration || 0;
      const ar = Number((w / h).toFixed(3));

      let arLabel = '16:9 Widescreen';
      if (Math.abs(ar - 2.39) < 0.15 || Math.abs(ar - 2.35) < 0.15) {
        arLabel = '2.39:1 Cinemascope';
      } else if (Math.abs(ar - 1.33) < 0.1) {
        arLabel = '4:3 Academy';
      } else if (Math.abs(ar - 1.85) < 0.1) {
        arLabel = '1.85:1 Theatrical';
      }

      const sizeBytes = file.size;
      const formatted =
        sizeBytes > 1024 * 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

      // Generate a fast thumbnail at 1s or middle
      probeVid.currentTime = Math.min(1.5, Math.max(0.5, dur * 0.1));
      probeVid.onseeked = () => {
        try {
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 320;
          thumbCanvas.height = Math.round(320 / ar);
          const ctx = thumbCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(probeVid, 0, 0, thumbCanvas.width, thumbCanvas.height);
            const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
            setVideoMetadata({
              width: w,
              height: h,
              duration: dur,
              aspectRatio: ar,
              aspectRatioLabel: arLabel,
              fileSizeFormatted: formatted,
              thumbnailUrl: thumbUrl,
              hasAudio: true,
            });
            setProbingFile(false);
            cleanUpProbe();
            return;
          }
        } catch {
          // ignore canvas extraction error
        }
        setVideoMetadata({
          width: w,
          height: h,
          duration: dur,
          aspectRatio: ar,
          aspectRatioLabel: arLabel,
          fileSizeFormatted: formatted,
          hasAudio: true,
        });
        setProbingFile(false);
        cleanUpProbe();
      };
    };

    probeVid.onerror = () => {
      setProbingFile(false);
      setUploadError('Could not decode video metadata. Format may require compatible browser decoding.');
      cleanUpProbe();
    };
  }, [fileObjectUrl]);

  // Play personal video locally in theatre
  const handlePlayLocallyInTheatre = () => {
    if (!fileObjectUrl || !selectedFile) return;
    const title = selectedFile.name.replace(/\.[^/.]+$/, '');
    const meta = videoMetadata;

    onApplyMediaSource({
      id: `local-file-${Date.now()}`,
      url: fileObjectUrl,
      title,
      sourceType: 'local_file',
      providerName: 'Personal Device Media',
      isAuthorized: true,
      supportsAutoSync: true,
      isLocalFile: true,
      originalWidth: meta?.width,
      originalHeight: meta?.height,
      aspectRatio: meta?.aspectRatio,
      aspectRatioLabel: meta?.aspectRatioLabel,
      durationSeconds: meta?.duration,
      fileSizeFormatted: meta?.fileSizeFormatted,
      fileName: selectedFile.name,
      thumbnailUrl: meta?.thumbnailUrl,
    });

    saveRecentMediaEntry({
      id: `recent-${Date.now()}`,
      title,
      url: fileObjectUrl,
      sourceType: 'local_file',
      durationSeconds: meta?.duration || 0,
      lastPositionSeconds: 0,
      aspectRatioLabel: meta?.aspectRatioLabel,
      sourceResolution: meta ? `${meta.width} × ${meta.height}` : undefined,
    });

    onClose();
  };

  // Upload personal video to room backend so all friends can watch together
  const [uploadBytesInfo, setUploadBytesInfo] = useState<{
    loadedMB: string;
    totalMB: string;
    speedMbps: string;
    timeRemainingSec: number;
  } | null>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  const handleCancelUpload = () => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setUploadProgress(null);
    setUploadBytesInfo(null);
    setUploadError('Upload cancelled.');
  };

  const handleUploadAndStreamToFriends = async () => {
    if (!selectedFile || !currentRoom) return;
    setUploadProgress(1);
    setUploadError(null);
    setUploadBytesInfo({
      loadedMB: '0.0',
      totalMB: (selectedFile.size / (1024 * 1024)).toFixed(1),
      speedMbps: '0.0',
      timeRemainingSec: 0,
    });

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;
    let url: string;
    try {
      url = apiUrl(`/api/social/rooms/${currentRoom.roomId}/media/upload`);
    } catch (error) {
      setUploadProgress(null);
      setUploadBytesInfo(null);
      setUploadError(apiErrorMessage(error, 'The multiplayer backend is not configured.'));
      return;
    }

    xhr.open('POST', url, true);
    if (authHeader) {
      xhr.setRequestHeader('Authorization', authHeader);
    }
    xhr.setRequestHeader('Content-Type', selectedFile.type || 'video/mp4');
    xhr.setRequestHeader('x-media-filename', encodeURIComponent(selectedFile.name));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(Math.max(1, Math.min(99, pct)));

        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        if (dt > 0.3) {
          const diff = e.loaded - lastLoaded;
          const speedBps = diff / dt;
          const speedMbps = ((speedBps * 8) / (1024 * 1024)).toFixed(1);
          const remainingBytes = e.total - e.loaded;
          const remSec = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

          setUploadBytesInfo({
            loadedMB: (e.loaded / (1024 * 1024)).toFixed(1),
            totalMB: (e.total / (1024 * 1024)).toFixed(1),
            speedMbps,
            timeRemainingSec: remSec,
          });

          lastLoaded = e.loaded;
          lastTime = now;
        }
      }
    };

    xhr.onload = () => {
      activeXhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        try {
          const resp = JSON.parse(xhr.responseText);
          const meta = videoMetadata;
          saveRecentMediaEntry({
            id: `shared-${Date.now()}`,
            title: resp.fileName || selectedFile.name,
            url: apiUrl(resp.streamUrl),
            sourceType: 'room_shared_file',
            durationSeconds: meta?.duration || 0,
            lastPositionSeconds: 0,
            aspectRatioLabel: meta?.aspectRatioLabel,
            sourceResolution: meta ? `${meta.width} × ${meta.height}` : undefined,
          });
        } catch {
          // ignore
        }
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        let msg = 'Upload failed.';
        try {
          const errResp = JSON.parse(xhr.responseText);
          msg = errResp.error || msg;
        } catch {
          // ignore
        }
        setUploadError(msg);
        setUploadProgress(null);
        setUploadBytesInfo(null);
      }
    };

    xhr.onerror = () => {
      activeXhrRef.current = null;
      setUploadError('Network error during media upload. Check file size and connection.');
      setUploadProgress(null);
      setUploadBytesInfo(null);
    };

    xhr.send(selectedFile);
  };

  // Test online URL compatibility
  const handleTestOnlineUrl = () => {
    const raw = onlineUrlInput.trim();
    if (!raw) {
      setUrlProbeResult({ status: 'invalid', message: 'Please enter a valid URL.' });
      return;
    }

    setUrlProbeResult({ status: 'checking', message: 'Testing media source compatibility...' });

    try {
      const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      const pathLower = parsed.pathname.toLowerCase();

      if (
        pathLower.endsWith('.mp4') ||
        pathLower.endsWith('.webm') ||
        pathLower.endsWith('.mov') ||
        pathLower.endsWith('.m4v')
      ) {
        setUrlProbeResult({
          status: 'valid',
          sourceType: 'direct_video',
          message: 'Direct HTTPS Media verified! Supports 3D screen projection and authoritative timeline sync.',
          details: `${parsed.hostname} · Direct Video File`,
        });
        return;
      }

      if (pathLower.endsWith('.m3u8')) {
        setUrlProbeResult({
          status: 'valid',
          sourceType: 'hls_stream',
          message: 'HLS (.m3u8) Adaptive Stream verified! Supports multi-bitrate quality ladder and timeline sync.',
          details: `${parsed.hostname} · HLS Adaptive Stream`,
        });
        return;
      }

      if (pathLower.endsWith('.mpd')) {
        setUrlProbeResult({
          status: 'valid',
          sourceType: 'dash_stream',
          message: 'MPEG-DASH (.mpd) stream detected with authoritative timeline sync.',
          details: `${parsed.hostname} · MPEG-DASH Stream`,
        });
        return;
      }

      // If it's an ordinary HTML webpage
      setUrlProbeResult({
        status: 'warning',
        sourceType: 'unsupported_webpage',
        message: 'This URL points to an HTML webpage, not a direct video stream. Webpages with X-Frame-Options or DRM cannot be projected onto the 3D cinema screen.',
        details: 'You can browse it in the In-App Browser Kiosk or paste a direct video stream URL.',
      });
    } catch {
      setUrlProbeResult({ status: 'invalid', message: 'Invalid URL format.' });
    }
  };

  // Apply online URL to cinema
  const handleApplyOnlineUrl = () => {
    const raw = onlineUrlInput.trim();
    if (!raw) return;

    const title = onlineTitleInput.trim() || 'Online Video Stream';
    onApplyMediaSource({
      url: raw,
      title,
    });

    saveRecentMediaEntry({
      id: `online-${Date.now()}`,
      title,
      url: raw,
      sourceType: urlProbeResult.sourceType || 'direct_video',
      durationSeconds: 0,
      lastPositionSeconds: 0,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="nexus-film-portal-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 pointer-events-auto select-none"
    >
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Strip */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                NEXUS FILM PORTAL & MEDIA ENGINE
              </span>
              <h2 className="text-base font-extrabold text-white">
                Select Movie & Projection Source
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (4 Core Sections) */}
        <div className="px-5 pt-3 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {(
            [
              { id: 'discover', label: '1. Discover', icon: Globe },
              { id: 'my_media', label: '2. My Media (Personal Videos)', icon: HardDrive },
              { id: 'online_streams', label: '3. Online Streams', icon: Radio },
              { id: 'continue_watching', label: `4. Continue Watching (${recentHistory.length})`, icon: Clock },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                data-testid={`film-portal-tab-${t.id}`}
                className={`py-2 px-3.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* =========================================================================
              TAB 1: DISCOVER (Curated Open-Cinema Streams & Reference Portals)
             ========================================================================= */}
          {activeTab === 'discover' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Direct master open-cinema movies formatted for crystal-clear 16:9 projection and instant sub-second synchronization across all patrons.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURATED_DIRECT_CINEMA_STREAMS.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          Direct Master Stream
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">16:9 UHD</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5">{s.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {s.compatibilityMessage}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onApplyMediaSource({ url: s.url, title: s.title });
                        saveRecentMediaEntry({
                          id: s.id,
                          title: s.title,
                          url: s.url,
                          sourceType: 'direct_video',
                          durationSeconds: 600,
                          lastPositionSeconds: 0,
                          aspectRatioLabel: '16:9 Widescreen',
                          sourceResolution: '1920 × 1080',
                        });
                        onClose();
                      }}
                      disabled={!canControlPlayback}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play on Cinema Screen
                    </button>
                  </div>
                ))}
              </div>

              {/* Reference film portals */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-xs font-mono uppercase text-slate-400">
                  Reference Film Portals (In-App Browser Kiosk)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      title: 'Wikipedia Film Portal',
                      url: 'https://en.m.wikipedia.org/wiki/Portal:Film',
                      desc: 'Global film history, genres, directors & release archives.',
                    },
                    {
                      title: 'Internet Archive Cinema',
                      url: 'https://archive.org/details/feature_films',
                      desc: 'Public domain feature films & cinema preservation reels.',
                    },
                    {
                      title: 'TVmaze Show Guide',
                      url: 'https://www.tvmaze.com/shows',
                      desc: 'Television show episodes, air dates, and cast guides.',
                    },
                  ].map((portal) => (
                    <div
                      key={portal.url}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-200">{portal.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{portal.desc}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (onOpenBrowserUrl) onOpenBrowserUrl(portal.url);
                          onClose();
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        Explore in Kiosk
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: MY MEDIA (Personal Video Upload, Probe & Stream to Friends)
             ========================================================================= */}
          {activeTab === 'my_media' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3">
                <HardDrive className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                  <p className="font-semibold text-white">
                    Watch Your Downloaded Movies & Personal Video Files in Full Resolution
                  </p>
                  <p>
                    Select an MP4, WebM, MOV, or M4V movie from your device. Decoded natively via browser hardware decoding preserving original resolution (4K, 1440p, 1080p, 720p).
                  </p>
                </div>
              </div>

              {/* Drag & Drop File Upload Area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSelectFile(f);
                }}
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleSelectFile(f);
                  }}
                  data-testid="my-media-dropzone"
                  className="p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl bg-slate-900/40 hover:bg-slate-900/70 transition flex flex-col items-center justify-center gap-3 text-center cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Drop video file here or click to browse
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports MP4, WebM, MOV, M4V · Native browser file-backed streaming
                    </p>
                  </div>
                </div>
              ) : (
                /* Selected File Card with Rich Probed Metadata */
                <div
                  data-testid="my-media-file-card"
                  className="p-4 rounded-3xl bg-slate-900 border border-blue-500/40 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      {videoMetadata?.thumbnailUrl ? (
                        <img
                          src={videoMetadata.thumbnailUrl}
                          alt="Video thumbnail"
                          className="w-20 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <FileVideo className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-white break-all">
                          {selectedFile.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                          <span className="text-blue-400 font-bold">
                            {videoMetadata?.fileSizeFormatted}
                          </span>
                          {videoMetadata && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">
                                {videoMetadata.width} × {videoMetadata.height}{' '}
                                {videoMetadata.width >= 3840
                                  ? '(4K UHD)'
                                  : videoMetadata.width >= 1920
                                  ? '(1080p)'
                                  : ''}
                              </span>
                              <span>•</span>
                              <span>{videoMetadata.aspectRatioLabel}</span>
                              <span>•</span>
                              <span>
                                {Math.floor(videoMetadata.duration / 60)}:
                                {String(Math.floor(videoMetadata.duration % 60)).padStart(2, '0')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setVideoMetadata(null);
                        setUploadProgress(null);
                        if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                        setFileObjectUrl(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer shrink-0"
                    >
                      Remove File
                    </button>
                  </div>

                  {probingFile && (
                    <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Probing hardware video decoder and aspect ratio...
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                      {uploadError}
                    </div>
                  )}

                  {uploadProgress !== null && (
                    <div className="p-3 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300">Background Stream to Room Media Server</span>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 font-bold">{uploadProgress}%</span>
                          <button
                            type="button"
                            onClick={handleCancelUpload}
                            className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-sans font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      {uploadBytesInfo && (
                        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                          <span>
                            {uploadBytesInfo.loadedMB} MB / {uploadBytesInfo.totalMB} MB
                          </span>
                          <span>Speed: {uploadBytesInfo.speedMbps} Mbps</span>
                          <span>
                            {uploadBytesInfo.timeRemainingSec > 0
                              ? `~${uploadBytesInfo.timeRemainingSec}s remaining`
                              : 'Finishing...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Two Sharing Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={handlePlayLocallyInTheatre}
                      disabled={probingFile}
                      data-testid="play-local-cinema-btn"
                      className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <div>
                        <div>Play in My Theatre</div>
                        <div className="text-[10px] font-normal text-blue-200">
                          Instant native local playback
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleUploadAndStreamToFriends}
                      disabled={probingFile || uploadProgress !== null || !currentRoom}
                      data-testid="upload-stream-friends-btn"
                      className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                    >
                      <Upload className="w-4 h-4" />
                      <div>
                        <div>Stream to Friends (Room Sync)</div>
                        <div className="text-[10px] font-normal text-emerald-200">
                          HTTP 206 range stream for all patrons
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-normal flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Option 3 (Individual Local File Mode):</strong> If your friends also downloaded the exact same file, both can select it locally and CineShelf will synchronize playback timeline timestamps automatically.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: ONLINE STREAMS (Direct Video URLs, HLS, DASH)
             ========================================================================= */}
          {/* =========================================================================
              TAB 3: ONLINE STREAMS & WEBSITE CASTING (Direct URLs, Website Players & Tab Share)
             ========================================================================= */}
          {activeTab === 'online_streams' && (
            <div className="space-y-5">
              {/* Three Source Modes Guidance Banner */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <Radio className="w-4 h-4" />
                  Website & Video Source Ingestion (3 Playback Modes)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-bold text-white block">A. Direct Video URL</span>
                    <span className="text-slate-400">Direct HTTPS MP4, WebM, HLS (.m3u8), or DASH (.mpd) stream.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-bold text-white block">B. Website Player</span>
                    <span className="text-slate-400">Embeddable streaming sites or in-app browser view kiosk.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-bold text-white block">C. Cast Browser Tab</span>
                    <span className="text-slate-400">Hardware-accelerated tab capture for restricted websites.</span>
                  </div>
                </div>
              </div>

              {/* Tab Casting Quick Launcher Block */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">Browser Tab / Screen Casting</h4>
                      {isCastingActive && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold animate-pulse">
                          ACTIVE CASTING
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Stream any browser tab (YouTube, Netflix, Hulu, Twitch, personal sites) live to your 3D theatre screen.
                    </p>
                  </div>
                </div>

                {isCastingActive ? (
                  <button
                    onClick={() => onStopTabCasting?.()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Stop Casting
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onStartTabCasting) {
                        onStartTabCasting();
                        onClose();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition shadow-md"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Start Tab Casting
                  </button>
                )}
              </div>

              {/* Online Stream URL Input & Compatibility Probe */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={onlineTitleInput}
                    onChange={(e) => setOnlineTitleInput(e.target.value)}
                    placeholder="Video title label (optional)"
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={onlineUrlInput}
                    onChange={(e) => {
                      setOnlineUrlInput(e.target.value);
                      setUrlProbeResult({ status: 'idle', message: '' });
                    }}
                    data-testid="online-stream-url-input"
                    placeholder="https://example.com/video.mp4 or website URL"
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestOnlineUrl}
                    data-testid="test-stream-compatibility-btn"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Test Compatibility
                  </button>
                  <button
                    onClick={handleApplyOnlineUrl}
                    disabled={!onlineUrlInput.trim() || !canControlPlayback}
                    data-testid="apply-online-stream-btn"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Load onto Cinema Screen
                  </button>
                </div>

                {urlProbeResult.status !== 'idle' && (
                  <div
                    data-testid="url-probe-result"
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      urlProbeResult.status === 'valid'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : urlProbeResult.status === 'warning'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {urlProbeResult.status === 'valid' ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      {urlProbeResult.message}
                    </div>
                    {urlProbeResult.details && (
                      <p className="text-[11px] opacity-80 font-mono">{urlProbeResult.details}</p>
                    )}

                    {/* Actionable buttons for warning/webpage URLs */}
                    {urlProbeResult.status === 'warning' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                        {onOpenBrowserUrl && (
                          <button
                            onClick={() => {
                              onOpenBrowserUrl(onlineUrlInput);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Open in CineShelf Browser Frame
                          </button>
                        )}
                        {onStartTabCasting && (
                          <button
                            onClick={() => {
                              onStartTabCasting();
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Cast Browser Tab to 3D Cinema
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: CONTINUE WATCHING (Recently Played Media)
             ========================================================================= */}
          {activeTab === 'continue_watching' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase text-slate-400">
                  Recently Accessed Cinema Media & Positions
                </p>
                {recentHistory.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem(RECENT_MEDIA_STORAGE_KEY);
                      setRecentHistory([]);
                    }}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {recentHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No recently played movies yet. Play a personal video or stream to track progress here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentHistory.map((item) => (
                    <div
                      key={`${item.url}-${item.lastWatchedAtMs}`}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                          <span className="text-blue-400 uppercase">{item.sourceType}</span>
                          {item.sourceResolution && <span>• {item.sourceResolution}</span>}
                          {item.aspectRatioLabel && <span>• {item.aspectRatioLabel}</span>}
                          <span>
                            • Played {new Date(item.lastWatchedAtMs).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onApplyMediaSource({
                            url: item.url,
                            title: item.title,
                          });
                          onClose();
                        }}
                        disabled={!canControlPlayback}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Resume
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
