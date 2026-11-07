import React from 'react';
import { Activity, ShieldCheck, Gauge, Layers, Cpu, Radio, X } from 'lucide-react';
import { MediaDiagnosticsMetrics } from '../utils/mediaEngine';

interface MediaDiagnosticsOverlayProps {
  metrics: MediaDiagnosticsMetrics;
  onClose: () => void;
}

export const MediaDiagnosticsOverlay: React.FC<MediaDiagnosticsOverlayProps> = ({
  metrics,
  onClose,
}) => {
  return (
    <div
      data-testid="media-diagnostics-overlay"
      className="absolute top-4 left-4 z-50 w-80 p-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-white text-xs font-mono shadow-2xl space-y-3 pointer-events-auto"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Streaming Diagnostics 2.0
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 text-[11px]">
        {/* Source Format */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-blue-400" />
            Source Format:
          </span>
          <span className="font-semibold text-blue-300 truncate max-w-[140px]">
            {metrics.sourceFormat}
          </span>
        </div>

        {/* Original Source Resolution */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-emerald-400" />
            1. Original Source Res:
          </span>
          <span className="font-bold text-emerald-400">{metrics.originalResolution}</span>
        </div>

        {/* Selected Stream Rendition */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3 h-3 text-amber-400" />
            2. Selected Rendition:
          </span>
          <span className="font-bold text-amber-300">{metrics.selectedRendition}</span>
        </div>

        {/* Actual Rendered Resolution */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-purple-400" />
            3. Actual Rendered Res:
          </span>
          <span className="font-bold text-purple-300">{metrics.renderedResolution}</span>
        </div>

        {/* Buffer Health */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Buffer Health:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  metrics.bufferSeconds > 8
                    ? 'bg-emerald-500'
                    : metrics.bufferSeconds > 3
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (metrics.bufferSeconds / 15) * 100)}%` }}
              />
            </div>
            <span className="text-slate-200">{metrics.bufferSeconds.toFixed(1)}s</span>
          </div>
        </div>

        {/* Frame Presentation & Dropped Frames */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Dropped Frames:</span>
          <span
            className={metrics.droppedFrames > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}
          >
            {metrics.droppedFrames} / {metrics.totalFrames}
          </span>
        </div>

        {/* Network State */}
        <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Network State:
          </span>
          <span
            className={`font-bold capitalize ${
              metrics.networkState === 'optimal'
                ? 'text-emerald-400'
                : metrics.networkState === 'buffering'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {metrics.networkState}
          </span>
        </div>
      </div>
    </div>
  );
};
