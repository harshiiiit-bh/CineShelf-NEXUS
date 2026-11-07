import React, { useState } from 'react';
import {
  X,
  Sliders,
  Tv,
  Volume2,
  Subtitles,
  Upload,
  Gauge,
  Clock,
  Sparkles,
  Maximize2,
  Eye,
  Check,
} from 'lucide-react';
import { SubtitleStyleConfig, SubtitleTrackInfo } from '../utils/mediaEngine';
import { StreamQualityLevel } from '../types/nexus';

export type ViewingModeId =
  | 'standard_theatre'
  | 'fullscreen_theatre'
  | 'cinema_focus'
  | 'native_player'
  | 'avatar_follow';

interface MediaSettingsModalProps {
  onClose: () => void;
  // Video Quality
  qualityLevels: StreamQualityLevel[];
  selectedQuality: string; // 'auto', '2160p', '1080p', etc.
  onSelectQuality: (quality: string) => void;
  // Aspect Ratio / Fit
  pictureFitMode: 'fit' | 'original' | 'fill';
  onSelectFitMode: (mode: 'fit' | 'original' | 'fill') => void;
  // Playback Speed
  playbackSpeed: number;
  onSelectPlaybackSpeed: (speed: number) => void;
  // Subtitles
  subtitleTracks: SubtitleTrackInfo[];
  subtitleStyle: SubtitleStyleConfig;
  onUpdateSubtitleStyle: (style: Partial<SubtitleStyleConfig>) => void;
  onUploadCustomSubtitle: (file: File) => void;
  // Viewing Mode
  viewingMode: ViewingModeId;
  onSelectViewingMode: (mode: ViewingModeId) => void;
  // Audio
  audioTracks?: { id: string; label: string; language: string }[];
  selectedAudioTrack?: string;
  onSelectAudioTrack?: (trackId: string) => void;
}

export const MediaSettingsModal: React.FC<MediaSettingsModalProps> = ({
  onClose,
  qualityLevels,
  selectedQuality,
  onSelectQuality,
  pictureFitMode,
  onSelectFitMode,
  playbackSpeed,
  onSelectPlaybackSpeed,
  subtitleTracks,
  subtitleStyle,
  onUpdateSubtitleStyle,
  onUploadCustomSubtitle,
  viewingMode,
  onSelectViewingMode,
  audioTracks = [],
  selectedAudioTrack = 'default',
  onSelectAudioTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'subtitles' | 'viewing'>(
    'video'
  );

  return (
    <div
      data-testid="media-settings-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h3 className="font-display font-bold text-lg text-white">Streaming & Player Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-2 gap-1 overflow-x-auto">
          {[
            { id: 'video', label: 'Video Quality', icon: Gauge },
            { id: 'audio', label: 'Audio Tracks', icon: Volume2 },
            { id: 'subtitles', label: 'Subtitles & Captions', icon: Subtitles },
            { id: 'viewing', label: 'Viewing Modes', icon: Tv },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          {/* TAB 1: VIDEO QUALITY */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              {/* Quality Preset */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Stream Quality Rendition</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectQuality('auto')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                      selectedQuality === 'auto'
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Auto (Intelligent ABR)</span>
                      {selectedQuality === 'auto' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Adapts to network bandwidth</p>
                  </button>

                  {qualityLevels.length > 0
                    ? qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => onSelectQuality(`${lvl.height}p`)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                            selectedQuality === `${lvl.height}p`
                              ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{lvl.label || `${lvl.height}p`}</span>
                            {selectedQuality === `${lvl.height}p` && (
                              <Check className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          {lvl.bitrate && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {(lvl.bitrate / 1000000).toFixed(1)} Mbps
                            </p>
                          )}
                        </button>
                      ))
                    : ['2160p', '1080p', '720p', '480p'].map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => onSelectQuality(res)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                            selectedQuality === res
                              ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{res} {res === '2160p' ? '(4K)' : ''}</span>
                            {selectedQuality === res && <Check className="w-4 h-4 text-blue-400" />}
                          </div>
                        </button>
                      ))}
                </div>
              </div>

              {/* Aspect Ratio & Fit Mode */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-slate-400 font-semibold mb-2">Screen Aspect Ratio / Picture Fit</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fit', label: 'Fit Aspect Ratio (Pillarbox/Letterbox)' },
                    { id: 'original', label: 'Original Native Aspect' },
                    { id: 'fill', label: 'Fill 16:9 Screen (Crop)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onSelectFitMode(mode.id as any)}
                      className={`p-2.5 rounded-2xl border text-center cursor-pointer transition ${
                        pictureFitMode === mode.id
                          ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Speed */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-slate-400 font-semibold mb-2">Playback Speed</label>
                <div className="flex items-center gap-2">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onSelectPlaybackSpeed(spd)}
                      className={`flex-1 py-2 rounded-xl border text-center font-mono cursor-pointer transition ${
                        playbackSpeed === spd
                          ? 'bg-blue-600 border-blue-500 text-white font-bold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO TRACKS */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Available Audio Streams</label>
                {audioTracks.length > 0 ? (
                  <div className="space-y-2">
                    {audioTracks.map((trk) => (
                      <button
                        key={trk.id}
                        type="button"
                        onClick={() => onSelectAudioTrack && onSelectAudioTrack(trk.id)}
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          selectedAudioTrack === trk.id
                            ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-blue-400" />
                          <span>{trk.label} ({trk.language || 'Default'})</span>
                        </div>
                        {selectedAudioTrack === trk.id && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-center">
                    <p className="font-semibold text-slate-300">Single Audio Track (Original)</p>
                    <p className="text-[11px] mt-1">
                      The current media source delivers a single uncompressed audio track. Audio-video synchronization is managed automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUBTITLES & CAPTIONS */}
          {activeTab === 'subtitles' && (
            <div className="space-y-4">
              {/* Active Subtitle Track */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Subtitle Language / Track</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSubtitleStyle({ activeTrackId: 'off' })}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition text-left ${
                      subtitleStyle.activeTrackId === 'off'
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    Off
                  </button>

                  {subtitleTracks.map((trk) => (
                    <button
                      key={trk.id}
                      type="button"
                      onClick={() => onUpdateSubtitleStyle({ activeTrackId: trk.id })}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition text-left ${
                        subtitleStyle.activeTrackId === trk.id
                          ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {trk.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Custom Subtitles (.srt / .vtt) */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-slate-400 font-semibold mb-1">
                  Upload Custom Subtitle File (.srt / .vtt)
                </label>
                <input
                  type="file"
                  accept=".srt,.vtt,text/vtt"
                  className="hidden"
                  id="custom-subtitle-input"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onUploadCustomSubtitle(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="custom-subtitle-input"
                  className="p-3 rounded-2xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/40 flex items-center justify-center gap-2 cursor-pointer text-blue-400 font-semibold transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Browse .SRT or .VTT Subtitle File</span>
                </label>
              </div>

              {/* Personal Visual Subtitle Customization */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <h4 className="font-semibold text-slate-200">Personal Subtitle Style Customization</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Font Size</label>
                    <div className="flex gap-1">
                      {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onUpdateSubtitleStyle({ fontSize: sz })}
                          className={`flex-1 py-1.5 rounded-xl border text-center uppercase font-mono cursor-pointer ${
                            subtitleStyle.fontSize === sz
                              ? 'bg-blue-600 border-blue-500 text-white font-bold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Text Color</label>
                    <div className="flex gap-2">
                      {[
                        { color: '#ffffff', label: 'White' },
                        { color: '#facc15', label: 'Yellow' },
                        { color: '#22d3ee', label: 'Cyan' },
                        { color: '#4ade80', label: 'Green' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => onUpdateSubtitleStyle({ textColor: c.color })}
                          style={{ backgroundColor: c.color }}
                          className={`w-7 h-7 rounded-full border-2 cursor-pointer transition ${
                            subtitleStyle.textColor === c.color ? 'border-blue-500 scale-110' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subtitle Offset Sync Slider */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-400">Subtitle Sync Offset</span>
                    <span className="font-mono font-bold text-blue-400">
                      {subtitleStyle.offsetSeconds > 0 ? `+${subtitleStyle.offsetSeconds}` : subtitleStyle.offsetSeconds}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={subtitleStyle.offsetSeconds}
                    onChange={(e) => onUpdateSubtitleStyle({ offsetSeconds: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VIEWING MODES */}
          {activeTab === 'viewing' && (
            <div className="space-y-3">
              <label className="block text-slate-400 font-semibold mb-1">Select Cinema Viewing Mode</label>
              {[
                {
                  id: 'standard_theatre',
                  title: 'Standard Theatre',
                  desc: '3D Auditorium with full seat controls, avatar movement, and HUD bar.',
                },
                {
                  id: 'cinema_focus',
                  title: 'Cinema Focus Mode',
                  desc: 'Dimmed lights, HUD controls auto-fade, dominant 95% video screen focus.',
                },
                {
                  id: 'fullscreen_theatre',
                  title: 'Fullscreen Theatre',
                  desc: 'WebGL Canvas expands to fill the entire browser viewport.',
                },
                {
                  id: 'native_player',
                  title: 'Native Player Mode',
                  desc: 'Pop-out floating high-DPI HTML5 video player overlay.',
                },
                {
                  id: 'avatar_follow',
                  title: '3D Avatar Camera Mode',
                  desc: 'Smooth 3rd-person character follow camera with 360° orbit controls.',
                },
              ].map((vm) => (
                <button
                  key={vm.id}
                  type="button"
                  onClick={() => onSelectViewingMode(vm.id as ViewingModeId)}
                  className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                    viewingMode === vm.id
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm">{vm.title}</span>
                    {viewingMode === vm.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{vm.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
