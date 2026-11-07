import { MediaSourceConfig, MediaSourceType, StreamQualityLevel } from '../types/nexus';

// ============================================================================
// ADVANCED VIDEO STREAMING ENGINE 2.0 — UTILITIES & TYPES
// ============================================================================

export interface SubtitleCue {
  id: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
}

export interface SubtitleTrackInfo {
  id: string;
  label: string;
  language: string;
  isExternal?: boolean;
  fileUrl?: string;
  cues?: SubtitleCue[];
}

export interface SubtitleStyleConfig {
  enabled: boolean;
  activeTrackId: string; // 'off', 'default', or track ID / language
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // 12px, 16px, 20px, 26px, 32px
  textColor: string; // '#ffffff', '#facc15', '#22d3ee', '#4ade80'
  backgroundColor: string; // 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'transparent'
  position: 'bottom' | 'top';
  offsetSeconds: number; // -5.0 to +5.0
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyleConfig = {
  enabled: true,
  activeTrackId: 'off',
  fontSize: 'md',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  position: 'bottom',
  offsetSeconds: 0,
};

export interface MediaDiagnosticsMetrics {
  sourceFormat: string; // e.g. "HLS m3u8", "MP4 Direct", "Local Blob"
  codec: string; // e.g. "video/mp4; codecs=avc1.640028,mp4a.40.2"
  originalResolution: string; // e.g. "3840×2160 (4K UHD)"
  selectedRendition: string; // e.g. "Auto (1080p @ 4.2Mbps)"
  renderedResolution: string; // e.g. "2048×1152"
  bufferSeconds: number;
  droppedFrames: number;
  totalFrames: number;
  estimatedBandwidthMbps: number;
  networkState: 'optimal' | 'buffering' | 'reconnecting' | 'degraded';
  errorCount: number;
  lastError: string | null;
}

export interface VideoProgressRecord {
  id: string;
  title: string;
  url: string;
  sourceType: MediaSourceType;
  lastPositionSeconds: number;
  durationSeconds: number;
  updatedAtMs: number;
  completed: boolean;
  qualityPreference?: string;
  subtitleLanguage?: string;
}

/**
 * Parses an SRT subtitle string into an array of SubtitleCues
 */
export function parseSrtToCues(srtContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');

  const parseTime = (timeStr: string): number => {
    // 00:01:20,450 or 00:01:20.450
    const parts = timeStr.trim().replace(',', '.').split(':');
    if (parts.length < 3) return 0;
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  };

  let cueIndex = 0;
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      // Find line with timestamp arrow "-->"
      const timeLineIndex = lines.findIndex((l) => l.includes('-->'));
      if (timeLineIndex !== -1) {
        const timeParts = lines[timeLineIndex].split('-->');
        if (timeParts.length === 2) {
          const startTime = parseTime(timeParts[0]);
          const endTime = parseTime(timeParts[1]);
          const text = lines.slice(timeLineIndex + 1).join('\n');
          if (text) {
            cueIndex++;
            cues.push({
              id: `cue-${cueIndex}`,
              startTimeSeconds: startTime,
              endTimeSeconds: endTime,
              text: text.replace(/<[^>]*>/g, ''), // Strip basic HTML tags if any
            });
          }
        }
      }
    }
  }

  return cues;
}

/**
 * Converts SRT text directly to a Blob WebVTT URL suitable for HTML5 <track> element
 */
export function convertSrtToVttUrl(srtContent: string): string {
  const cues = parseSrtToCues(srtContent);
  let vttText = 'WEBVTT\n\n';

  const formatVttTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = (secs % 60).toFixed(3);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(
      6,
      '0'
    )}`;
  };

  cues.forEach((c, idx) => {
    vttText += `${idx + 1}\n${formatVttTime(c.startTimeSeconds)} --> ${formatVttTime(
      c.endTimeSeconds
    )}\n${c.text}\n\n`;
  });

  const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Intelligent ABR Manager — calculates optimal quality level based on network conditions and buffer health
 */
export class IntelligentABRController {
  private lastSwitchTimestamp = 0;
  private switchCooldownMs = 5000; // 5s hysteresis to prevent rapid quality oscillation
  private preferredQuality = 'auto'; // 'auto', '2160p', '1080p', etc.

  public setPreferredQuality(quality: string) {
    this.preferredQuality = quality;
  }

  public getPreferredQuality(): string {
    return this.preferredQuality;
  }

  /**
   * Evaluates current buffer and bandwidth, returning target level index for HLS.js
   * -1 represents Auto in HLS.js
   */
  public evaluateTargetLevel(
    currentBufferSeconds: number,
    availableLevels: StreamQualityLevel[],
    currentLevelIndex: number
  ): number {
    if (this.preferredQuality !== 'auto') {
      // Find level matching preferred height
      const targetHeight = parseInt(this.preferredQuality, 10);
      if (!isNaN(targetHeight)) {
        const found = availableLevels.findIndex((lvl) => lvl.height === targetHeight);
        if (found !== -1) return found;
      }
      return -1; // Fallback to auto
    }

    const now = Date.now();
    if (now - this.lastSwitchTimestamp < this.switchCooldownMs) {
      return currentLevelIndex;
    }

    // Low buffer condition (< 2.5s) -> degrade quality immediately for smooth playback
    if (currentBufferSeconds < 2.5 && currentLevelIndex > 0) {
      this.lastSwitchTimestamp = now;
      return currentLevelIndex - 1;
    }

    // Buffer healthy (> 12s) -> attempt step up
    if (currentBufferSeconds > 12 && currentLevelIndex < availableLevels.length - 1) {
      this.lastSwitchTimestamp = now;
      return currentLevelIndex + 1;
    }

    return currentLevelIndex;
  }
}

/**
 * Format helper for resolution display labels
 */
export function formatResolutionDisplay(width?: number, height?: number): string {
  if (!width || !height) return '1080p (FHD)';
  if (width >= 3840 || height >= 2160) return '3840×2160 (4K UHD)';
  if (width >= 2560 || height >= 1440) return '2560×1440 (2K QHD)';
  if (width >= 1920 || height >= 1080) return '1920×1080 (FHD)';
  if (width >= 1280 || height >= 720) return '1280×720 (HD)';
  return `${width}×${height} (SD)`;
}

/**
 * Local Watch Progress Storage Key
 */
const WATCH_PROGRESS_STORAGE_KEY = 'cineshelf_watch_progress_v2';

export function getSavedWatchProgress(mediaId: string): VideoProgressRecord | null {
  try {
    const raw = localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const records: Record<string, VideoProgressRecord> = JSON.parse(raw);
    return records[mediaId] || null;
  } catch {
    return null;
  }
}

export function saveWatchProgress(record: VideoProgressRecord): void {
  try {
    const raw = localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
    const records: Record<string, VideoProgressRecord> = raw ? JSON.parse(raw) : {};
    records[record.id] = {
      ...record,
      updatedAtMs: Date.now(),
      completed: record.durationSeconds > 0 && record.lastPositionSeconds / record.durationSeconds > 0.92,
    };
    localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore local storage errors
  }
}

export function removeWatchProgress(mediaId: string): void {
  try {
    const raw = localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
    if (!raw) return;
    const records: Record<string, VideoProgressRecord> = JSON.parse(raw);
    delete records[mediaId];
    localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export function getAllWatchProgressRecords(): VideoProgressRecord[] {
  try {
    const raw = localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const records: Record<string, VideoProgressRecord> = JSON.parse(raw);
    return Object.values(records).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  } catch {
    return [];
  }
}
