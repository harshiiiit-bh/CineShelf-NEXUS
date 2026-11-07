import { useState, useEffect, useCallback, useRef } from 'react';

export interface LocalVideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
  aspectRatio: number;
  aspectRatioLabel: string;
  resolutionLabel: string;
  fileSizeFormatted: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface UseLocalVideoResult {
  videoUrl: string | null;
  selectedFile: File | null;
  metadata: LocalVideoMetadata | null;
  isProbing: boolean;
  error: string | null;
  selectFile: (file: File | null) => void;
  clearFile: () => void;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Custom React hook for instant local video playback via URL.createObjectURL(file).
 * Automatically revokes object URLs on source change or component unmount to prevent memory leaks.
 */
export function useLocalVideo(initialFile: File | null = null): UseLocalVideoResult {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<LocalVideoMetadata | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store active object URL ref to guarantee cleanup across renders and unmounts
  const activeObjectUrlRef = useRef<string | null>(null);

  const revokeActiveUrl = useCallback(() => {
    if (activeObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      } catch {
        // Ignore revocation errors if URL was already revoked
      }
      activeObjectUrlRef.current = null;
    }
  }, []);

  const clearFile = useCallback(() => {
    revokeActiveUrl();
    setSelectedFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setIsProbing(false);
    setError(null);
  }, [revokeActiveUrl]);

  const selectFile = useCallback(
    (file: File | null) => {
      // 1. Clean up previous object URL to prevent memory leaks
      revokeActiveUrl();

      if (!file) {
        clearFile();
        return;
      }

      // Validate video MIME type or extension
      const isValidVideo =
        file.type.startsWith('video/') ||
        Boolean(file.name.match(/\.(mp4|webm|mov|m4v|mkv|ogg)$/i));

      if (!isValidVideo) {
        setError('Selected file is not a supported video format (.mp4, .webm, .mov, or .m4v).');
        setSelectedFile(null);
        setVideoUrl(null);
        setMetadata(null);
        return;
      }

      setError(null);
      setIsProbing(true);

      // 2. Create immediate object URL for zero-latency local playback
      const objectUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = objectUrl;
      setSelectedFile(file);
      setVideoUrl(objectUrl);

      // 3. Background probe for metadata and thumbnail
      const probeVid = document.createElement('video');
      probeVid.src = objectUrl;
      probeVid.preload = 'metadata';
      probeVid.muted = true;
      probeVid.crossOrigin = 'anonymous';

      const cleanUpProbe = () => {
        probeVid.removeAttribute('src');
        probeVid.load();
      };

      probeVid.onloadedmetadata = () => {
        const w = probeVid.videoWidth || 1920;
        const h = probeVid.videoHeight || 1080;
        const dur = Math.round(probeVid.duration || 0);
        const ratio = w / h;

        let arLabel = '16:9 Standard';
        if (ratio >= 2.2) arLabel = '2.39:1 Cinemascope';
        else if (ratio >= 1.7) arLabel = '16:9 Standard';
        else if (ratio >= 1.3) arLabel = '4:3 Academy';
        else arLabel = `${w}:${h}`;

        let resLabel = `${w}×${h}`;
        if (w >= 3840 || h >= 2160) resLabel = '3840×2160 (4K UHD)';
        else if (w >= 2560 || h >= 1440) resLabel = '2560×1440 (2K QHD)';
        else if (w >= 1920 || h >= 1080) resLabel = '1920×1080 (FHD)';
        else if (w >= 1280 || h >= 720) resLabel = '1280×720 (HD)';

        // Attempt frame seek for thumbnail
        probeVid.currentTime = Math.min(dur * 0.15, 3);
      };

      probeVid.onseeked = () => {
        let thumbUrl: string | undefined = undefined;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(probeVid.videoWidth || 640, 640);
          canvas.height = Math.round(
            canvas.width / (probeVid.videoWidth / probeVid.videoHeight || 16 / 9)
          );
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(probeVid, 0, 0, canvas.width, canvas.height);
            thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // ignore canvas extraction restrictions
        }

        const w = probeVid.videoWidth || 1920;
        const h = probeVid.videoHeight || 1080;
        const dur = Math.round(probeVid.duration || 0);
        const ratio = w / h;

        let arLabel = '16:9 Standard';
        if (ratio >= 2.2) arLabel = '2.39:1 Cinemascope';
        else if (ratio >= 1.7) arLabel = '16:9 Standard';
        else if (ratio >= 1.3) arLabel = '4:3 Academy';
        else arLabel = `${w}:${h}`;

        let resLabel = `${w}×${h}`;
        if (w >= 3840 || h >= 2160) resLabel = '3840×2160 (4K UHD)';
        else if (w >= 2560 || h >= 1440) resLabel = '2560×1440 (2K QHD)';
        else if (w >= 1920 || h >= 1080) resLabel = '1920×1080 (FHD)';
        else if (w >= 1280 || h >= 720) resLabel = '1280×720 (HD)';

        setMetadata({
          width: w,
          height: h,
          durationSeconds: dur,
          aspectRatio: ratio,
          aspectRatioLabel: arLabel,
          resolutionLabel: resLabel,
          fileSizeFormatted: formatBytes(file.size),
          fileName: file.name,
          mimeType: file.type || 'video/mp4',
          thumbnailUrl: thumbUrl,
        });

        setIsProbing(false);
        cleanUpProbe();
      };

      probeVid.onerror = () => {
        setIsProbing(false);
        cleanUpProbe();
        // Still allow direct video playback even if metadata probe fails
        setMetadata({
          width: 1920,
          height: 1080,
          durationSeconds: 0,
          aspectRatio: 16 / 9,
          aspectRatioLabel: '16:9 Standard',
          resolutionLabel: '1080p (FHD)',
          fileSizeFormatted: formatBytes(file.size),
          fileName: file.name,
          mimeType: file.type || 'video/mp4',
        });
      };
    },
    [revokeActiveUrl, clearFile]
  );

  // Auto-initialize or reactively change object URL when file prop changes
  useEffect(() => {
    if (initialFile) {
      selectFile(initialFile);
    } else if (initialFile === null) {
      clearFile();
    }
  }, [initialFile, selectFile, clearFile]);

  // Guarantee revocation of object URL on unmount
  useEffect(() => {
    return () => {
      revokeActiveUrl();
    };
  }, [revokeActiveUrl]);

  return {
    videoUrl,
    selectedFile,
    metadata,
    isProbing,
    error,
    selectFile,
    clearFile,
  };
}
