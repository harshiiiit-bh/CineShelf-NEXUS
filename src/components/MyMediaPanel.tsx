import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Globe,
  Radio,
  Upload,
  Play,
  Pause,
  Film,
  Sparkles,
  Check,
  AlertTriangle,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Clock,
  Layers,
  FileVideo,
  Copy,
  Trash2,
  Tv,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { MediaSourceConfig, MediaSourceType } from '../types/nexus';
import {
  CURATED_DIRECT_CINEMA_STREAMS,
  validateAndClassifyMediaSource,
} from '../utils/socialEngine';
import {
  getRecentMediaHistory,
  saveRecentMediaEntry,
  RecentMediaEntry,
} from './NexusFilmPortalModal';

export type MyMediaTabMode = 'local_file' | 'url_input' | 'streaming_source';

interface ProbedLocalMedia {
  file: File;
  objectUrl: string;
  name: string;
  sizeFormatted: string;
  width: number;
  height: number;
  resolutionLabel: string;
  durationSeconds: number;
  aspectRatioLabel: string;
  hasAudio: boolean;
  thumbnailUrl?: string;
}

export const MyMediaPanel: React.FC = () => {
  const { setActiveSection, addToast } = useNexus();

  // Mode switcher: Local File | URL Input | Streaming Source
  const [activeMode, setActiveMode] = useState<MyMediaTabMode>('local_file');

  // Local File State
  const [probedLocalMedia, setProbedLocalMedia] = useState<ProbedLocalMedia | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // URL Input State
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [directTitleInput, setDirectTitleInput] = useState('');
  const [urlValidationResult, setUrlValidationResult] = useState<MediaSourceConfig | null>(null);

  // Streaming Source State
  const [streamUrlInput, setStreamUrlInput] = useState('');
  const [streamTitleInput, setStreamTitleInput] = useState('');
  const [streamValidationResult, setStreamValidationResult] = useState<MediaSourceConfig | null>(null);

  // Inline Player State
  const [inlinePlayerActive, setInlinePlayerActive] = useState(false);
  const [inlineVideoPlaying, setInlineVideoPlaying] = useState(false);
  const [inlineVideoMuted, setInlineVideoMuted] = useState(false);
  const [inlineCurrentTime, setInlineCurrentTime] = useState(0);
  const [inlineDuration, setInlineDuration] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);

  // Recent History
  const [recentMedia, setRecentMedia] = useState<RecentMediaEntry[]>(() => getRecentMediaHistory());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (probedLocalMedia?.objectUrl) {
        URL.revokeObjectURL(probedLocalMedia.objectUrl);
      }
    };
  }, [probedLocalMedia?.objectUrl]);

  const refreshRecentHistory = () => {
    setRecentMedia(getRecentMediaHistory());
  };

  // Helper: Format bytes to human readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Helper: Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Extract metadata and poster thumbnail from a local File
  const probeLocalFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i)) {
        addToast('Please select a valid video file (.mp4, .webm, .mov, or .m4v).', 'info');
        return;
      }

      // Revoke previous object URL if any
      if (probedLocalMedia?.objectUrl) {
        URL.revokeObjectURL(probedLocalMedia.objectUrl);
      }

      setIsProbing(true);
      const objectUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = objectUrl;
      tempVideo.preload = 'metadata';
      tempVideo.crossOrigin = 'anonymous';
      tempVideo.muted = true;

      tempVideo.onloadedmetadata = () => {
        const w = tempVideo.videoWidth || 1920;
        const h = tempVideo.videoHeight || 1080;
        const dur = Math.round(tempVideo.duration || 0);

        // Aspect ratio label
        const ratio = w / h;
        let aspectLabel = '16:9 Standard';
        if (ratio >= 2.2) aspectLabel = '2.39:1 Cinemascope';
        else if (ratio >= 1.7) aspectLabel = '16:9 Standard';
        else if (ratio >= 1.3) aspectLabel = '4:3 Academy';
        else aspectLabel = `${w}:${h}`;

        // Resolution label
        let resLabel = `${w}×${h}`;
        if (w >= 3840) resLabel = '3840×2160 (4K UHD)';
        else if (w >= 2560) resLabel = '2560×1440 (2K QHD)';
        else if (w >= 1920) resLabel = '1920×1080 (FHD)';
        else if (w >= 1280) resLabel = '1280×720 (HD)';

        // Capture a frame at 15% duration for thumbnail
        tempVideo.currentTime = Math.min(dur * 0.15, 5);
      };

      tempVideo.onseeked = () => {
        let thumbUrl: string | undefined = undefined;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(tempVideo.videoWidth || 640, 640);
          canvas.height = Math.round(canvas.width / (tempVideo.videoWidth / tempVideo.videoHeight || 16 / 9));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // ignore canvas extraction restrictions
        }

        const probed: ProbedLocalMedia = {
          file,
          objectUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          sizeFormatted: formatBytes(file.size),
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
          resolutionLabel:
            tempVideo.videoWidth >= 3840
              ? '3840×2160 (4K UHD)'
              : tempVideo.videoWidth >= 1920
              ? '1920×1080 (FHD)'
              : `${tempVideo.videoWidth}×${tempVideo.videoHeight}`,
          durationSeconds: Math.round(tempVideo.duration || 0),
          aspectRatioLabel:
            tempVideo.videoWidth / tempVideo.videoHeight >= 2.2
              ? '2.39:1 Cinemascope'
              : '16:9 Standard',
          hasAudio: true,
          thumbnailUrl: thumbUrl,
        };

        setProbedLocalMedia(probed);
        setIsProbing(false);
        addToast(`Probed ${file.name} (${probed.resolutionLabel})`, 'success');
      };

      tempVideo.onerror = () => {
        setIsProbing(false);
        addToast('Could not probe video metadata. Ensure file format is supported.', 'error');
      };
    },
    [addToast, probedLocalMedia?.objectUrl]
  );

  // Validate URL whenever URL Input changes
  const handleValidateDirectUrl = (url: string, title?: string) => {
    const trimmed = url.trim();
    setDirectUrlInput(trimmed);
    if (!trimmed) {
      setUrlValidationResult(null);
      return;
    }
    const check = validateAndClassifyMediaSource(trimmed, title || directTitleInput);
    setUrlValidationResult(check);
  };

  // Validate Stream URL whenever Streaming Source changes
  const handleValidateStreamUrl = (url: string, title?: string) => {
    const trimmed = url.trim();
    setStreamUrlInput(trimmed);
    if (!trimmed) {
      setStreamValidationResult(null);
      return;
    }
    const check = validateAndClassifyMediaSource(trimmed, title || streamTitleInput);
    setStreamValidationResult(check);
  };

  // Launch media into 3D Cinema
  const launchIntoCinema = (mediaConfig: Partial<MediaSourceConfig>) => {
    if (!mediaConfig.url) return;

    // Persist into session storage so NexusSocialView adopts it automatically on entry
    try {
      sessionStorage.setItem('cineshelf_queued_media', JSON.stringify(mediaConfig));
    } catch {
      // ignore
    }

    // Persist to Continue Watching history
    saveRecentMediaEntry({
      id: mediaConfig.id || `media-${Date.now()}`,
      title: mediaConfig.title || 'Untitled Media',
      url: mediaConfig.url,
      sourceType: mediaConfig.sourceType || 'direct_video',
      durationSeconds: mediaConfig.durationSeconds || 0,
      lastPositionSeconds: 0,
      aspectRatioLabel: mediaConfig.aspectRatioLabel || '16:9',
      sourceResolution:
        typeof mediaConfig.sourceResolution === 'string'
          ? mediaConfig.sourceResolution
          : mediaConfig.originalWidth && mediaConfig.originalHeight
          ? `${mediaConfig.originalWidth}×${mediaConfig.originalHeight}`
          : '1080p',
    });
    refreshRecentHistory();

    addToast(`Queued "${mediaConfig.title}" for 3D Theatre projection!`, 'success');
    setActiveSection('watch_together');
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      probeLocalFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      data-testid="my-media-panel"
      className="p-5 rounded-3xl bg-slate-900/90 dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 shadow-xl space-y-5 transition"
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-500 font-bold">
              Personal Video & Stream Hub
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Native Hardware Playback</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <span>My Media</span>
          </h2>
        </div>

        {/* 3-Mode Segmented Control (Local File, URL Input, Streaming Source) */}
        <div
          data-testid="my-media-mode-tabs"
          className="flex items-center p-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl"
        >
          <button
            type="button"
            onClick={() => setActiveMode('local_file')}
            data-testid="tab-mode-local-file"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeMode === 'local_file'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Local File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('url_input')}
            data-testid="tab-mode-url-input"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeMode === 'url_input'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL Input</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('streaming_source')}
            data-testid="tab-mode-streaming-source"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeMode === 'streaming_source'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Streaming Source</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: LOCAL FILE
         ========================================================================= */}
      {activeMode === 'local_file' && (
        <div data-testid="mode-content-local-file" className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.m4v,.mkv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                probeLocalFile(e.target.files[0]);
              }
            }}
          />

          {!probedLocalMedia ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="local-file-dropzone"
              className={`p-8 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-300 dark:border-slate-800 hover:border-blue-500/60 bg-slate-50 dark:bg-slate-950/40'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {isProbing ? 'Probing Video Metadata...' : 'Drop movie file here or click to browse'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Select an MP4, WebM, MOV, or M4V movie from your device. Decoded natively via browser
                hardware decoding preserving original 4K, 1440p, or 1080p resolution.
              </p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Native Object URL</span>
                <span aria-hidden="true">·</span>
                <span>Sub-Second Seeking</span>
                <span aria-hidden="true">·</span>
                <span>Zero Cloud Upload Required</span>
              </div>
            </div>
          ) : (
            <div
              data-testid="probed-media-card"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {probedLocalMedia.thumbnailUrl ? (
                    <img
                      src={probedLocalMedia.thumbnailUrl}
                      alt={probedLocalMedia.name}
                      className="w-20 h-14 rounded-xl object-cover border border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <FileVideo className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {probedLocalMedia.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono text-emerald-500 font-semibold">
                        {probedLocalMedia.resolutionLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{probedLocalMedia.aspectRatioLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(probedLocalMedia.durationSeconds)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{probedLocalMedia.sizeFormatted}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInlinePlayerActive((prev) => !prev)}
                    data-testid="btn-toggle-inline-preview"
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{inlinePlayerActive ? 'Close Preview' : 'Inline Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      launchIntoCinema({
                        id: `local-${Date.now()}`,
                        url: probedLocalMedia.objectUrl,
                        title: probedLocalMedia.name,
                        sourceType: 'local_file',
                        originalWidth: probedLocalMedia.width,
                        originalHeight: probedLocalMedia.height,
                        aspectRatioLabel: probedLocalMedia.aspectRatioLabel,
                        durationSeconds: probedLocalMedia.durationSeconds,
                        sourceResolution: probedLocalMedia.resolutionLabel,
                        isAuthorized: true,
                        supportsAutoSync: true,
                        compatibilityMessage: 'Local device file verified. Native browser playback ready.',
                      })
                    }
                    data-testid="btn-launch-local-cinema"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Watch in 3D Cinema</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (probedLocalMedia.objectUrl) {
                        URL.revokeObjectURL(probedLocalMedia.objectUrl);
                      }
                      setProbedLocalMedia(null);
                      setInlinePlayerActive(false);
                    }}
                    title="Remove Video"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Video Player Preview */}
              {inlinePlayerActive && (
                <div
                  data-testid="inline-player-wrapper"
                  className="rounded-xl overflow-hidden bg-black border border-slate-800 relative group"
                >
                  <video
                    ref={inlineVideoRef}
                    src={probedLocalMedia.objectUrl}
                    controls
                    playsInline
                    className="w-full max-h-80 object-contain mx-auto"
                    onPlay={() => setInlineVideoPlaying(true)}
                    onPause={() => setInlineVideoPlaying(false)}
                    onTimeUpdate={(e) => setInlineCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setInlineDuration(e.currentTarget.duration)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: URL INPUT
         ========================================================================= */}
      {activeMode === 'url_input' && (
        <div data-testid="mode-content-url-input" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Title Label (Optional)
              </label>
              <input
                type="text"
                value={directTitleInput}
                onChange={(e) => {
                  setDirectTitleInput(e.target.value);
                  if (directUrlInput) handleValidateDirectUrl(directUrlInput, e.target.value);
                }}
                data-testid="input-direct-title"
                placeholder="e.g., Dune 4K Trailer"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Direct HTTPS Video URL (.mp4 / .webm / .mov)
              </label>
              <input
                type="url"
                value={directUrlInput}
                onChange={(e) => handleValidateDirectUrl(e.target.value)}
                data-testid="input-direct-url"
                placeholder="https://commondatastorage.googleapis.com/.../movie.mp4"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {urlValidationResult && (
            <div
              data-testid="url-validation-banner"
              className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                urlValidationResult.isAuthorized
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {urlValidationResult.isAuthorized ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{urlValidationResult.compatibilityMessage}</p>
                  <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                    Provider: {urlValidationResult.providerName} · Source Type:{' '}
                    {urlValidationResult.sourceType.toUpperCase()}
                  </p>
                </div>
              </div>

              {urlValidationResult.isAuthorized ? (
                <button
                  type="button"
                  onClick={() => launchIntoCinema(urlValidationResult)}
                  data-testid="btn-launch-url-cinema"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-md"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Watch in 3D Cinema</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => launchIntoCinema({
                    id: `url-webpage-${Date.now()}`,
                    url: directUrlInput,
                    title: directTitleInput || 'Webpage Stream',
                    sourceType: 'unsupported_webpage',
                    providerName: 'Web Kiosk / Tab Share',
                    isAuthorized: false,
                    supportsAutoSync: false,
                    compatibilityMessage: 'Webpage queued for in-app browser frame and browser tab casting.'
                  })}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-md"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Open in Theatre Kiosk</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 3: STREAMING SOURCE (HLS / DASH / CURATED PRESETS)
         ========================================================================= */}
      {activeMode === 'streaming_source' && (
        <div data-testid="mode-content-streaming-source" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Stream Label (Optional)
              </label>
              <input
                type="text"
                value={streamTitleInput}
                onChange={(e) => {
                  setStreamTitleInput(e.target.value);
                  if (streamUrlInput) handleValidateStreamUrl(streamUrlInput, e.target.value);
                }}
                data-testid="input-stream-title"
                placeholder="e.g., Live Cinema Broadcast"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                HLS (.m3u8) / DASH (.mpd) / Stream URL
              </label>
              <input
                type="url"
                value={streamUrlInput}
                onChange={(e) => handleValidateStreamUrl(e.target.value)}
                data-testid="input-stream-url"
                placeholder="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {streamValidationResult && (
            <div
              data-testid="stream-validation-banner"
              className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                streamValidationResult.isAuthorized
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {streamValidationResult.isAuthorized ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{streamValidationResult.compatibilityMessage}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Provider: {streamValidationResult.providerName} · Source Type:{' '}
                    {streamValidationResult.sourceType.toUpperCase()}
                  </p>
                </div>
              </div>

              {streamValidationResult.isAuthorized && (
                <button
                  type="button"
                  onClick={() => launchIntoCinema(streamValidationResult)}
                  data-testid="btn-launch-stream-cinema"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-md"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Watch in 3D Cinema</span>
                </button>
              )}
            </div>
          )}

          {/* Curated Open-Cinema Presets */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Curated Open-Movie Streams (Sub-Second WebGL Synchronization)
              </span>
              <span className="text-[11px] text-slate-500">Auto-Sync Ready</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {CURATED_DIRECT_CINEMA_STREAMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStreamTitleInput(item.title);
                    setStreamUrlInput(item.url);
                    handleValidateStreamUrl(item.url, item.title);
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    streamUrlInput === item.url
                      ? 'bg-blue-600/10 border-blue-500 text-blue-500 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                      Direct MP4
                    </span>
                    <Film className="w-3 h-3 text-slate-400" />
                  </div>
                  <h4 className="font-display text-xs font-bold truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTINUE WATCHING / RECENT MEDIA SHELF
         ========================================================================= */}
      {recentMedia.length > 0 && (
        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Recent Media Sessions
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('cineshelf_recent_media');
                setRecentMedia([]);
                addToast('Cleared recent media history.', 'info');
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear History
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {recentMedia.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    <span className="text-emerald-500">{item.sourceResolution || '1080p'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.aspectRatioLabel || '16:9'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    launchIntoCinema({
                      id: item.id,
                      url: item.url,
                      title: item.title,
                      sourceType: item.sourceType as MediaSourceType,
                      aspectRatioLabel: item.aspectRatioLabel,
                      sourceResolution: item.sourceResolution,
                      durationSeconds: item.durationSeconds,
                      isAuthorized: true,
                      supportsAutoSync: true,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Resume</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
