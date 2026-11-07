import { CatalogItem, ContentType, EpisodeMetadata, MetadataProviderId } from '../types/nexus';
import { CURATED_CATALOG, hydrateCatalogItemArtwork, queryLocalCatalog } from './catalog';

export interface ProviderBadgeConfig {
  id: MetadataProviderId;
  label: string;
  shortLabel: string;
  attribution: string;
  badgeClass: string;
}

export const PROVIDER_BADGE_MAP: Record<MetadataProviderId, ProviderBadgeConfig> = {
  local_json: {
    id: 'local_json',
    label: 'Local JSON Database',
    shortLabel: 'Local JSON',
    attribution: 'CineShelf Local JSON Movie Database',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  wikidata: {
    id: 'wikidata',
    label: 'Wikidata Open Data',
    shortLabel: 'Wikidata',
    attribution: 'Structured data from Wikidata (CC0 Public Domain)',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  admin_catalogue: {
    id: 'admin_catalogue',
    label: 'Administrator Catalogue',
    shortLabel: 'Admin Catalogue',
    attribution: 'Managed via CineShelf Catalogue Admin',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  tvmaze: {
    id: 'tvmaze',
    label: 'TVmaze Open API',
    shortLabel: 'TVmaze',
    attribution: 'Data & artwork provided by TVmaze.com (CC BY-SA)',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  curated_catalog: {
    id: 'curated_catalog',
    label: 'CineShelf Local Archive',
    shortLabel: 'Local Archive',
    attribution: 'CineShelf Verified Local Archive',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  manual: {
    id: 'manual',
    label: 'Manual Library Entry',
    shortLabel: 'Manual',
    attribution: 'User-curated personal metadata',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
};

export function getProviderBadge(provider?: MetadataProviderId): ProviderBadgeConfig {
  if (provider && PROVIDER_BADGE_MAP[provider]) {
    return PROVIDER_BADGE_MAP[provider];
  }
  return PROVIDER_BADGE_MAP.local_json;
}

export function getMetadataProviderLabel(provider?: MetadataProviderId): string {
  return getProviderBadge(provider).shortLabel;
}

/**
 * Generates a safe Google Images search URL that opens in a new tab.
 * Never scrapes Google Images.
 */
export function buildGoogleImageSearchUrl(
  title: string,
  releaseYear?: number | string,
  contentType?: ContentType
): string {
  const cleanTitle = (title || '').trim();
  const cleanYear = releaseYear ? String(releaseYear).trim() : '';
  const suffix = contentType?.includes('series') ? 'series poster' : 'movie poster';
  const query = [cleanTitle, cleanYear, suffix].filter(Boolean).join(' ');
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}

export const buildGoogleImagesPosterSearchUrl = buildGoogleImageSearchUrl;

/**
 * Validates whether a user-pasted direct image URL is safe and syntactically valid.
 */
export function validateDirectImageUrl(rawUrl: string): { valid: boolean; url: string; reason?: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, url: '', reason: 'Please enter a valid image URL.' };
  }
  if (trimmed.startsWith('data:image/')) {
    return { valid: true, url: trimmed };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, url: '', reason: 'Image URL must use https:// or http:// protocol.' };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, url: '', reason: 'Malformed URL format.' };
  }
}

/**
 * Strips HTML tags returned in TVmaze summaries cleanly without DOM dependency.
 */
export function stripHtmlTags(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface TvMazeShowPayload {
  id: number;
  name: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  runtime?: number | null;
  averageRuntime?: number | null;
  premiered?: string | null;
  ended?: string | null;
  officialSite?: string | null;
  rating?: { average?: number | null };
  network?: { name?: string; country?: { name?: string; code?: string } } | null;
  webChannel?: { name?: string; country?: { name?: string; code?: string } } | null;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
  _embedded?: {
    cast?: Array<{ person?: { name?: string }; character?: { name?: string } }>;
    episodes?: Array<{
      id?: number;
      season?: number;
      number?: number;
      name?: string;
      airdate?: string;
      runtime?: number | null;
    }>;
    seasons?: Array<{ id?: number; number?: number; episodeOrder?: number | null }>;
  };
}

/**
 * Normalizes a TVmaze show payload (with optional embedded cast/episodes/seasons)
 * into a unified CineShelf CatalogItem.
 */
export function normalizeTvMazeShowToCatalogItem(
  rawShow: TvMazeShowPayload | Record<string, any>
): CatalogItem {
  const show = rawShow as TvMazeShowPayload;
  const releaseYear = show.premiered ? Number(show.premiered.slice(0, 4)) || new Date().getFullYear() : new Date().getFullYear();
  const genres = Array.isArray(show.genres) && show.genres.length > 0 ? show.genres : ['Drama'];
  const isAnime = show.type?.toLowerCase() === 'animation' && (show.language?.toLowerCase() === 'japanese' || genres.includes('Anime'));
  const contentType: ContentType = isAnime
    ? 'anime'
    : show.type?.toLowerCase() === 'animation'
      ? 'animated_series'
      : show.type?.toLowerCase() === 'documentary'
        ? 'documentary'
        : 'series';

  const runtimeMinutes = Number(show.averageRuntime || show.runtime || 45);
  const country =
    show.network?.country?.name ||
    show.webChannel?.country?.name ||
    'International';
  const networkName = show.network?.name || show.webChannel?.name || 'Television Network';

  const cast = (show._embedded?.cast || [])
    .map((c) => c.person?.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 8);

  const rawEpisodes = show._embedded?.episodes || [];
  const episodes: EpisodeMetadata[] = rawEpisodes
    .filter((ep) => typeof ep.season === 'number' && typeof ep.number === 'number')
    .map((ep) => ({
      code: `S${ep.season}E${ep.number}`,
      seasonNumber: Number(ep.season),
      episodeNumber: Number(ep.number),
      title: ep.name || `Episode ${ep.number}`,
      releaseDate: ep.airdate || `${releaseYear}-01-01`,
      runtimeMinutes: Number(ep.runtime || runtimeMinutes),
    }));

  const seasonNumbers = new Set(episodes.map((e) => e.seasonNumber));
  const totalSeasons =
    show._embedded?.seasons?.length ||
    (seasonNumbers.size > 0 ? seasonNumbers.size : 1);
  const totalEpisodes = episodes.length > 0 ? episodes.length : totalSeasons * 8;

  const posterUrl = show.image?.original || show.image?.medium || '';
  const backdropUrl = show.image?.original || show.image?.medium || '';
  const summary = stripHtmlTags(show.summary) || `${show.name} (${releaseYear}) broadcast on ${networkName}.`;

  return hydrateCatalogItemArtwork({
    movieId: `tvmaze-${show.id}`,
    metadataProvider: 'tvmaze',
    providerExternalId: String(show.id),
    providerAttribution: 'Data & artwork provided by TVmaze.com (CC BY-SA)',
    title: show.name,
    originalTitle: show.name,
    contentType,
    releaseYear,
    language: show.language || 'English',
    country,
    director: networkName,
    productionInfo: networkName,
    ageRating: 'TV-14',
    cast,
    genres,
    tags: ['tvmaze', show.status?.toLowerCase() || 'series', networkName.toLowerCase().replace(/\s+/g, '-')],
    categories: ['acclaimed_series'],
    runtimeMinutes,
    communityRating: Number(show.rating?.average || 7.8),
    popularityScore: Math.round(Number(show.rating?.average || 7.5) * 10),
    overview: summary,
    posterUrl,
    backdropUrl,
    totalSeasons,
    totalEpisodes,
    showStatus: show.status?.toLowerCase() === 'ended' ? 'completed' : 'ongoing',
    episodes: episodes.length > 0 ? episodes : undefined,
    addedAt: new Date().toISOString(),
    streamingByRegion: {},
  });
}

export const mapTvMazeShowToCatalogItem = normalizeTvMazeShowToCatalogItem;

export async function fetchTvMazeShowDetailsClient(
  showId: string | number
): Promise<CatalogItem | null> {
  try {
    const resp = await fetch(
      `https://api.tvmaze.com/shows/${encodeURIComponent(String(showId))}?embed[]=episodes&embed[]=cast&embed[]=seasons`
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as TvMazeShowPayload;
    return normalizeTvMazeShowToCatalogItem(data);
  } catch {
    return null;
  }
}

export async function searchMultiSourceMetadata(
  queryStr: string,
  providerOrCatalog?: string | CatalogItem[],
  catalogOverride: CatalogItem[] = CURATED_CATALOG
): Promise<{ results: CatalogItem[]; providersUsed: MetadataProviderId[]; errorNotice?: string }> {
  const effectiveCatalog = Array.isArray(providerOrCatalog) ? providerOrCatalog : catalogOverride;
  const providerFilter = typeof providerOrCatalog === 'string' ? providerOrCatalog : 'auto';
  const localMatches =
    providerFilter === 'tvmaze' ? [] : queryLocalCatalog(effectiveCatalog, { q: queryStr });
  const results: CatalogItem[] = [...localMatches];
  const providersUsed = new Set<MetadataProviderId>(
    providerFilter === 'tvmaze' ? [] : ['local_json']
  );
  let errorNotice: string | undefined;

  if (
    queryStr.trim().length >= 2 &&
    (providerFilter === 'auto' || providerFilter === 'all' || providerFilter === 'tvmaze')
  ) {
    try {
      const resp = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(queryStr.trim())}`
      );
      if (resp.ok) {
        const rows = (await resp.json()) as Array<{ show?: TvMazeShowPayload }>;
        providersUsed.add('tvmaze');
        for (const r of rows.slice(0, 6)) {
          if (r.show && r.show.name) {
            const norm = normalizeTvMazeShowToCatalogItem(r.show);
            if (!results.some((ex) => ex.title.toLowerCase() === norm.title.toLowerCase())) {
              results.push(norm);
            }
          }
        }
      }
    } catch {
      errorNotice = 'External TVmaze lookup offline; displaying local database results.';
    }
  }

  return {
    results,
    providersUsed: Array.from(providersUsed),
    errorNotice,
  };
}

// ============================================================================
// WIKIDATA & LOCAL CATALOGUE OFFLINE IMPORT / EXPORT / DUPLICATE VALIDATION
// ============================================================================

export interface CatalogueImportPreviewItem {
  item: CatalogItem;
  status: 'new' | 'duplicate_merge' | 'invalid';
  matchedExistingId?: string;
  preservedManualFields?: string[];
  validationWarnings: string[];
}

export interface CatalogueImportReport {
  isValid: boolean;
  formatDetected: 'wikidata_json' | 'cineshelf_json' | 'csv';
  validItems: CatalogItem[];
  parsedItems: CatalogItem[];
  previewItems: CatalogueImportPreviewItem[];
  newCount: number;
  newItemsCount: number;
  duplicateCount: number;
  duplicatesCount: number;
  invalidCount: number;
  errors: string[];
}

function splitListField(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(/[;|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function extractWikidataQId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const match = raw.match(/(Q\d+)/i);
  return match ? match[1].toUpperCase() : undefined;
}

function extractBindingValue(field: unknown): string {
  if (!field) return '';
  if (typeof field === 'string' || typeof field === 'number') return String(field).trim();
  if (typeof field === 'object' && field !== null && 'value' in field) {
    return String((field as { value: unknown }).value || '').trim();
  }
  return '';
}

/**
 * Merges an incoming imported record into an existing CatalogItem while preserving
 * any manually edited fields on the existing item.
 */
export function mergeCatalogItemPreservingEdits(
  existing: CatalogItem,
  incoming: CatalogItem
): { merged: CatalogItem; preservedFields: string[] } {
  const preservedFields: string[] = [];

  if (existing.isManuallyEdited) {
    preservedFields.push('title', 'overview', 'director', 'posterUrl', 'backdropUrl');
    return {
      merged: {
        ...incoming,
        ...existing,
        movieId: existing.movieId,
        wikidataId: existing.wikidataId || incoming.wikidataId,
        originalTitle: existing.originalTitle || incoming.originalTitle,
        productionInfo: existing.productionInfo || incoming.productionInfo,
        ageRating: existing.ageRating || incoming.ageRating,
        cast: existing.cast.length > 0 ? existing.cast : incoming.cast,
        genres: existing.genres.length > 0 ? existing.genres : incoming.genres,
        tags: Array.from(new Set([...existing.tags, ...incoming.tags])),
        categories: Array.from(new Set([...(existing.categories || []), ...(incoming.categories || [])])),
        isManuallyEdited: true,
      },
      preservedFields,
    };
  }

  // Even if not flagged isManuallyEdited, preserve custom uploaded posters/backdrops
  const keepExistingPoster =
    existing.posterUrl &&
    !existing.posterUrl.startsWith('data:image/svg+xml') &&
    (!incoming.posterUrl || incoming.posterUrl.startsWith('data:image/svg+xml'));
  if (keepExistingPoster) preservedFields.push('posterUrl');

  const keepExistingBackdrop =
    existing.backdropUrl &&
    !existing.backdropUrl.startsWith('data:image/svg+xml') &&
    (!incoming.backdropUrl || incoming.backdropUrl.startsWith('data:image/svg+xml'));
  if (keepExistingBackdrop) preservedFields.push('backdropUrl');

  return {
    merged: hydrateCatalogItemArtwork({
      ...existing,
      ...incoming,
      movieId: existing.movieId,
      wikidataId: incoming.wikidataId || existing.wikidataId,
      posterUrl: keepExistingPoster ? existing.posterUrl : incoming.posterUrl || existing.posterUrl,
      backdropUrl: keepExistingBackdrop ? existing.backdropUrl : incoming.backdropUrl || existing.backdropUrl,
      tags: Array.from(new Set([...existing.tags, ...incoming.tags])),
      categories: Array.from(new Set([...(existing.categories || []), ...(incoming.categories || [])])),
    }),
    preservedFields,
  };
}

function mapRawRecordToCandidate(
  raw: Record<string, unknown>,
  index: number,
  defaultSource: MetadataProviderId
): { item: CatalogItem; warnings: string[]; isValid: boolean } {
  const warnings: string[] = [];

  // Support both standard CineShelf fields and Wikidata SPARQL / JSON fields
  const rawTitle =
    extractBindingValue(raw.title) ||
    extractBindingValue(raw.itemLabel) ||
    extractBindingValue(raw.label) ||
    extractBindingValue(raw.name);

  if (!rawTitle) {
    warnings.push(`Row ${index + 1}: Missing movie title.`);
  }

  const wikidataId =
    extractWikidataQId(extractBindingValue(raw.wikidataId)) ||
    extractWikidataQId(extractBindingValue(raw.item)) ||
    extractWikidataQId(extractBindingValue(raw.id));

  const rawYearStr =
    extractBindingValue(raw.releaseYear) ||
    extractBindingValue(raw.year) ||
    extractBindingValue(raw.publicationDate) ||
    extractBindingValue(raw.releaseDate);
  const parsedYear = rawYearStr ? Number(String(rawYearStr).slice(0, 4)) : NaN;
  const releaseYear = !Number.isNaN(parsedYear) && parsedYear >= 1888 && parsedYear <= 2035 ? parsedYear : 2024;
  if (Number.isNaN(parsedYear)) {
    warnings.push(`"${rawTitle || `Row ${index + 1}`}": Missing or invalid releaseYear, defaulted to 2024.`);
  }

  const director =
    extractBindingValue(raw.director) ||
    extractBindingValue(raw.directorLabel) ||
    'Unknown Director';
  if (director === 'Unknown Director') {
    warnings.push(`"${rawTitle || `Row ${index + 1}`}": Director not specified.`);
  }

  const originalTitle =
    extractBindingValue(raw.originalTitle) ||
    extractBindingValue(raw.nativeLabel) ||
    rawTitle;

  const language =
    extractBindingValue(raw.language) ||
    extractBindingValue(raw.originalLanguageLabel) ||
    'English';

  const country =
    extractBindingValue(raw.country) ||
    extractBindingValue(raw.countryOfOriginLabel) ||
    'International';

  const runtimeRaw =
    extractBindingValue(raw.runtimeMinutes) ||
    extractBindingValue(raw.duration) ||
    extractBindingValue(raw.runtime);
  const runtimeMinutes = Number(runtimeRaw) > 0 ? Math.round(Number(runtimeRaw)) : 120;

  const productionInfo =
    extractBindingValue(raw.productionInfo) ||
    extractBindingValue(raw.productionCompanyLabel) ||
    'Independent Production';

  const ageRating =
    extractBindingValue(raw.ageRating) ||
    extractBindingValue(raw.certification) ||
    'NR';

  const overview =
    extractBindingValue(raw.overview) ||
    extractBindingValue(raw.synopsis) ||
    extractBindingValue(raw.description) ||
    `${rawTitle || 'Untitled'} (${releaseYear}) directed by ${director}.`;

  const genres = splitListField(raw.genres || raw.genre || raw.genreLabel);
  const cast = splitListField(raw.cast || raw.castMemberLabel || raw.actors);
  const tags = splitListField(raw.tags);
  const categories = splitListField(raw.categories || raw.category);

  const isWikidataRecord = Boolean(wikidataId || raw.itemLabel || raw.directorLabel || raw.metadataProvider === 'wikidata');
  const metadataProvider: MetadataProviderId =
    (raw.metadataProvider as MetadataProviderId) || (isWikidataRecord ? 'wikidata' : defaultSource);

  const movieId =
    extractBindingValue(raw.movieId) ||
    (wikidataId ? `wikidata-${wikidataId.toLowerCase()}` : `local-${(rawTitle || 'movie').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${releaseYear}`);

  const item = hydrateCatalogItemArtwork({
    movieId,
    wikidataId,
    metadataProvider,
    providerExternalId: wikidataId || movieId,
    providerAttribution:
      metadataProvider === 'wikidata'
        ? `Wikidata Entity ${wikidataId || ''} • CC0 Public Domain`.trim()
        : 'CineShelf Local JSON Movie Database',
    title: rawTitle || 'Untitled Movie',
    originalTitle,
    contentType: (extractBindingValue(raw.contentType) as ContentType) || 'movie',
    releaseYear,
    language,
    country,
    director,
    productionInfo,
    ageRating,
    cast,
    genres: genres.length > 0 ? genres : ['Drama'],
    tags: tags.length > 0 ? tags : isWikidataRecord ? ['wikidata-import'] : ['local-catalogue'],
    categories: categories.length > 0 ? categories : ['featured'],
    runtimeMinutes,
    communityRating: Number(extractBindingValue(raw.communityRating)) || 7.9,
    popularityScore: Number(extractBindingValue(raw.popularityScore)) || 84,
    overview,
    posterUrl: extractBindingValue(raw.posterUrl),
    backdropUrl: extractBindingValue(raw.backdropUrl),
    trailerYoutubeUrl: extractBindingValue(raw.trailerYoutubeUrl) || undefined,
    addedAt: extractBindingValue(raw.addedAt) || new Date().toISOString(),
    streamingByRegion: (raw.streamingByRegion as CatalogItem['streamingByRegion']) || {},
  });

  return {
    item,
    warnings,
    isValid: Boolean(rawTitle && rawTitle.trim().length > 0),
  };
}

function parseCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    return record;
  });
}

export function parseAndValidateCatalogueImport(
  rawText: string,
  existingCatalog: CatalogItem[],
  _formatHint?: 'json' | 'csv' | 'wikidata'
): CatalogueImportReport {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      formatDetected: 'cineshelf_json',
      validItems: [],
      parsedItems: [],
      previewItems: [],
      newCount: 0,
      newItemsCount: 0,
      duplicateCount: 0,
      duplicatesCount: 0,
      invalidCount: 0,
      errors: ['Input is empty. Paste valid JSON or CSV movie data.'],
    };
  }

  let rawRecords: Record<string, unknown>[] = [];
  let formatDetected: CatalogueImportReport['formatDetected'] = 'cineshelf_json';

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawRecords = parsed;
        const looksLikeWikidata = rawRecords.some((r) => r && typeof r === 'object' && ('itemLabel' in r || 'wikidataId' in r || 'item' in r));
        formatDetected = looksLikeWikidata ? 'wikidata_json' : 'cineshelf_json';
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.results && Array.isArray(parsed.results.bindings)) {
          rawRecords = parsed.results.bindings;
          formatDetected = 'wikidata_json';
        } else if (Array.isArray(parsed.movies)) {
          rawRecords = parsed.movies;
          formatDetected = 'cineshelf_json';
        } else if (Array.isArray(parsed.items)) {
          rawRecords = parsed.items;
          formatDetected = 'wikidata_json';
        } else {
          rawRecords = [parsed];
        }
      }
    } catch (err) {
      return {
        isValid: false,
        formatDetected: 'cineshelf_json',
        validItems: [],
        parsedItems: [],
        previewItems: [],
        newCount: 0,
        newItemsCount: 0,
        duplicateCount: 0,
        duplicatesCount: 0,
        invalidCount: 0,
        errors: [`Invalid JSON syntax: ${err instanceof Error ? err.message : 'Unable to parse JSON'}`],
      };
    }
  } else {
    formatDetected = 'csv';
    rawRecords = parseCsvRows(trimmed);
    if (rawRecords.length === 0) {
      return {
        isValid: false,
        formatDetected: 'csv',
        validItems: [],
        parsedItems: [],
        previewItems: [],
        newCount: 0,
        newItemsCount: 0,
        duplicateCount: 0,
        duplicatesCount: 0,
        invalidCount: 0,
        errors: ['CSV must include a header row and at least one movie row.'],
      };
    }
  }

  const previewItems: CatalogueImportPreviewItem[] = [];
  const validItems: CatalogItem[] = [];
  let newCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  rawRecords.forEach((raw, idx) => {
    const defaultProvider: MetadataProviderId = formatDetected === 'wikidata_json' ? 'wikidata' : 'local_json';
    const { item, warnings, isValid } = mapRawRecordToCandidate(raw, idx, defaultProvider);

    if (!isValid) {
      invalidCount++;
      previewItems.push({
        item,
        status: 'invalid',
        validationWarnings: warnings,
      });
      return;
    }

    // Check duplicates by movieId, wikidataId, or normalized title + releaseYear
    const existingMatch = existingCatalog.find(
      (ex) =>
        ex.movieId === item.movieId ||
        (ex.wikidataId && item.wikidataId && ex.wikidataId.toUpperCase() === item.wikidataId.toUpperCase()) ||
        (ex.title.toLowerCase() === item.title.toLowerCase() && ex.releaseYear === item.releaseYear)
    );

    if (existingMatch) {
      duplicateCount++;
      const { merged, preservedFields } = mergeCatalogItemPreservingEdits(existingMatch, item);
      validItems.push(merged);
      previewItems.push({
        item: merged,
        status: 'duplicate_merge',
        matchedExistingId: existingMatch.movieId,
        preservedManualFields: preservedFields,
        validationWarnings: warnings,
      });
    } else {
      newCount++;
      validItems.push(item);
      previewItems.push({
        item,
        status: 'new',
        validationWarnings: warnings,
      });
    }
  });

  return {
    isValid: validItems.length > 0,
    formatDetected,
    validItems,
    parsedItems: validItems,
    previewItems,
    newCount,
    newItemsCount: newCount,
    duplicateCount,
    duplicatesCount: duplicateCount,
    invalidCount,
    errors: [],
  };
}

export function exportCatalogueToJson(catalog: CatalogItem[]): string {
  return JSON.stringify(catalog, null, 2);
}

export function exportCatalogueToCsv(catalog: CatalogItem[]): string {
  const headers = [
    'movieId',
    'wikidataId',
    'title',
    'originalTitle',
    'contentType',
    'releaseYear',
    'language',
    'country',
    'director',
    'productionInfo',
    'ageRating',
    'runtimeMinutes',
    'communityRating',
    'genres',
    'cast',
    'tags',
    'categories',
    'metadataProvider',
    'overview',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === undefined || val === null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = catalog.map((item) =>
    [
      item.movieId,
      item.wikidataId || '',
      item.title,
      item.originalTitle || item.title,
      item.contentType,
      item.releaseYear,
      item.language,
      item.country,
      item.director,
      item.productionInfo || '',
      item.ageRating || '',
      item.runtimeMinutes,
      item.communityRating,
      item.genres.join('; '),
      item.cast.join('; '),
      item.tags.join('; '),
      (item.categories || []).join('; '),
      item.metadataProvider || 'local_json',
      item.overview,
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export const SAMPLE_WIKIDATA_IMPORT_JSON = JSON.stringify(
  {
    results: {
      bindings: [
        {
          item: { value: 'http://www.wikidata.org/entity/Q237811' },
          itemLabel: { value: '3 Idiots' },
          originalTitle: { value: '3 इडियट्स' },
          publicationDate: { value: '2009-12-25T00:00:00Z' },
          directorLabel: { value: 'Rajkumar Hirani' },
          castMemberLabel: { value: 'Aamir Khan; R. Madhavan; Sharman Joshi; Kareena Kapoor; Boman Irani' },
          genreLabel: { value: 'Drama; Comedy' },
          originalLanguageLabel: { value: 'Hindi' },
          countryOfOriginLabel: { value: 'India' },
          duration: { value: '170' },
          productionCompanyLabel: { value: 'Vinod Chopra Films' },
          ageRating: { value: 'UA' },
          description: {
            value: 'Two friends embark on a quest for a lost companion, recalling their college days and the friend who inspired them to think differently.',
          },
        },
        {
          item: { value: 'http://www.wikidata.org/entity/Q157394' },
          itemLabel: { value: 'Spirited Away' },
          originalTitle: { value: '千と千尋の神隠し' },
          publicationDate: { value: '2001-07-20T00:00:00Z' },
          directorLabel: { value: 'Hayao Miyazaki' },
          castMemberLabel: { value: 'Rumi Hiiragi; Miyu Irino; Mari Natsuki' },
          genreLabel: { value: 'Fantasy; Adventure; Animation' },
          originalLanguageLabel: { value: 'Japanese' },
          countryOfOriginLabel: { value: 'Japan' },
          duration: { value: '125' },
          productionCompanyLabel: { value: 'Studio Ghibli' },
          ageRating: { value: 'PG' },
          description: {
            value: 'During her family’s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
          },
        },
      ],
    },
  },
  null,
  2
);
