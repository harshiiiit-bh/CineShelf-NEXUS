import React, { useMemo, useState } from 'react';
import {
  Plus,
  Star,
  Heart,
  Flame,
  Check,
  Tv,
  Sparkles,
  EyeOff,
  Search,
  Database,
  Image as ImageIcon,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { WatchStatus } from '../types/nexus';
import { PosterArtwork } from './PosterArtwork';
import { STATUS_OPTIONS } from './TitleModals';
import {
  generateExplainableRecommendations,
  toggleSeriesEpisode,
} from '../utils/engine';
import { getMetadataProviderLabel } from '../utils/metadataProviders';

export const LibraryView: React.FC = () => {
  const {
    library,
    preferences,
    changeWatchStatus,
    setSelectedItemForModal,
    setIsAddModalOpen,
  } = useNexus();

  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'all' | 'favourites'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return library.filter((item) => {
      if (statusFilter === 'favourites') {
        if (!item.isFavourite) return false;
      } else if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      } else {
        if (item.status === 'hidden') return false;
      }
      if (typeFilter !== 'all' && item.contentType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDir = (item.director || '').toLowerCase().includes(q);
        const matchGenre = item.genres.some((g) => g.toLowerCase().includes(q));
        if (!matchTitle && !matchDir && !matchGenre) return false;
      }
      return true;
    });
  }, [library, statusFilter, typeFilter, searchQuery]);

  const gridColsClass =
    preferences.posterDensity === 'compact'
      ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
      : preferences.posterDensity === 'cinematic'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className="space-y-6 pb-12">
      {/* Compact Library Filter Header */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              My Library
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-500">
              {filteredItems.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Title</span>
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Active' },
              { id: 'currently_watching', label: 'Watching' },
              { id: 'want_to_watch', label: 'Watchlist' },
              { id: 'watched', label: 'Watched' },
              { id: 'on_hold', label: 'On Hold' },
              { id: 'dropped', label: 'Dropped' },
              { id: 'plan_to_rewatch', label: 'Rewatch' },
              { id: 'favourites', label: 'Favourites' },
              { id: 'hidden', label: 'Hidden' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Content Type Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter library by title, director, or genre..."
              aria-label="Filter library"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter library by content type"
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="series">Web Series</option>
            <option value="anime">Anime</option>
            <option value="animated_movie">Animated Movies</option>
            <option value="animated_series">Animated Series</option>
            <option value="documentary">Documentaries</option>
            <option value="short_film">Short Films</option>
          </select>
        </div>
      </div>

      {/* Poster Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            No titles in this view
          </h3>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
          >
            + Add Title
          </button>
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition"
            >
              <div>
                <div
                  onClick={() => setSelectedItemForModal(item)}
                  className="relative cursor-pointer"
                >
                  <PosterArtwork
                    src={item.posterUrl}
                    title={item.title}
                    year={item.releaseYear}
                    className="w-full aspect-[2/3]"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {item.isFavourite && (
                      <span className="p-1.5 rounded-lg bg-rose-600/90 text-white shadow">
                        <Heart className="w-3 h-3 fill-white" />
                      </span>
                    )}
                    {item.isHighlyAnticipated && (
                      <span className="p-1.5 rounded-lg bg-amber-500/90 text-slate-950 shadow">
                        <Flame className="w-3 h-3 fill-slate-950" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {item.releaseYear} · {item.runtimeMinutes}m
                    </span>
                    {item.userRating > 0 && (
                      <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.userRating}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => setSelectedItemForModal(item)}
                    className="font-display text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-500"
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="inline-flex items-center gap-1 font-mono text-blue-400 truncate">
                      <Database className="w-2.5 h-2.5 shrink-0" />
                      {getMetadataProviderLabel(item.metadataProvider)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemForModal(item)}
                      className="text-slate-400 hover:text-blue-400 flex items-center gap-0.5 cursor-pointer shrink-0"
                    >
                      <ImageIcon className="w-2.5 h-2.5" />
                      <span>Poster</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 pt-0">
                <select
                  aria-label={`Change status for ${item.title}`}
                  value={item.status}
                  onChange={(e) => changeWatchStatus(item.id, e.target.value as WatchStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Series & Episode Progress Tracker
 */
export const SeriesTrackerView: React.FC = () => {
  const { library, toggleEpisodeWatched, setSelectedItemForModal, setIsAddModalOpen } = useNexus();

  const seriesItems = useMemo(
    () =>
      library.filter(
        (i) =>
          i.contentType === 'series' ||
          i.contentType === 'anime' ||
          i.contentType === 'animated_series'
      ),
    [library]
  );

  return (
    <div className="space-y-5 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Tv className="w-5 h-5 text-blue-500" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Series & Episode Tracker
          </h1>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-500">
            {seriesItems.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          + Add Series
        </button>
      </div>

      <div className="space-y-4">
        {seriesItems.map((series) => {
          const totalEps = Math.max(series.totalEpisodes || series.episodes?.length || 1, 1);
          const completedEps =
            series.watchedEpisodeCodes?.length ?? series.completedEpisodes ?? 0;
          const pct = Math.min(100, Math.round((completedEps / totalEps) * 100));
          const remainingEps = Math.max(0, totalEps - completedEps);
          const nextCalc = toggleSeriesEpisode(
            { ...series, watchedEpisodeCodes: series.watchedEpisodeCodes || [] },
            '__NOOP__'
          );
          const episodesList = series.episodes || [
            {
              code: 'S1E1',
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'Episode 1',
              releaseDate: `${series.releaseYear}-01-01`,
              runtimeMinutes: 45,
            },
            {
              code: 'S1E2',
              seasonNumber: 1,
              episodeNumber: 2,
              title: 'Episode 2',
              releaseDate: `${series.releaseYear}-01-08`,
              runtimeMinutes: 45,
            },
            {
              code: 'S1E3',
              seasonNumber: 1,
              episodeNumber: 3,
              title: 'Episode 3',
              releaseDate: `${series.releaseYear}-01-15`,
              runtimeMinutes: 45,
            },
            {
              code: 'S1E4',
              seasonNumber: 1,
              episodeNumber: 4,
              title: 'Episode 4',
              releaseDate: `${series.releaseYear}-01-22`,
              runtimeMinutes: 45,
            },
          ];

          return (
            <div
              key={series.id}
              className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => setSelectedItemForModal(series)}
                    className="w-14 shrink-0 cursor-pointer"
                  >
                    <PosterArtwork
                      src={series.posterUrl}
                      title={series.title}
                      year={series.releaseYear}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="text-blue-500 uppercase">
                        {series.showStatus || 'Ongoing'}
                      </span>
                      <span>·</span>
                      <span>{series.totalSeasons || 1} Season(s)</span>
                      <span>·</span>
                      <span>{remainingEps} Left</span>
                    </div>
                    <h2
                      onClick={() => setSelectedItemForModal(series)}
                      className="font-display text-lg font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-500"
                    >
                      {series.title}
                    </h2>
                    <div className="text-xs font-mono text-emerald-400 mt-0.5">
                      Next: <strong>{nextCalc.nextEpisodeCode || 'Completed'}</strong>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-56 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">
                      {completedEps}/{totalEps} Episodes
                    </span>
                    <span className="font-bold text-blue-500">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                {episodesList.map((ep) => {
                  const watched = (series.watchedEpisodeCodes || []).includes(ep.code);
                  return (
                    <button
                      key={ep.code}
                      type="button"
                      onClick={() => toggleEpisodeWatched(series.id, ep.code)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        watched
                          ? 'bg-blue-600/15 border-blue-500/40 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono font-bold text-blue-500">
                          {ep.code}
                        </div>
                        <div className="text-xs font-medium truncate">{ep.title}</div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          watched
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {watched && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 16 Explainable Recommendation Feeds with Category Filter Bar
 */
export const RecommendationsView: React.FC = () => {
  const {
    catalog,
    library,
    reviews,
    preferences,
    franchises,
    feedback,
    addCatalogItemToLibrary,
    dismissRecommendationMovieId,
    changeWatchStatus,
    setSelectedItemForModal,
  } = useNexus();

  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('all');

  const sections = useMemo(
    () =>
      generateExplainableRecommendations(
        library,
        catalog,
        franchises,
        preferences,
        feedback,
        reviews
      ),
    [library, catalog, franchises, preferences, feedback, reviews]
  );

  const visibleSections = useMemo(
    () =>
      selectedSectionKey === 'all'
        ? sections
        : sections.filter((s) => s.key === selectedSectionKey),
    [sections, selectedSectionKey]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Feed Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Recommendations
            </h1>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs font-mono">
              16 Feeds
            </span>
          </div>
          {selectedSectionKey !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedSectionKey('all')}
              className="text-xs font-semibold text-blue-500 cursor-pointer"
            >
              Show All 16 Feeds
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSectionKey('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition ${
              selectedSectionKey === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            All Feeds (16)
          </button>
          {sections.map((sec) => (
            <button
              key={sec.key}
              type="button"
              onClick={() => setSelectedSectionKey(sec.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition ${
                selectedSectionKey === sec.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              {sec.title}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation Sections */}
      <div className="space-y-6">
        {visibleSections.map((section) => (
          <section
            key={section.key}
            className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {section.title}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {section.items.length} picks
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {section.items.map((rec) => {
                const existingLibItem = library.find(
                  (l) => l.movieId === rec.catalogItem.movieId
                );
                return (
                  <div
                    key={`${section.key}-${rec.catalogItem.movieId}`}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3.5 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="w-12 shrink-0">
                          <PosterArtwork
                            src={rec.catalogItem.posterUrl}
                            title={rec.catalogItem.title}
                            year={rec.catalogItem.releaseYear}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>{rec.catalogItem.releaseYear}</span>
                            <span className="text-blue-500 font-bold">{rec.matchScore}%</span>
                          </div>
                          <h3 className="font-display text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                            {rec.catalogItem.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">
                            {rec.catalogItem.director}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                        <p className="line-clamp-2 leading-snug">{rec.whyRecommended}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {existingLibItem ? (
                        <button
                          type="button"
                          onClick={() => setSelectedItemForModal(existingLibItem)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Open Entry
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              addCatalogItemToLibrary(rec.catalogItem, 'want_to_watch')
                            }
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            + Watchlist
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addCatalogItemToLibrary(rec.catalogItem, 'watched')
                            }
                            className="py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            Watched
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (existingLibItem) {
                            changeWatchStatus(existingLibItem.id, 'hidden');
                          } else {
                            dismissRecommendationMovieId(rec.catalogItem.movieId);
                          }
                        }}
                        title="Hide from recommendations"
                        className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
