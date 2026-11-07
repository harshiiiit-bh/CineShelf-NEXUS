import React, { useState } from 'react';
import {
  X,
  Star,
  Heart,
  Flame,
  Check,
  Trash2,
  Upload,
  ExternalLink,
  Play,
  Plus,
  Image as ImageIcon,
  Edit3,
  Search,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  CatalogItem,
  ContentType,
  EpisodeMetadata,
  LibraryItem,
  MetadataProviderId,
  PriorityLevel,
  WatchStatus,
} from '../types/nexus';
import { useNexus } from '../context/NexusContext';
import { PosterArtwork } from './PosterArtwork';
import { uploadPrivateUserImage } from '../services/firebase';
import { deriveTitleClusterRecommendations, toggleSeriesEpisode } from '../utils/engine';
import {
  buildGoogleImagesPosterSearchUrl,
  fetchTvMazeShowDetailsClient,
  getMetadataProviderLabel,
  searchMultiSourceMetadata,
} from '../utils/metadataProviders';

export const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
  { value: 'want_to_watch', label: 'Want to Watch' },
  { value: 'currently_watching', label: 'Currently Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'plan_to_rewatch', label: 'Plan to Rewatch' },
  { value: 'hidden', label: 'Hidden / Not Interested' },
];

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'series', label: 'Web Series' },
  { value: 'anime', label: 'Anime' },
  { value: 'animated_movie', label: 'Animated Movie' },
  { value: 'animated_series', label: 'Animated Series' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'custom', label: 'Custom Entry' },
];

export const TitleDetailModal: React.FC<{
  item: LibraryItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const {
    account,
    catalog,
    library,
    reviews,
    changeWatchStatus,
    updateLibraryItem,
    deleteLibraryItem,
    toggleEpisodeWatched,
    addReview,
    logWatchSession,
    addCatalogItemToLibrary,
    addToast,
  } = useNexus();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'edit_metadata' | 'episodes' | 'reviews' | 'similar'
  >(item.contentType.includes('series') || item.contentType === 'anime' ? 'episodes' : 'overview');

  const [showChangePosterPanel, setShowChangePosterPanel] = useState(false);
  const [personalNotes, setPersonalNotes] = useState(item.personalNotes || '');
  const [rating, setRating] = useState(item.userRating || 0);
  const [reviewHeadline, setReviewHeadline] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSentiment, setReviewSentiment] = useState<'positive' | 'neutral' | 'negative'>(
    'positive'
  );
  const [spoilers, setSpoilers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [manualPosterUrl, setManualPosterUrl] = useState(item.posterUrl || '');

  const [editTitle, setEditTitle] = useState(item.title);
  const [editContentType, setEditContentType] = useState<ContentType>(item.contentType);
  const [editReleaseYear, setEditReleaseYear] = useState(item.releaseYear);
  const [editRuntime, setEditRuntime] = useState(item.runtimeMinutes);
  const [editLanguage, setEditLanguage] = useState(item.language || 'English');
  const [editCountry, setEditCountry] = useState(item.country || 'India');
  const [editDirector, setEditDirector] = useState(item.director || '');
  const [editCastText, setEditCastText] = useState((item.cast || []).join(', '));
  const [editGenresText, setEditGenresText] = useState((item.genres || []).join(', '));
  const [editTagsText, setEditTagsText] = useState((item.tags || []).join(', '));
  const [editOverview, setEditOverview] = useState(item.overview || '');
  const [editSeasons, setEditSeasons] = useState(item.totalSeasons || 1);
  const [editEpisodes, setEditEpisodes] = useState(item.totalEpisodes || 8);

  const itemReviews = reviews.filter((r) => r.itemId === item.id);
  const similarClusters = deriveTitleClusterRecommendations(item, catalog, library);
  const seriesStats = toggleSeriesEpisode(
    { ...item, watchedEpisodeCodes: item.watchedEpisodeCodes || [] },
    '__NOOP__'
  );
  const totalEps = Math.max(item.totalEpisodes || item.episodes?.length || 1, 1);
  const completedEps = item.watchedEpisodeCodes?.length ?? item.completedEpisodes ?? 0;
  const completionPct = Math.min(100, Math.round((completedEps / totalEps) * 100));

  const providerBadgeLabel = getMetadataProviderLabel(
    item.metadataProvider ||
      (item.movieId?.startsWith('tvmaze-')
        ? 'tvmaze'
        : item.movieId?.startsWith('arch-')
        ? 'local_json'
        : 'manual')
  );

  const googleImagesShortcutUrl = buildGoogleImagesPosterSearchUrl(
    item.title,
    item.releaseYear,
    item.contentType
  );

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    setUploadingPoster(true);
    try {
      const { url } = await uploadPrivateUserImage(account.uid, 'posters', file);
      await updateLibraryItem(item.id, { posterUrl: url });
      setManualPosterUrl(url);
      addToast('Uploaded poster from device.');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Poster upload failed.', 'error');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSaveEditedMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    await updateLibraryItem(item.id, {
      title: editTitle.trim(),
      contentType: editContentType,
      releaseYear: Number(editReleaseYear) || 2024,
      runtimeMinutes: Number(editRuntime) || 120,
      language: editLanguage.trim() || 'English',
      country: editCountry.trim() || 'India',
      director: editDirector.trim(),
      cast: editCastText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      genres: editGenresText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: editTagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      overview: editOverview.trim(),
      totalSeasons:
        editContentType.includes('series') || editContentType === 'anime'
          ? Number(editSeasons) || 1
          : 0,
      totalEpisodes:
        editContentType.includes('series') || editContentType === 'anime'
          ? Number(editEpisodes) || 1
          : 0,
    });
    addToast(`Updated "${editTitle.trim()}".`);
    setActiveTab('overview');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewHeadline.trim() || !reviewBody.trim()) return;
    await addReview({
      itemId: item.id,
      title: item.title,
      rating: rating || 8.5,
      headline: reviewHeadline.trim(),
      body: reviewBody.trim(),
      containsSpoilers: spoilers,
      sentiment: reviewSentiment,
    });
    setReviewHeadline('');
    setReviewBody('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-5 flex-1">
            <div className="w-24 sm:w-28 shrink-0 space-y-2">
              <PosterArtwork src={item.posterUrl} title={item.title} year={item.releaseYear} />
              <button
                type="button"
                onClick={() => {
                  setShowChangePosterPanel((prev) => !prev);
                  setActiveTab('overview');
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-blue-600/20 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Change Poster</span>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase">
                  {item.contentType.replace('_', ' ')}
                </span>
                <span>·</span>
                <span className="font-mono">{item.releaseYear}</span>
                <span>·</span>
                <span className="font-mono">{item.runtimeMinutes}m</span>
                {item.language && (
                  <>
                    <span>·</span>
                    <span>{item.language}</span>
                  </>
                )}
                <span
                  data-testid="metadata-provider-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[11px] font-medium text-blue-400"
                >
                  <Database className="w-3 h-3" />
                  <span>{providerBadgeLabel}</span>
                </span>
              </div>

              <h2
                id="detail-modal-title"
                className="font-display text-2xl font-bold text-slate-900 dark:text-white"
              >
                {item.title}
              </h2>

              {item.director && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.director}
                  {item.cast?.length > 0 && ` · ${item.cast.slice(0, 4).join(', ')}`}
                </p>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed line-clamp-3">
                {item.overview || 'No synopsis recorded.'}
              </p>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label htmlFor="modal-status-select" className="sr-only">
                  Watch Status
                </label>
                <select
                  id="modal-status-select"
                  value={item.status}
                  onChange={(e) => changeWatchStatus(item.id, e.target.value as WatchStatus)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => updateLibraryItem(item.id, { isFavourite: !item.isFavourite })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border cursor-pointer ${
                    item.isFavourite
                      ? 'bg-rose-600/15 border-rose-500/40 text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>{item.isFavourite ? 'Favourited' : 'Favourite'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateLibraryItem(item.id, { isHighlyAnticipated: !item.isHighlyAnticipated })
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border cursor-pointer ${
                    item.isHighlyAnticipated
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Anticipated</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('edit_metadata')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Metadata</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    logWatchSession({
                      itemId: item.id,
                      title: item.title,
                      contentType: item.contentType,
                      watchedDate: new Date().toISOString().slice(0, 10),
                      durationMinutes: item.runtimeMinutes || 120,
                      isRewatch: item.status === 'watched',
                      ratingAtWatch: item.userRating || 9,
                      sessionNotes: 'Logged watch session',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-blue-500" />
                  <span>Log Watch</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 px-6 pt-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          {(
            [
              { id: 'overview', label: 'Overview & Poster' },
              { id: 'edit_metadata', label: 'Edit Metadata' },
              { id: 'episodes', label: `Episodes (${completionPct}%)` },
              { id: 'reviews', label: `Reviews (${itemReviews.length})` },
              { id: 'similar', label: 'Similar' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="detail-rating-range"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Rating: <span className="font-mono text-blue-500">{rating}/10</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="detail-rating-range"
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => updateLibraryItem(item.id, { userRating: rating })}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Save Rating
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="detail-personal-notes"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Notes
                  </label>
                  <textarea
                    id="detail-personal-notes"
                    rows={3}
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Private notes..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => updateLibraryItem(item.id, { personalNotes })}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border ${
                    showChangePosterPanel
                      ? 'bg-blue-950/20 border-blue-500/50'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2.5">
                    Poster Artwork
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <label className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      <span>{uploadingPoster ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handlePosterFileChange}
                        className="hidden"
                      />
                    </label>

                    <a
                      href={googleImagesShortcutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-500 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Images</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        updateLibraryItem(item.id, { posterUrl: '' });
                        setManualPosterUrl('');
                        addToast('Reset poster to default placeholder.', 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={manualPosterUrl}
                      onChange={(e) => setManualPosterUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualPosterUrl.trim()) {
                          updateLibraryItem(item.id, { posterUrl: manualPosterUrl.trim() });
                          addToast('Updated poster URL.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>

                {/* Delete Entry */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Entry</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Confirm delete?</span>
                      <button
                        type="button"
                        onClick={() => deleteLibraryItem(item.id)}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit_metadata' && (
            <form onSubmit={handleSaveEditedMetadata} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={editContentType}
                    onChange={(e) => setEditContentType(e.target.value as ContentType)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {CONTENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={editReleaseYear}
                    onChange={(e) => setEditReleaseYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Runtime (m)
                  </label>
                  <input
                    type="number"
                    value={editRuntime}
                    onChange={(e) => setEditRuntime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Director / Creator
                  </label>
                  <input
                    type="text"
                    value={editDirector}
                    onChange={(e) => setEditDirector(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Cast
                  </label>
                  <input
                    type="text"
                    value={editCastText}
                    onChange={(e) => setEditCastText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Genres
                  </label>
                  <input
                    type="text"
                    value={editGenresText}
                    onChange={(e) => setEditGenresText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editTagsText}
                    onChange={(e) => setEditTagsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {(editContentType.includes('series') || editContentType === 'anime') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Seasons
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editSeasons}
                      onChange={(e) => setEditSeasons(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Episodes
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editEpisodes}
                      onChange={(e) => setEditEpisodes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Synopsis
                </label>
                <textarea
                  rows={2}
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Metadata Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'episodes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <span className="font-bold text-slate-900 dark:text-white">
                  {completedEps}/{totalEps} Episodes ({completionPct}%)
                </span>
                <span className="text-blue-500">
                  Next: {seriesStats.nextEpisodeCode || 'Completed'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  item.episodes || [
                    {
                      code: 'S1E1',
                      seasonNumber: 1,
                      episodeNumber: 1,
                      title: 'Episode 1',
                      releaseDate: `${item.releaseYear}-01-01`,
                      runtimeMinutes: 45,
                    },
                    {
                      code: 'S1E2',
                      seasonNumber: 1,
                      episodeNumber: 2,
                      title: 'Episode 2',
                      releaseDate: `${item.releaseYear}-01-08`,
                      runtimeMinutes: 45,
                    },
                    {
                      code: 'S1E3',
                      seasonNumber: 1,
                      episodeNumber: 3,
                      title: 'Episode 3',
                      releaseDate: `${item.releaseYear}-01-15`,
                      runtimeMinutes: 45,
                    },
                    {
                      code: 'S1E4',
                      seasonNumber: 1,
                      episodeNumber: 4,
                      title: 'Episode 4',
                      releaseDate: `${item.releaseYear}-01-22`,
                      runtimeMinutes: 45,
                    },
                  ]
                ).map((ep) => {
                  const isWatched = (item.watchedEpisodeCodes || []).includes(ep.code);
                  return (
                    <button
                      key={ep.code}
                      type="button"
                      onClick={() => toggleEpisodeWatched(item.id, ep.code)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                        isWatched
                          ? 'bg-blue-600/10 border-blue-500/40 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono text-blue-500">
                          {ep.code} · {ep.runtimeMinutes}m
                        </div>
                        <div className="text-xs font-semibold mt-0.5">{ep.title}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          isWatched
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isWatched && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <form
                onSubmit={handleSubmitReview}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={reviewHeadline}
                    onChange={(e) => setReviewHeadline(e.target.value)}
                    placeholder="Review headline..."
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <select
                    value={reviewSentiment}
                    onChange={(e) =>
                      setReviewSentiment(e.target.value as 'positive' | 'neutral' | 'negative')
                    }
                    aria-label="Review Sentiment"
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  required
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Write your review..."
                  className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={spoilers}
                      onChange={(e) => setSpoilers(e.target.checked)}
                    />
                    <span>Spoilers</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Review
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {itemReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {r.headline}
                      </span>
                      <span className="font-mono text-amber-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {r.rating}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similarClusters.map((s) => (
                <div
                  key={s.item.movieId}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-[10px] font-mono text-blue-500">{s.categoryLabel}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {s.item.title} ({s.item.releaseYear})
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.whyRecommended}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCatalogItemToLibrary(s.item, 'want_to_watch')}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    + Watchlist
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AddEntryModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { account, catalog, addOrMergeLibraryItem, addToast } = useNexus();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('movie');
  const [status, setStatus] = useState<WatchStatus>('want_to_watch');
  const [releaseYear, setReleaseYear] = useState(2024);
  const [runtimeMinutes, setRuntimeMinutes] = useState(125);
  const [userRating, setUserRating] = useState(8.5);
  const [language, setLanguage] = useState('Hindi');
  const [country, setCountry] = useState('India');
  const [director, setDirector] = useState('');
  const [genresText, setGenresText] = useState('Military Drama, Action');
  const [tagsText, setTagsText] = useState('Realistic Operations, Inspirational');
  const [castText, setCastText] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [overview, setOverview] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'merge' | 'prevent'>('merge');
  const [totalSeasons, setTotalSeasons] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(8);
  const [importedEpisodes, setImportedEpisodes] = useState<EpisodeMetadata[] | undefined>(
    undefined
  );
  const [metadataProvider, setMetadataProvider] = useState<MetadataProviderId>('manual');
  const [providerExternalId, setProviderExternalId] = useState('');
  const [providerAttribution, setProviderAttribution] = useState('User-supplied manual entry');

  const [searchingProviders, setSearchingProviders] = useState(false);
  const [providerResults, setProviderResults] = useState<CatalogItem[]>([]);
  const [providerErrorNotice, setProviderErrorNotice] = useState<string | null>(null);
  const [uploadingPosterFile, setUploadingPosterFile] = useState(false);

  const handleMultiSourceLookup = async () => {
    const q = title.trim();
    if (!q) {
      addToast('Enter a title to search.', 'info');
      return;
    }
    setSearchingProviders(true);
    setProviderErrorNotice(null);
    try {
      const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setProviderResults(data.results || []);
        if (data.errorNotice) setProviderErrorNotice(data.errorNotice);
      } else {
        const fallback = await searchMultiSourceMetadata(q, catalog);
        setProviderResults(fallback.results);
      }
    } catch {
      const fallback = await searchMultiSourceMetadata(q, catalog);
      setProviderResults(fallback.results);
      if (fallback.errorNotice) setProviderErrorNotice(fallback.errorNotice);
    } finally {
      setSearchingProviders(false);
    }
  };

  const handleApplyProviderMatch = async (match: CatalogItem) => {
    let enriched = match;
    if (match.metadataProvider === 'tvmaze' && match.providerExternalId) {
      const fullShow = await fetchTvMazeShowDetailsClient(match.providerExternalId);
      if (fullShow) enriched = fullShow;
    }
    setTitle(enriched.title);
    setContentType(enriched.contentType);
    setReleaseYear(enriched.releaseYear);
    setRuntimeMinutes(enriched.runtimeMinutes);
    setLanguage(enriched.language);
    setCountry(enriched.country);
    setDirector(enriched.director);
    setGenresText(enriched.genres.join(', '));
    setTagsText(enriched.tags.join(', '));
    setCastText(enriched.cast.join(', '));
    setPosterUrl(enriched.posterUrl);
    setOverview(enriched.overview);
    if (enriched.totalSeasons) setTotalSeasons(enriched.totalSeasons);
    if (enriched.totalEpisodes) setTotalEpisodes(enriched.totalEpisodes);
    if (enriched.episodes) setImportedEpisodes(enriched.episodes);
    setMetadataProvider(enriched.metadataProvider || 'local_json');
    setProviderExternalId(enriched.providerExternalId || enriched.movieId);
    setProviderAttribution(
      enriched.providerAttribution ||
        getMetadataProviderLabel(enriched.metadataProvider || 'local_json')
    );
    setProviderResults([]);
    addToast(
      `Imported from ${getMetadataProviderLabel(enriched.metadataProvider || 'local_json')}.`
    );
  };

  const handleAddModalPosterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    setUploadingPosterFile(true);
    try {
      const { url } = await uploadPrivateUserImage(account.uid, 'posters', file);
      setPosterUrl(url);
      addToast('Attached poster from device.');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Poster upload failed.', 'error');
    } finally {
      setUploadingPosterFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addOrMergeLibraryItem(
      {
        title: title.trim(),
        contentType,
        status,
        metadataProvider,
        providerExternalId: providerExternalId || `manual-${Date.now()}`,
        providerAttribution,
        releaseYear: Number(releaseYear) || 2024,
        runtimeMinutes: Number(runtimeMinutes) || 120,
        userRating: status === 'watched' ? Number(userRating) : 0,
        language,
        country,
        director,
        genres: genresText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        cast: castText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        posterUrl: posterUrl.trim() || undefined,
        overview: overview.trim(),
        priority,
        totalSeasons: contentType.includes('series') || contentType === 'anime' ? totalSeasons : 0,
        totalEpisodes:
          contentType.includes('series') || contentType === 'anime' ? totalEpisodes : 0,
        episodes: importedEpisodes,
      },
      duplicateStrategy
    );
    onClose();
  };

  const googleImagesUrl = buildGoogleImagesPosterSearchUrl(
    title || 'movie',
    releaseYear,
    contentType
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-entry-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3
            id="add-entry-modal-title"
            className="font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            Add Movie or Series
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add entry modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label
                htmlFor="add-title-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Title *
              </label>
              <input
                id="add-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Search or enter title..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleMultiSourceLookup}
                disabled={searchingProviders}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/40 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {searchingProviders ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search TVmaze & Archive</span>
              </button>
            </div>
          </div>

          {providerErrorNotice && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              {providerErrorNotice}
            </div>
          )}

          {providerResults.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Matches</span>
                <button
                  type="button"
                  onClick={() => setProviderResults([])}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              {providerResults.slice(0, 8).map((cand) => (
                <div
                  key={`${cand.metadataProvider}-${cand.movieId}`}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cand.title} ({cand.releaseYear})
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-[10px] font-mono text-blue-400">
                        {getMetadataProviderLabel(cand.metadataProvider)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyProviderMatch(cand)}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Import Metadata
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="add-content-type"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Type
              </label>
              <select
                id="add-content-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {CONTENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="add-watch-status"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Status
              </label>
              <select
                id="add-watch-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as WatchStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="add-priority"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                Priority
              </label>
              <select
                id="add-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Year
              </label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Runtime (m)
              </label>
              <input
                type="number"
                value={runtimeMinutes}
                onChange={(e) => setRuntimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Rating (0-10)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={userRating}
                onChange={(e) => setUserRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {(contentType.includes('series') || contentType === 'anime') && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-blue-950/20 border border-blue-800/40">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Seasons
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalSeasons}
                  onChange={(e) => setTotalSeasons(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Episodes
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Poster Artwork */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Poster Artwork
              </span>
              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3 text-blue-500" />
                  <span>{uploadingPosterFile ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleAddModalPosterFile}
                    className="hidden"
                  />
                </label>
                <a
                  href={googleImagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-blue-500 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Search Google Images</span>
                </a>
              </div>
            </div>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="Or paste direct image URL (https://...)"
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Director / Creator
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Director or network..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Genres
              </label>
              <input
                type="text"
                value={genresText}
                onChange={(e) => setGenresText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Synopsis
            </label>
            <textarea
              rows={2}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Overview..."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <select
              value={duplicateStrategy}
              onChange={(e) => setDuplicateStrategy(e.target.value as 'merge' | 'prevent')}
              aria-label="Duplicate Handling Policy"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="merge">Merge Duplicates</option>
              <option value="prevent">Block Duplicates</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Library</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
