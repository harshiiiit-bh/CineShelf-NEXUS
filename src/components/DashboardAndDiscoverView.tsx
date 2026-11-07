import React, { useMemo, useState } from 'react';
import {
  Plus,
  Sparkles,
  RotateCcw,
  Star,
  Compass,
  Film,
  EyeOff,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Users,
  ChevronRight,
  Database,
  X,
  HardDrive,
  UserCheck,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import {
  getCatalogFilterOptions,
  getCatalogSuggestions,
  queryLocalCatalog,
} from '../utils/catalog';
import {
  calculateLibraryStatistics,
  computeFranchiseProgress,
  deriveTitleClusterRecommendations,
  generateExplainableRecommendations,
  toggleSeriesEpisode,
} from '../utils/engine';
import { PosterArtwork } from './PosterArtwork';
import { CatalogItem } from '../types/nexus';
import { getProviderBadge } from '../utils/metadataProviders';
import { MyMediaPanel } from './MyMediaPanel';
import { apiFetch } from '../utils/api';

export const DashboardView: React.FC = () => {
  const {
    account,
    catalog,
    library,
    watchHistory,
    reviews,
    franchises,
    calendarEvents,
    preferences,
    feedback,
    setActiveSection,
    setSelectedItemForModal,
    setIsAddModalOpen,
    toggleEpisodeWatched,
    changeWatchStatus,
    logWatchSession,
    addCatalogItemToLibrary,
    dismissRecommendationMovieId,
  } = useNexus();

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  const stats = useMemo(
    () => calculateLibraryStatistics(library, watchHistory),
    [library, watchHistory]
  );

  const continueWatching = useMemo(
    () => library.filter((i) => i.status === 'currently_watching'),
    [library]
  );

  const recentlyWatched = useMemo(
    () =>
      library
        .filter((i) => i.status === 'watched')
        .sort((a, b) =>
          (b.lastWatchedAt || b.updatedAt || '').localeCompare(
            a.lastWatchedAt || a.updatedAt || ''
          )
        )
        .slice(0, 4),
    [library]
  );

  const highPriorityWatchlist = useMemo(
    () =>
      library
        .filter((i) => i.status === 'want_to_watch')
        .sort((a, b) => {
          const rank = { critical: 4, high: 3, medium: 2, low: 1 };
          return rank[b.priority] - rank[a.priority];
        })
        .slice(0, 4),
    [library]
  );

  const recSections = useMemo(
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

  const becauseYouWatchedRecs = recSections[0]?.items.slice(0, 4) || [];
  const trendingPersonalized = recSections[13]?.items.slice(0, 4) || [];

  const handleGenerateAiCuratorNote = async () => {
    setAiLoading(true);
    try {
      const resp = await apiFetch('/api/ai/curator-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedTitles: recentlyWatched.map((w) => w.title),
          favouriteGenres: stats.mostWatchedGenres.map((g) => g.name),
        }),
      });
      const data = await resp.json();
      setAiInsight(data.insight);
    } catch {
      setAiInsight(
        'Your viewing history highlights a strong preference for character-driven realism, tactical thrillers, and high-stakes drama.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Compact Welcome & Quick KPI Strip */}
      <section className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-blue-500">
              Overview
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {account?.displayName?.split(' ')[0] || 'Cinephile'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('watch_together')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>3D Cinema</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('character_studio')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Character Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('discover')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>Discover ({catalog.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin_catalog')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Catalogue Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('my-media-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="hero-my-media-btn"
              className="px-3.5 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>My Media</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Title</span>
            </button>
          </div>
        </div>

        {/* 4-Metric KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Movies Watched</div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {stats.totalMoviesWatched}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Episodes Logged</div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {stats.totalEpisodesWatched}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Watch Time</div>
            <div className="text-xl font-bold font-mono text-blue-500 mt-0.5">
              {stats.totalViewingHours}h
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Avg Rating</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {stats.averagePersonalRating}/10
            </div>
          </div>
        </div>

        {/* Optional Curator Note Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {aiInsight ||
                `Top affinities: ${
                  stats.mostWatchedGenres
                    .slice(0, 3)
                    .map((g) => g.name)
                    .join(', ') || 'Drama, Sci-Fi'
                }`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiCuratorNote}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-medium text-blue-500 shrink-0 cursor-pointer"
          >
            {aiLoading ? 'Analyzing...' : 'Taste Summary'}
          </button>
        </div>
      </section>

      {/* My Media: Personal Videos, Direct URLs & Streaming Sources */}
      <section id="my-media-section" aria-label="My Media Panel">
        <MyMediaPanel />
      </section>

      {/* Continue Watching */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Continue Watching
          </h2>
          <button
            type="button"
            onClick={() => setActiveSection('series')}
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
          >
            <span>Series Tracker</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {continueWatching.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
            <span>No titles currently in progress.</span>
            <button
              type="button"
              onClick={() => setActiveSection('library')}
              className="text-blue-500 font-semibold cursor-pointer"
            >
              Open Library →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueWatching.map((item) => {
              const isSeries =
                item.contentType.includes('series') || item.contentType === 'anime';
              const totalEps = Math.max(item.totalEpisodes || item.episodes?.length || 1, 1);
              const doneEps = item.watchedEpisodeCodes?.length ?? item.completedEpisodes ?? 0;
              const pct = isSeries ? Math.min(100, Math.round((doneEps / totalEps) * 100)) : 50;
              const nextInfo = toggleSeriesEpisode(
                { ...item, watchedEpisodeCodes: item.watchedEpisodeCodes || [] },
                '__NOOP__'
              );

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 flex gap-3.5 items-center hover:border-blue-500/40 transition"
                >
                  <div
                    onClick={() => setSelectedItemForModal(item)}
                    className="w-16 shrink-0 cursor-pointer"
                  >
                    <PosterArtwork
                      src={item.posterUrl}
                      title={item.title}
                      year={item.releaseYear}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-blue-500">
                        {isSeries
                          ? `Next: ${nextInfo.nextEpisodeCode || 'Finale'}`
                          : 'In Progress'}
                      </div>
                      <h3
                        onClick={() => setSelectedItemForModal(item)}
                        className="font-display text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-500"
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>{isSeries ? `${doneEps}/${totalEps} eps` : `${item.runtimeMinutes}m`}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSeries && nextInfo.nextEpisodeCode ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleEpisodeWatched(item.id, nextInfo.nextEpisodeCode!)
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Mark {nextInfo.nextEpisodeCode}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeWatchStatus(item.id, 'watched')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedItemForModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recently Watched */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Recently Watched
          </h2>
          <button
            type="button"
            onClick={() => setActiveSection('library')}
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentlyWatched.map((item) => {
            const clusters = deriveTitleClusterRecommendations(
              item,
              catalog,
              library
            ).slice(0, 2);
            const isExpanded = expandedClusterId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-3"
              >
                <div className="flex gap-3.5 items-center">
                  <div
                    onClick={() => setSelectedItemForModal(item)}
                    className="w-16 shrink-0 cursor-pointer"
                  >
                    <PosterArtwork
                      src={item.posterUrl}
                      title={item.title}
                      year={item.releaseYear}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span>{item.lastWatchedAt ? item.lastWatchedAt.slice(0, 10) : 'Watched'}</span>
                      <span>·</span>
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.userRating || '—'}/10
                      </span>
                    </div>
                    <h3
                      onClick={() => setSelectedItemForModal(item)}
                      className="font-display text-base font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-500 mt-0.5"
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.director} · {item.genres.slice(0, 2).join(', ')}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedItemForModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Review / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          logWatchSession({
                            itemId: item.id,
                            title: item.title,
                            contentType: item.contentType,
                            watchedDate: new Date().toISOString().slice(0, 10),
                            durationMinutes: item.runtimeMinutes,
                            isRewatch: true,
                            ratingAtWatch: item.userRating,
                            sessionNotes: 'Logged quick rewatch',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-500" />
                        <span>Rewatch</span>
                      </button>
                      {clusters.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedClusterId(isExpanded ? null : item.id)
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium cursor-pointer"
                        >
                          {isExpanded ? 'Hide Similar' : `Similar (${clusters.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && clusters.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/70 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clusters.map((c) => (
                      <div
                        key={c.item.movieId}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {c.item.title} ({c.item.releaseYear})
                          </div>
                          <div className="text-[10px] text-blue-500 truncate">
                            {c.categoryLabel}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addCatalogItemToLibrary(c.item, 'want_to_watch')}
                          className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Recommendations For You */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Recommended For You
          </h2>
          <button
            type="button"
            onClick={() => setActiveSection('recommendations')}
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
          >
            <span>All 16 Feeds</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...becauseYouWatchedRecs.slice(0, 2), ...trendingPersonalized.slice(0, 2)].map(
            (rec) => (
              <div
                key={`${rec.sectionKey}-${rec.catalogItem.movieId}`}
                className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <PosterArtwork
                    src={rec.catalogItem.posterUrl}
                    title={rec.catalogItem.title}
                    year={rec.catalogItem.releaseYear}
                    className="w-full aspect-[2/3]"
                  />
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        {rec.catalogItem.releaseYear} · {rec.catalogItem.runtimeMinutes}m
                      </span>
                      <span className="text-blue-500 font-semibold">{rec.matchScore}%</span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                      {rec.catalogItem.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {rec.whyRecommended}
                    </p>
                  </div>
                </div>
                <div className="p-3.5 pt-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addCatalogItemToLibrary(rec.catalogItem, 'want_to_watch')}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Watchlist
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissRecommendationMovieId(rec.catalogItem.movieId)}
                    aria-label={`Mark ${rec.catalogItem.title} not interested`}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* Compact 3-Column Bento: Watchlist, Franchises, Upcoming Schedule */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Watchlist Queue */}
        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Priority Watchlist
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('library')}
              className="text-xs text-blue-500 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {highPriorityWatchlist.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedItemForModal(w)}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:border-blue-500/40"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {w.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {w.releaseYear} · {w.runtimeMinutes}m
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-mono uppercase">
                  {w.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Franchise Progress */}
        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Franchise Progress
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('franchises')}
              className="text-xs text-blue-500 font-semibold cursor-pointer"
            >
              Franchises
            </button>
          </div>
          <div className="space-y-2.5">
            {franchises.map((f) => {
              const prog = computeFranchiseProgress(f, library);
              return (
                <div
                  key={f.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {f.name}
                    </span>
                    <span className="font-mono text-blue-500">{prog.completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${prog.completionPercentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Next: {prog.nextInstallmentToWatch?.title || 'Completed'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Watch Calendar
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('calendar')}
              className="text-xs text-blue-500 font-semibold cursor-pointer"
            >
              Schedule
            </button>
          </div>
          <div className="space-y-2">
            {calendarEvents.slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {ev.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{ev.notes}</div>
                </div>
                <span className="text-[11px] font-mono text-blue-500 shrink-0">
                  {ev.plannedDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const COLLECTION_TABS = [
  { id: 'all', label: 'All Catalogue' },
  { id: 'featured', label: 'Featured Essentials' },
  { id: 'indian_military', label: 'Indian Military & Valor' },
  { id: 'sci_fi_essentials', label: 'Sci-Fi Essentials' },
  { id: 'world_cinema', label: 'World Cinema' },
  { id: 'acclaimed_series', label: 'Acclaimed Series' },
  { id: 'recently_added', label: 'Recently Added' },
] as const;

/**
 * Local-First Movie & Series Discovery Engine (Zero External API Dependency)
 */
export const DiscoverView: React.FC = () => {
  const {
    catalog,
    preferences,
    searchHistory,
    recordSearchQuery,
    addCatalogItemToLibrary,
    setIsAddModalOpen,
    setActiveSection,
  } = useNexus();

  const [query, setQuery] = useState('');
  const [activeCollectionTab, setActiveCollectionTab] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('');
  const [directorFilter, setDirectorFilter] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [maxRuntime, setMaxRuntime] = useState(240);
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<
    'popularity' | 'rating' | 'year_desc' | 'year_asc' | 'title_asc' | 'recently_added'
  >('popularity');
  const [selectedCatalogModal, setSelectedCatalogModal] = useState<CatalogItem | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filterOptions = useMemo(() => getCatalogFilterOptions(catalog), [catalog]);

  const suggestions = useMemo(
    () => (query.trim().length >= 1 ? getCatalogSuggestions(catalog, query, 5) : []),
    [catalog, query]
  );

  const results = useMemo(() => {
    const base = queryLocalCatalog(catalog, {
      q: query,
      genre: genreFilter,
      language: languageFilter,
      country: countryFilter,
      year: yearFilter,
      director: directorFilter,
      contentType: contentTypeFilter,
      category: activeCollectionTab,
      sortBy,
    });

    return base.filter((item) => {
      if (actorFilter.trim()) {
        const actorMatch = item.cast.some((c) =>
          c.toLowerCase().includes(actorFilter.trim().toLowerCase())
        );
        if (!actorMatch) return false;
      }
      if (minRating > 0 && item.communityRating < minRating) return false;
      if (maxRuntime < 240 && item.runtimeMinutes > maxRuntime) return false;
      return true;
    });
  }, [
    catalog,
    query,
    genreFilter,
    languageFilter,
    countryFilter,
    yearFilter,
    directorFilter,
    contentTypeFilter,
    activeCollectionTab,
    sortBy,
    actorFilter,
    minRating,
    maxRuntime,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      recordSearchQuery(query.trim());
    }
  };

  const resetAllFilters = () => {
    setQuery('');
    setActiveCollectionTab('all');
    setActorFilter('');
    setDirectorFilter('all');
    setGenreFilter('all');
    setLanguageFilter('all');
    setCountryFilter('all');
    setYearFilter('all');
    setMinRating(0);
    setMaxRuntime(240);
    setContentTypeFilter('all');
    setSortBy('popularity');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Clean Search & Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Discover Movies & Series
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {catalog.length} verified records in local database • Offline-ready
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
                showAdvancedFilters
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin_catalog')}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Manage Database</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>

        {/* Featured & Genre Collection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {COLLECTION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCollectionTab(tab.id)}
              data-testid={`discover-collection-${tab.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCollectionTab === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Primary Search & Quick Selects */}
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-2.5"
        >
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, original title (e.g. 기생충, लक्ष्य), director, cast..."
              aria-label="Search catalog titles, cast, or keywords"
              data-testid="discover-search-input"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-2">
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              aria-label="Filter by content type"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="movie">Movies</option>
              <option value="series">Web Series</option>
              <option value="anime">Anime</option>
              <option value="documentary">Documentaries</option>
              <option value="short_film">Short Films</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              aria-label="Filter by genre"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Genres</option>
              {filterOptions.genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort discovery results"
              data-testid="discover-sort-select"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="popularity">Sort: Popular</option>
              <option value="rating">Sort: Community Rating</option>
              <option value="title_asc">Sort: Alphabetical (A–Z)</option>
              <option value="year_desc">Sort: Release Year (Newest)</option>
              <option value="year_asc">Sort: Release Year (Oldest)</option>
              <option value="recently_added">Sort: Recently Added</option>
            </select>
          </div>
        </form>

        {/* Instant Search Suggestions Bar */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Suggestions:</span>
            {suggestions.map((sug) => (
              <button
                key={sug.movieId}
                type="button"
                onClick={() => setSelectedCatalogModal(sug)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-amber-400 hover:border-amber-500/40 transition cursor-pointer"
              >
                {sug.title} ({sug.releaseYear})
              </button>
            ))}
          </div>
        )}

        {/* Secondary Filter Grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 ${
            showAdvancedFilters ? 'block' : 'hidden sm:grid'
          }`}
        >
          <select
            value={directorFilter}
            onChange={(e) => setDirectorFilter(e.target.value)}
            aria-label="Filter by director"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Directors</option>
            {filterOptions.directors.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="Filter by country"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Countries</option>
            {filterOptions.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            aria-label="Filter by language"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Languages</option>
            {filterOptions.languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filter by release year"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Years</option>
            {filterOptions.years.map((yr) => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>

          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            aria-label="Minimum rating"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value={0}>Any Rating</option>
            <option value={7}>7.0+ Rating</option>
            <option value={8}>8.0+ Rating</option>
            <option value={8.5}>8.5+ Rating</option>
          </select>

          <input
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Filter by actor..."
            aria-label="Filter by actor"
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {searchHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Recent Searches:</span>
            {searchHistory.map((sh) => (
              <button
                key={sh}
                type="button"
                onClick={() => setQuery(sh)}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-blue-500 hover:underline cursor-pointer"
              >
                {sh}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <div
          className="p-10 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3"
          data-testid="discover-no-results"
        >
          <Film className="w-7 h-7 text-slate-400 mx-auto" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            No matching titles in local database
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try clearing your active filters or add this title directly via the Movie Catalogue Admin.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin_catalog')}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Add in Catalogue Admin
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.map((item) => {
            const regionalInfo = item.streamingByRegion?.[preferences.region];
            const badge = getProviderBadge(item.metadataProvider);
            return (
              <div
                key={item.movieId}
                data-testid={`discover-card-${item.movieId}`}
                className="group rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition"
              >
                <div>
                  <div
                    onClick={() => setSelectedCatalogModal(item)}
                    className="cursor-pointer relative"
                  >
                    <PosterArtwork
                      src={item.posterUrl}
                      title={item.title}
                      year={item.releaseYear}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold backdrop-blur-md ${badge.badgeClass}`}
                      >
                        {badge.shortLabel}
                      </span>
                      {item.ageRating && (
                        <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-[10px] font-mono text-white">
                          {item.ageRating}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>
                        {item.releaseYear} · {item.runtimeMinutes}m
                      </span>
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.communityRating}
                      </span>
                    </div>
                    <h3
                      onClick={() => setSelectedCatalogModal(item)}
                      className="font-display text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-500"
                    >
                      {item.title}
                    </h3>
                    {item.originalTitle && item.originalTitle !== item.title && (
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.originalTitle}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.director} · {item.language}
                    </p>
                    <div className="pt-1 text-[11px] text-slate-500 truncate">
                      {regionalInfo?.state === 'available' &&
                      regionalInfo.providers.length > 0 ? (
                        <span className="text-emerald-400">
                          {regionalInfo.providers.map((p) => p.providerName).join(', ')}
                        </span>
                      ) : (
                        <span>
                          {item.productionInfo || `${item.country} • Local Archive`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addCatalogItemToLibrary(item, 'want_to_watch')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Watchlist
                  </button>
                  <button
                    type="button"
                    onClick={() => addCatalogItemToLibrary(item, 'watched')}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Watched
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Catalog Detail Modal */}
      {selectedCatalogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{selectedCatalogModal.contentType.toUpperCase()}</span>
                  <span>·</span>
                  <span>{selectedCatalogModal.releaseYear}</span>
                  <span>·</span>
                  <span>{selectedCatalogModal.runtimeMinutes}m</span>
                  {selectedCatalogModal.ageRating && (
                    <>
                      <span>·</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px]">
                        {selectedCatalogModal.ageRating}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedCatalogModal.title}
                </h3>
                {selectedCatalogModal.originalTitle &&
                  selectedCatalogModal.originalTitle !== selectedCatalogModal.title && (
                    <div className="text-xs text-amber-400 font-medium mt-0.5">
                      Original Title: {selectedCatalogModal.originalTitle}
                    </div>
                  )}
                <p className="text-xs text-slate-400 mt-1">
                  Directed by <span className="text-white">{selectedCatalogModal.director}</span>
                  {selectedCatalogModal.productionInfo
                    ? ` · ${selectedCatalogModal.productionInfo}`
                    : ''}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cast: {selectedCatalogModal.cast.join(', ') || 'Ensemble'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCatalogModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedCatalogModal.overview}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>
                Source: {getProviderBadge(selectedCatalogModal.metadataProvider).label}
                {selectedCatalogModal.wikidataId ? ` (${selectedCatalogModal.wikidataId})` : ''}
              </span>
              <span>
                {selectedCatalogModal.language} · {selectedCatalogModal.country}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  addCatalogItemToLibrary(selectedCatalogModal, 'want_to_watch');
                  setSelectedCatalogModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                + Watchlist
              </button>
              <button
                type="button"
                onClick={() => {
                  addCatalogItemToLibrary(selectedCatalogModal, 'watched');
                  setSelectedCatalogModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Mark Watched
              </button>
              {selectedCatalogModal.trailerYoutubeUrl && (
                <a
                  href={selectedCatalogModal.trailerYoutubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-blue-400 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Trailer</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
