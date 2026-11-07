import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  Edit3,
  FileJson,
  FileSpreadsheet,
  Film,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { CatalogItem, ContentType, MetadataProviderId } from '../types/nexus';
import { getCatalogFilterOptions, queryLocalCatalog } from '../utils/catalog';
import {
  exportCatalogueToCsv,
  exportCatalogueToJson,
  getProviderBadge,
  parseAndValidateCatalogueImport,
  SAMPLE_WIKIDATA_IMPORT_JSON,
  validateDirectImageUrl,
} from '../utils/metadataProviders';
import { uploadPrivateUserImage } from '../services/firebase';
import { PosterArtwork } from './PosterArtwork';

interface MovieFormState {
  movieId: string;
  wikidataId: string;
  title: string;
  originalTitle: string;
  contentType: ContentType;
  releaseYear: number;
  language: string;
  country: string;
  director: string;
  productionInfo: string;
  ageRating: string;
  runtimeMinutes: number;
  communityRating: number;
  genresText: string;
  castText: string;
  tagsText: string;
  categoriesText: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeUrl: string;
  metadataProvider: MetadataProviderId;
}

function buildInitialForm(item?: CatalogItem | null): MovieFormState {
  if (!item) {
    return {
      movieId: '',
      wikidataId: '',
      title: '',
      originalTitle: '',
      contentType: 'movie',
      releaseYear: new Date().getFullYear(),
      language: 'English',
      country: 'India',
      director: '',
      productionInfo: '',
      ageRating: 'UA',
      runtimeMinutes: 135,
      communityRating: 8.0,
      genresText: 'Drama, Thriller',
      castText: '',
      tagsText: 'featured',
      categoriesText: 'featured',
      overview: '',
      posterUrl: '',
      backdropUrl: '',
      trailerYoutubeUrl: '',
      metadataProvider: 'admin_catalogue',
    };
  }

  return {
    movieId: item.movieId,
    wikidataId: item.wikidataId || '',
    title: item.title,
    originalTitle: item.originalTitle || item.title,
    contentType: item.contentType,
    releaseYear: item.releaseYear,
    language: item.language,
    country: item.country,
    director: item.director,
    productionInfo: item.productionInfo || '',
    ageRating: item.ageRating || 'UA',
    runtimeMinutes: item.runtimeMinutes,
    communityRating: item.communityRating,
    genresText: item.genres.join(', '),
    castText: item.cast.join(', '),
    tagsText: item.tags.join(', '),
    categoriesText: (item.categories || []).join(', '),
    overview: item.overview,
    posterUrl: item.posterUrl.startsWith('data:image/svg+xml') ? '' : item.posterUrl,
    backdropUrl: item.backdropUrl.startsWith('data:image/svg+xml') ? '' : item.backdropUrl,
    trailerYoutubeUrl: item.trailerYoutubeUrl || '',
    metadataProvider: item.metadataProvider || 'admin_catalogue',
  };
}

export const MovieCatalogueAdminView: React.FC = () => {
  const {
    account,
    catalog,
    upsertCatalogMovie,
    deleteCatalogMovie,
    importCatalogMovies,
    resetCatalogToDefaults,
    addCatalogItemToLibrary,
    addToast,
  } = useNexus();

  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recently_added' | 'title_asc' | 'year_desc' | 'rating'>('recently_added');

  // Add / Edit modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<MovieFormState>(() => buildInitialForm(null));
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingBackdrop, setIsUploadingBackdrop] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');

  const posterFileRef = useRef<HTMLInputElement | null>(null);
  const backdropFileRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const filterOptions = useMemo(() => getCatalogFilterOptions(catalog), [catalog]);

  const filteredCatalog = useMemo(
    () =>
      queryLocalCatalog(catalog, {
        q: searchQuery,
        genre: genreFilter,
        provider: providerFilter,
        contentType: contentTypeFilter,
        sortBy,
      }),
    [catalog, searchQuery, genreFilter, providerFilter, contentTypeFilter, sortBy]
  );

  const recentlyAddedMovies = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
        .slice(0, 4),
    [catalog]
  );

  const stats = useMemo(() => {
    const movies = catalog.filter((c) => c.contentType === 'movie' || c.contentType === 'short_film').length;
    const series = catalog.length - movies;
    const wikidataCount = catalog.filter((c) => c.metadataProvider === 'wikidata').length;
    const localJsonCount = catalog.filter((c) => c.metadataProvider === 'local_json' || c.metadataProvider === 'curated_catalog').length;
    const adminCount = catalog.filter((c) => c.metadataProvider === 'admin_catalogue').length;
    return { total: catalog.length, movies, series, wikidataCount, localJsonCount, adminCount };
  }, [catalog]);

  const importPreview = useMemo(() => {
    if (!importRawText.trim()) return null;
    return parseAndValidateCatalogueImport(importRawText, catalog);
  }, [importRawText, catalog]);

  const openAddModal = () => {
    setEditingMovie(null);
    setForm(buildInitialForm(null));
    setIsEditorOpen(true);
  };

  const openEditModal = (movie: CatalogItem) => {
    setEditingMovie(movie);
    setForm(buildInitialForm(movie));
    setIsEditorOpen(true);
  };

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'posterUrl' | 'backdropUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (target === 'posterUrl') setIsUploadingPoster(true);
    else setIsUploadingBackdrop(true);

    try {
      const uid = account?.uid || 'sandbox-user-a';
      const { url: uploadedUrl } = await uploadPrivateUserImage(
        uid,
        target === 'posterUrl' ? 'posters' : 'avatars',
        file
      );
      setForm((prev) => ({ ...prev, [target]: uploadedUrl }));
      addToast(`${target === 'posterUrl' ? 'Poster' : 'Backdrop'} image uploaded.`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      if (target === 'posterUrl') setIsUploadingPoster(false);
      else setIsUploadingBackdrop(false);
      e.target.value = '';
    }
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast('Movie title is required.', 'error');
      return;
    }

    if (form.posterUrl.trim()) {
      const check = validateDirectImageUrl(form.posterUrl);
      if (!check.valid) {
        addToast(`Poster URL: ${check.reason}`, 'error');
        return;
      }
    }

    if (form.backdropUrl.trim()) {
      const check = validateDirectImageUrl(form.backdropUrl);
      if (!check.valid) {
        addToast(`Backdrop URL: ${check.reason}`, 'error');
        return;
      }
    }

    const splitClean = (str: string) =>
      str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    await upsertCatalogMovie({
      movieId: editingMovie?.movieId || form.movieId.trim() || undefined,
      wikidataId: form.wikidataId.trim() || undefined,
      title: form.title.trim(),
      originalTitle: form.originalTitle.trim() || form.title.trim(),
      contentType: form.contentType,
      releaseYear: Number(form.releaseYear) || 2024,
      language: form.language.trim() || 'English',
      country: form.country.trim() || 'India',
      director: form.director.trim() || 'Unknown Director',
      productionInfo: form.productionInfo.trim() || 'Independent Production',
      ageRating: form.ageRating.trim() || 'NR',
      runtimeMinutes: Number(form.runtimeMinutes) || 120,
      communityRating: Math.min(10, Math.max(1, Number(form.communityRating) || 8.0)),
      genres: splitClean(form.genresText),
      cast: splitClean(form.castText),
      tags: splitClean(form.tagsText),
      categories: splitClean(form.categoriesText),
      overview: form.overview.trim() || `${form.title.trim()} (${form.releaseYear}).`,
      posterUrl: form.posterUrl.trim(),
      backdropUrl: form.backdropUrl.trim(),
      trailerYoutubeUrl: form.trailerYoutubeUrl.trim() || undefined,
      metadataProvider: form.metadataProvider,
    });

    setIsEditorOpen(false);
    setEditingMovie(null);
  };

  const handleDownloadExport = (format: 'json' | 'csv') => {
    const content = format === 'json' ? exportCatalogueToJson(catalog) : exportCatalogueToCsv(catalog);
    const mime = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cineshelf-local-movies.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Exported ${catalog.length} records as ${format.toUpperCase()}.`);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportRawText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validItems.length === 0) return;
    await importCatalogMovies(importPreview.validItems);
    setImportRawText('');
    setIsImportOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Database className="w-3.5 h-3.5" />
            Local-First Movie Database
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            Movie Catalogue Admin
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownloadExport('json')}
            data-testid="admin-export-json-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:text-white transition"
          >
            <FileJson className="w-3.5 h-3.5 text-amber-400" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => handleDownloadExport('csv')}
            data-testid="admin-export-csv-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:text-white transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            data-testid="admin-open-import-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON / CSV / Wikidata
          </button>
          <button
            type="button"
            onClick={openAddModal}
            data-testid="admin-add-movie-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Add Movie
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total Catalogue
          </div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums" data-testid="admin-total-count">
            {stats.total}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {stats.movies} Movies • {stats.series} Series
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Local JSON Records
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">
            {stats.localJsonCount}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">100% API-Independent</div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Wikidata Entities
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">
            {stats.wikidataCount}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">CC0 Public Domain</div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Admin Curated
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1 tabular-nums">
            {stats.adminCount}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Custom & Edited</div>
        </div>
      </div>

      {/* Recently Added Strip */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Recently Added Movies
          </h2>
          <button
            type="button"
            onClick={resetCatalogToDefaults}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Default Database
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentlyAddedMovies.map((item) => (
            <div
              key={item.movieId}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/70"
            >
              <PosterArtwork
                title={item.title}
                releaseYear={item.releaseYear}
                posterUrl={item.posterUrl}
                genres={item.genres}
                className="w-10 h-14 rounded object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {item.releaseYear} • {item.director}
                </div>
                <div className="text-[10px] text-amber-400/90 mt-0.5">
                  {getProviderBadge(item.metadataProvider).shortLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Edit movie"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, original title, director, cast, or Wikidata Q-ID..."
            data-testid="admin-search-input"
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Genres</option>
          {filterOptions.genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Data Sources</option>
          <option value="local_json">Local JSON Database</option>
          <option value="wikidata">Wikidata Open Data</option>
          <option value="admin_catalogue">Admin Catalogue</option>
          <option value="tvmaze">TVmaze Series</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="recently_added">Sort: Recently Added</option>
          <option value="title_asc">Sort: Alphabetical (A–Z)</option>
          <option value="year_desc">Sort: Newest Release</option>
          <option value="rating">Sort: Community Rating</option>
        </select>
      </div>

      {/* Catalogue Table */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4">Movie / Original Title</th>
                <th className="py-3 px-3">Year & Runtime</th>
                <th className="py-3 px-3">Director & Studio</th>
                <th className="py-3 px-3">Genres & Cert</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredCatalog.map((movie) => {
                const badge = getProviderBadge(movie.metadataProvider);
                return (
                  <tr
                    key={movie.movieId}
                    className="hover:bg-slate-800/30 transition"
                    data-testid={`admin-movie-row-${movie.movieId}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <PosterArtwork
                          title={movie.title}
                          releaseYear={movie.releaseYear}
                          posterUrl={movie.posterUrl}
                          genres={movie.genres}
                          className="w-10 h-14 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[220px]">
                            {movie.title}
                          </div>
                          {movie.originalTitle && movie.originalTitle !== movie.title && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {movie.originalTitle}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {movie.movieId}
                            {movie.wikidataId ? ` • ${movie.wikidataId}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      <div className="font-medium text-white">{movie.releaseYear}</div>
                      <div className="text-[11px] text-slate-400">
                        {movie.runtimeMinutes}m • {movie.language}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="font-medium text-slate-200 truncate max-w-[180px]">
                        {movie.director}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {movie.productionInfo || movie.country}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {movie.genres.slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                          >
                            {g}
                          </span>
                        ))}
                        {movie.ageRating && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                            {movie.ageRating}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${badge.badgeClass}`}
                      >
                        {badge.shortLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addCatalogItemToLibrary(movie, 'want_to_watch')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition"
                          title="Add to personal Watchlist"
                        >
                          + Library
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(movie)}
                          data-testid={`admin-edit-${movie.movieId}`}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Edit movie"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === movie.movieId ? (
                          <button
                            type="button"
                            onClick={() => {
                              deleteCatalogMovie(movie.movieId);
                              setConfirmDeleteId(null);
                            }}
                            data-testid={`admin-confirm-delete-${movie.movieId}`}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white transition"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(movie.movieId)}
                            data-testid={`admin-delete-${movie.movieId}`}
                            className="p-1.5 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                            title="Delete movie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCatalog.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No catalogue records match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Movie Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  {editingMovie ? `Edit Movie: ${editingMovie.title}` : 'Add Movie to Local Database'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Swades"
                    data-testid="admin-form-title"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Original Title
                  </label>
                  <input
                    type="text"
                    value={form.originalTitle}
                    onChange={(e) => setForm({ ...form, originalTitle: e.target.value })}
                    placeholder="e.g. स्वदेस"
                    data-testid="admin-form-original-title"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Release Year
                  </label>
                  <input
                    type="number"
                    value={form.releaseYear}
                    onChange={(e) => setForm({ ...form, releaseYear: Number(e.target.value) })}
                    data-testid="admin-form-year"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Content Type
                  </label>
                  <select
                    value={form.contentType}
                    onChange={(e) => setForm({ ...form, contentType: e.target.value as ContentType })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                    <option value="documentary">Documentary</option>
                    <option value="anime">Anime</option>
                    <option value="short_film">Short Film</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Runtime (Mins)
                  </label>
                  <input
                    type="number"
                    value={form.runtimeMinutes}
                    onChange={(e) => setForm({ ...form, runtimeMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Age Rating
                  </label>
                  <input
                    type="text"
                    value={form.ageRating}
                    onChange={(e) => setForm({ ...form, ageRating: e.target.value })}
                    placeholder="U / UA / PG-13 / R"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Director
                  </label>
                  <input
                    type="text"
                    value={form.director}
                    onChange={(e) => setForm({ ...form, director: e.target.value })}
                    placeholder="e.g. Ashutosh Gowariker"
                    data-testid="admin-form-director"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Production Studio
                  </label>
                  <input
                    type="text"
                    value={form.productionInfo}
                    onChange={(e) => setForm({ ...form, productionInfo: e.target.value })}
                    placeholder="e.g. Ashutosh Gowariker Productions"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Wikidata Q-ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.wikidataId}
                    onChange={(e) => setForm({ ...form, wikidataId: e.target.value })}
                    placeholder="e.g. Q1143210"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Data Source
                  </label>
                  <select
                    value={form.metadataProvider}
                    onChange={(e) =>
                      setForm({ ...form, metadataProvider: e.target.value as MetadataProviderId })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="admin_catalogue">Admin Catalogue</option>
                    <option value="local_json">Local JSON Database</option>
                    <option value="wikidata">Wikidata Open Data</option>
                    <option value="tvmaze">TVmaze Open API</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Genres (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.genresText}
                    onChange={(e) => setForm({ ...form, genresText: e.target.value })}
                    placeholder="Drama, Sci-Fi, Thriller"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Cast (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.castText}
                    onChange={(e) => setForm({ ...form, castText: e.target.value })}
                    placeholder="Lead Actor 1, Lead Actor 2"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.tagsText}
                    onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                    placeholder="patriotic, space, biopic"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Categories (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.categoriesText}
                    onChange={(e) => setForm({ ...form, categoriesText: e.target.value })}
                    placeholder="featured, indian_military, sci_fi_essentials, world_cinema"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Synopsis
                </label>
                <textarea
                  rows={2}
                  value={form.overview}
                  onChange={(e) => setForm({ ...form, overview: e.target.value })}
                  placeholder="Verified synopsis..."
                  data-testid="admin-form-overview"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              {/* Poster & Backdrop Upload / URL Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Poster Artwork
                    </span>
                    <input
                      ref={posterFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'posterUrl')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPoster}
                      onClick={() => posterFileRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-amber-300"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {isUploadingPoster ? 'Uploading...' : 'Upload Poster'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.posterUrl}
                    onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                    placeholder="Paste direct poster URL or leave blank for auto SVG..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Backdrop Artwork
                    </span>
                    <input
                      ref={backdropFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'backdropUrl')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingBackdrop}
                      onClick={() => backdropFileRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-sky-300"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {isUploadingBackdrop ? 'Uploading...' : 'Upload Backdrop'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.backdropUrl}
                    onChange={(e) => setForm({ ...form, backdropUrl: e.target.value })}
                    placeholder="Paste direct backdrop URL or leave blank for auto SVG..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="admin-save-movie-btn"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  {editingMovie ? 'Save Changes' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import JSON / CSV / Wikidata Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <h2 className="text-base font-bold text-white">
                  Import Movies (Wikidata JSON, Local JSON, or CSV)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  Supports Wikidata SPARQL JSON exports, CineShelf JSON arrays, and CSV spreadsheets.
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json,.csv,application/json,text/csv"
                    onChange={handleImportFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Choose JSON / CSV File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportRawText(SAMPLE_WIKIDATA_IMPORT_JSON)}
                    data-testid="admin-load-sample-wikidata-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Sample Wikidata JSON
                  </button>
                </div>
              </div>

              <textarea
                rows={7}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="Paste Wikidata JSON, CineShelf JSON, or CSV rows here..."
                data-testid="admin-import-textarea"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />

              {importPreview && (
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Preview ({importPreview.formatDetected.toUpperCase()})
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">
                        {importPreview.newCount} New
                      </span>
                      <span className="text-amber-400 font-semibold">
                        {importPreview.duplicateCount} Duplicate (Safe Merge)
                      </span>
                      {importPreview.invalidCount > 0 && (
                        <span className="text-rose-400 font-semibold">
                          {importPreview.invalidCount} Invalid
                        </span>
                      )}
                    </div>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      {importPreview.errors.join(' • ')}
                    </div>
                  )}

                  {importPreview.previewItems.length > 0 && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 border border-slate-800 rounded-lg">
                      {importPreview.previewItems.map((p, idx) => (
                        <div
                          key={`${p.item.movieId}-${idx}`}
                          className="p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {p.item.title}{' '}
                              {p.item.originalTitle && p.item.originalTitle !== p.item.title
                                ? `(${p.item.originalTitle})`
                                : ''}{' '}
                              • {p.item.releaseYear}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {p.item.director} • {p.item.genres.join(', ')}
                              {p.item.wikidataId ? ` • ${p.item.wikidataId}` : ''}
                            </div>
                            {p.validationWarnings.length > 0 && (
                              <div className="text-[10px] text-amber-300 mt-0.5">
                                {p.validationWarnings.join(' ')}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                              p.status === 'new'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : p.status === 'duplicate_merge'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {p.status === 'new'
                              ? 'New Record'
                              : p.status === 'duplicate_merge'
                                ? 'Merge Duplicate'
                                : 'Invalid'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!importPreview || importPreview.validItems.length === 0}
                  onClick={handleConfirmImport}
                  data-testid="admin-confirm-import-btn"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition"
                >
                  Import {importPreview?.validItems.length || 0} Verified Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
