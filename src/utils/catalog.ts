import { CatalogItem, FranchiseDefinition, RegionalAvailability } from '../types/nexus';
import rawLocalMovies from '../data/localMovies.json';

export function buildCinematicPosterSvg(
  title: string,
  subtitle: string,
  year: number | string,
  accentHex: string,
  secondaryHex: string
): string {
  const safeTitle = (title || 'Untitled').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSubtitle = (subtitle || 'CINESHELF NEXUS').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const words = safeTitle.split(' ');
  const line1 = words.slice(0, 3).join(' ');
  const line2 = words.slice(3, 6).join(' ');
  const line3 = words.slice(6).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070910"/>
        <stop offset="50%" stop-color="${secondaryHex}"/>
        <stop offset="100%" stop-color="#05060a"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="20%" r="60%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentHex}"/>
        <stop offset="100%" stop-color="${secondaryHex}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#glow)"/>
    <circle cx="460" cy="190" r="170" fill="none" stroke="${accentHex}" stroke-opacity="0.18" stroke-width="1.5"/>
    <circle cx="460" cy="190" r="240" fill="none" stroke="${accentHex}" stroke-opacity="0.1" stroke-width="1"/>
    <path d="M 48 64 L 552 64 L 552 836 L 48 836 Z" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>
    <rect x="78" y="96" width="84" height="28" rx="4" fill="${accentHex}" fill-opacity="0.2" stroke="${accentHex}" stroke-opacity="0.5"/>
    <text x="120" y="115" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="2">${year}</text>
    <text x="78" y="620" fill="${accentHex}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="3">${safeSubtitle.toUpperCase()}</text>
    <text x="78" y="675" fill="#ffffff" font-family="Georgia, serif" font-size="42" font-weight="700">${line1}</text>
    ${line2 ? `<text x="78" y="728" fill="#f1f5f9" font-family="Georgia, serif" font-size="40" font-weight="700">${line2}</text>` : ''}
    ${line3 ? `<text x="78" y="778" fill="#cbd5e1" font-family="Georgia, serif" font-size="34" font-weight="700">${line3}</text>` : ''}
    <rect x="78" y="802" width="140" height="4" fill="url(#accentBar)" rx="2"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildCinematicBackdropSvg(
  title: string,
  subtitle: string,
  year: number | string,
  accentHex: string,
  secondaryHex: string
): string {
  const safeTitle = (title || 'Untitled').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSubtitle = (subtitle || 'CINESHELF NEXUS').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#05070d"/>
        <stop offset="55%" stop-color="${secondaryHex}"/>
        <stop offset="100%" stop-color="#040508"/>
      </linearGradient>
      <radialGradient id="flare" cx="78%" cy="32%" r="55%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect width="1280" height="720" fill="url(#flare)"/>
    <circle cx="980" cy="240" r="220" fill="none" stroke="${accentHex}" stroke-opacity="0.16" stroke-width="1.5"/>
    <circle cx="980" cy="240" r="320" fill="none" stroke="${accentHex}" stroke-opacity="0.08" stroke-width="1"/>
    <text x="88" y="540" fill="${accentHex}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="4">${safeSubtitle.toUpperCase()} • ${year}</text>
    <text x="88" y="605" fill="#ffffff" font-family="Georgia, serif" font-size="56" font-weight="700">${safeTitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PALETTE_BY_GENRE: Record<string, [string, string]> = {
  War: ['#f59e0b', '#1c1917'],
  Action: ['#e11d48', '#1e1b4b'],
  'Sci-Fi': ['#38bdf8', '#0f172a'],
  Biography: ['#fbbf24', '#27272a'],
  Thriller: ['#10b981', '#064e3b'],
  Spy: ['#2dd4bf', '#134e4a'],
  History: ['#fb923c', '#292524'],
  Drama: ['#a855f7', '#1e1b4b'],
  Mystery: ['#6366f1', '#111827'],
};

export function getGenrePalette(genres: string[]): [string, string] {
  for (const g of genres || []) {
    if (PALETTE_BY_GENRE[g]) return PALETTE_BY_GENRE[g];
  }
  return ['#f59e0b', '#1e293b'];
}

export const DEFAULT_AVATAR_ASSET = buildCinematicPosterSvg(
  'CineShelf Member',
  'PERSONAL ARCHIVE',
  2026,
  '#f59e0b',
  '#0f172a'
);

function makeStreaming(
  inProviders: { id: string; name: string; type: 'subscription' | 'rent' | 'buy' | 'free'; url: string }[],
  usProviders: { id: string; name: string; type: 'subscription' | 'rent' | 'buy' | 'free'; url: string }[],
  gbProviders: { id: string; name: string; type: 'subscription' | 'rent' | 'buy' | 'free'; url: string }[] = usProviders
): Record<string, RegionalAvailability> {
  const now = '2026-03-01T00:00:00.000Z';
  return {
    IN: {
      region: 'IN',
      state: inProviders.length > 0 ? 'available' : 'unavailable',
      lastCheckedAt: now,
      providers: inProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url,
      })),
    },
    US: {
      region: 'US',
      state: usProviders.length > 0 ? 'available' : 'unavailable',
      lastCheckedAt: now,
      providers: usProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url,
      })),
    },
    GB: {
      region: 'GB',
      state: gbProviders.length > 0 ? 'available' : 'unavailable',
      lastCheckedAt: now,
      providers: gbProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url,
      })),
    },
  };
}

const STREAMING_BY_MOVIE_ID: Record<string, Record<string, RegionalAvailability>> = {
  'arch-uri-2019': makeStreaming(
    [{ id: 'zee5', name: 'ZEE5', type: 'subscription', url: 'https://www.zee5.com' }],
    [{ id: 'apple', name: 'Apple TV', type: 'rent', url: 'https://tv.apple.com' }]
  ),
  'arch-shershaah-2021': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }]
  ),
  'arch-pippa-2023': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }]
  ),
  'arch-sam-bahadur-2023': makeStreaming(
    [{ id: 'zee5', name: 'ZEE5', type: 'subscription', url: 'https://www.zee5.com' }],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'rent', url: 'https://www.primevideo.com' }]
  ),
  'arch-border-1997': makeStreaming(
    [
      { id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' },
      { id: 'youtube', name: 'YouTube Movies', type: 'free', url: 'https://www.youtube.com' },
    ],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'rent', url: 'https://www.primevideo.com' }]
  ),
  'arch-lakshya-2004': makeStreaming(
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }],
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }]
  ),
  'arch-major-2022': makeStreaming(
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }],
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }]
  ),
  'arch-raazi-2018': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }]
  ),
  'arch-parmanu-2018': makeStreaming(
    [
      { id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' },
      { id: 'zee5', name: 'ZEE5', type: 'subscription', url: 'https://www.zee5.com' },
    ],
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }]
  ),
  'arch-inception-2010': makeStreaming(
    [
      { id: 'jio', name: 'JioCinema', type: 'subscription', url: 'https://www.jiocinema.com' },
      { id: 'prime', name: 'Amazon Prime Video', type: 'rent', url: 'https://www.primevideo.com' },
    ],
    [
      { id: 'max', name: 'Max', type: 'subscription', url: 'https://www.max.com' },
      { id: 'apple', name: 'Apple TV', type: 'rent', url: 'https://tv.apple.com' },
    ]
  ),
  'arch-interstellar-2014': makeStreaming(
    [
      { id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' },
      { id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' },
    ],
    [
      { id: 'paramount', name: 'Paramount+', type: 'subscription', url: 'https://www.paramountplus.com' },
      { id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' },
    ]
  ),
  'arch-tenet-2020': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'rent', url: 'https://www.primevideo.com' }],
    [{ id: 'max', name: 'Max', type: 'subscription', url: 'https://www.max.com' }]
  ),
  'arch-oppenheimer-2023': makeStreaming(
    [{ id: 'jio', name: 'JioCinema', type: 'subscription', url: 'https://www.jiocinema.com' }],
    [{ id: 'peacock', name: 'Peacock', type: 'subscription', url: 'https://www.peacocktv.com' }]
  ),
  'arch-dune-2021': makeStreaming(
    [
      { id: 'jio', name: 'JioCinema', type: 'subscription', url: 'https://www.jiocinema.com' },
      { id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' },
    ],
    [{ id: 'max', name: 'Max', type: 'subscription', url: 'https://www.max.com' }]
  ),
  'arch-dune-part-two-2024': makeStreaming(
    [{ id: 'jio', name: 'JioCinema', type: 'subscription', url: 'https://www.jiocinema.com' }],
    [{ id: 'max', name: 'Max', type: 'subscription', url: 'https://www.max.com' }]
  ),
  'arch-dune-messiah-2026': makeStreaming([], []),
  'arch-blade-runner-2049': makeStreaming(
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }],
    [{ id: 'apple', name: 'Apple TV', type: 'rent', url: 'https://tv.apple.com' }]
  ),
  'arch-arrival-2016': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }],
    [{ id: 'paramount', name: 'Paramount+', type: 'subscription', url: 'https://www.paramountplus.com' }]
  ),
  'arch-family-man-2019': makeStreaming(
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }],
    [{ id: 'prime', name: 'Amazon Prime Video', type: 'subscription', url: 'https://www.primevideo.com' }]
  ),
  'arch-severance-2022': makeStreaming(
    [{ id: 'apple', name: 'Apple TV+', type: 'subscription', url: 'https://tv.apple.com' }],
    [{ id: 'apple', name: 'Apple TV+', type: 'subscription', url: 'https://tv.apple.com' }]
  ),
  'arch-dark-2017': makeStreaming(
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }],
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }]
  ),
  'arch-parasite-2019': makeStreaming(
    [{ id: 'sonyliv', name: 'SonyLIV', type: 'subscription', url: 'https://www.sonyliv.com' }],
    [{ id: 'max', name: 'Max', type: 'subscription', url: 'https://www.max.com' }]
  ),
  'arch-rrr-2022': makeStreaming(
    [
      { id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' },
      { id: 'zee5', name: 'ZEE5', type: 'subscription', url: 'https://www.zee5.com' },
    ],
    [{ id: 'netflix', name: 'Netflix', type: 'subscription', url: 'https://www.netflix.com' }]
  ),
  'arch-chrono-nexus-2024': makeStreaming(
    [{ id: 'mubi', name: 'MUBI', type: 'subscription', url: 'https://mubi.com' }],
    [{ id: 'mubi', name: 'MUBI', type: 'subscription', url: 'https://mubi.com' }]
  ),
};

const EPISODES_BY_MOVIE_ID: Record<string, CatalogItem['episodes']> = {
  'arch-family-man-2019': [
    { code: 'S1E1', seasonNumber: 1, episodeNumber: 1, title: 'The Family Man', releaseDate: '2019-09-20', runtimeMinutes: 53 },
    { code: 'S1E2', seasonNumber: 1, episodeNumber: 2, title: 'Sleepers', releaseDate: '2019-09-20', runtimeMinutes: 47 },
    { code: 'S1E3', seasonNumber: 1, episodeNumber: 3, title: 'Anti-National', releaseDate: '2019-09-20', runtimeMinutes: 46 },
    { code: 'S1E4', seasonNumber: 1, episodeNumber: 4, title: 'Patriots', releaseDate: '2019-09-20', runtimeMinutes: 42 },
    { code: 'S2E1', seasonNumber: 2, episodeNumber: 1, title: 'Exile', releaseDate: '2021-06-04', runtimeMinutes: 59 },
    { code: 'S2E2', seasonNumber: 2, episodeNumber: 2, title: 'Weapon', releaseDate: '2021-06-04', runtimeMinutes: 50 },
  ],
  'arch-severance-2022': [
    { code: 'S1E1', seasonNumber: 1, episodeNumber: 1, title: 'Good News About Hell', releaseDate: '2022-02-18', runtimeMinutes: 57 },
    { code: 'S1E2', seasonNumber: 1, episodeNumber: 2, title: 'Half Loop', releaseDate: '2022-02-18', runtimeMinutes: 47 },
    { code: 'S1E3', seasonNumber: 1, episodeNumber: 3, title: 'In Perpetuity', releaseDate: '2022-02-25', runtimeMinutes: 52 },
    { code: 'S2E1', seasonNumber: 2, episodeNumber: 1, title: 'Hello, Ms. Cobel', releaseDate: '2025-01-17', runtimeMinutes: 54 },
  ],
  'arch-dark-2017': [
    { code: 'S1E1', seasonNumber: 1, episodeNumber: 1, title: 'Secrets', releaseDate: '2017-12-01', runtimeMinutes: 52 },
    { code: 'S1E2', seasonNumber: 1, episodeNumber: 2, title: 'Lies', releaseDate: '2017-12-01', runtimeMinutes: 45 },
    { code: 'S1E3', seasonNumber: 1, episodeNumber: 3, title: 'Past and Present', releaseDate: '2017-12-01', runtimeMinutes: 46 },
  ],
};

export function hydrateCatalogItemArtwork(item: Partial<CatalogItem> & { title: string; movieId: string }): CatalogItem {
  const genres = Array.isArray(item.genres) && item.genres.length > 0 ? item.genres : ['Drama'];
  const [accentHex, secondaryHex] = getGenrePalette(genres);
  const subtitle = `${genres.slice(0, 2).join(' • ').toUpperCase()}${item.director ? ` • ${item.director}` : ''}`;
  const releaseYear = Number(item.releaseYear) || 2024;

  const posterUrl =
    item.posterUrl && item.posterUrl.trim().length > 0
      ? item.posterUrl.trim()
      : buildCinematicPosterSvg(item.title, subtitle, releaseYear, accentHex, secondaryHex);

  const backdropUrl =
    item.backdropUrl && item.backdropUrl.trim().length > 0
      ? item.backdropUrl.trim()
      : buildCinematicBackdropSvg(item.title, subtitle, releaseYear, accentHex, secondaryHex);

  return {
    movieId: item.movieId,
    wikidataId: item.wikidataId,
    metadataProvider: item.metadataProvider || 'local_json',
    providerExternalId: item.providerExternalId || item.wikidataId || item.movieId,
    providerAttribution: item.providerAttribution || 'CineShelf Local JSON Movie Database',
    title: item.title,
    originalTitle: item.originalTitle || item.title,
    contentType: item.contentType || 'movie',
    releaseYear,
    language: item.language || 'English',
    country: item.country || 'International',
    director: item.director || 'Unknown Director',
    productionInfo: item.productionInfo || 'Independent Production',
    ageRating: item.ageRating || 'NR',
    cast: Array.isArray(item.cast) ? item.cast : [],
    genres,
    tags: Array.isArray(item.tags) ? item.tags : [],
    categories: Array.isArray(item.categories) ? item.categories : [],
    runtimeMinutes: Number(item.runtimeMinutes) || 120,
    communityRating: Number(item.communityRating) || 7.8,
    popularityScore: Number(item.popularityScore) || 80,
    overview: item.overview || 'Verified movie entry in the local CineShelf database.',
    posterUrl,
    backdropUrl,
    trailerYoutubeUrl: item.trailerYoutubeUrl,
    franchiseId: item.franchiseId,
    totalSeasons: item.totalSeasons,
    totalEpisodes: item.totalEpisodes,
    showStatus: item.showStatus,
    episodes: item.episodes || EPISODES_BY_MOVIE_ID[item.movieId],
    isUpcoming: item.isUpcoming,
    addedAt: item.addedAt || '2026-02-01T00:00:00.000Z',
    isManuallyEdited: item.isManuallyEdited,
    streamingByRegion:
      item.streamingByRegion && Object.keys(item.streamingByRegion).length > 0
        ? item.streamingByRegion
        : STREAMING_BY_MOVIE_ID[item.movieId] || makeStreaming([], []),
  };
}

export const CURATED_CATALOG: CatalogItem[] = (rawLocalMovies as Array<Partial<CatalogItem> & { title: string; movieId: string }>).map(
  (entry) => hydrateCatalogItemArtwork(entry)
);

export interface LocalCatalogQueryOptions {
  q?: string;
  query?: string;
  actor?: string;
  genre?: string;
  year?: string | number;
  language?: string;
  country?: string;
  director?: string;
  minRating?: number;
  maxRuntime?: number;
  contentType?: string;
  category?: string;
  provider?: string;
  sortBy?:
    | 'popularity'
    | 'rating'
    | 'year_desc'
    | 'year_asc'
    | 'title_asc'
    | 'recently_added'
    | 'alphabetical'
    | 'newest'
    | 'oldest';
}

export function queryLocalCatalog(
  catalog: CatalogItem[],
  options: LocalCatalogQueryOptions = {}
): CatalogItem[] {
  const q = (options.q ?? options.query ?? '').trim().toLowerCase();
  const actor = (options.actor || '').trim().toLowerCase();
  const genre = (options.genre || '').trim();
  const year = options.year !== undefined && options.year !== '' && options.year !== 'all' ? Number(options.year) : null;
  const language = (options.language || '').trim();
  const country = (options.country || '').trim();
  const director = (options.director || '').trim();
  const minRating = Number(options.minRating || 0);
  const maxRuntime = Number(options.maxRuntime || 0);
  const contentType = (options.contentType || '').trim();
  const category = (options.category || '').trim();
  const provider = (options.provider || '').trim();
  const sortBy = options.sortBy || 'popularity';

  let results = [...catalog];

  if (q) {
    results = results.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) ||
        item.director.toLowerCase().includes(q) ||
        item.cast.some((c) => c.toLowerCase().includes(q)) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        item.overview.toLowerCase().includes(q) ||
        (item.productionInfo && item.productionInfo.toLowerCase().includes(q)) ||
        (item.wikidataId && item.wikidataId.toLowerCase() === q)
    );
  }

  if (actor) {
    results = results.filter((item) => item.cast.some((c) => c.toLowerCase().includes(actor)));
  }

  if (genre && genre !== 'all') {
    results = results.filter((item) => item.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  }
  if (year && !Number.isNaN(year)) {
    results = results.filter((item) => item.releaseYear === year);
  }
  if (language && language !== 'all') {
    results = results.filter((item) => item.language.toLowerCase() === language.toLowerCase());
  }
  if (country && country !== 'all') {
    results = results.filter((item) => item.country.toLowerCase() === country.toLowerCase());
  }
  if (director && director !== 'all') {
    results = results.filter((item) => item.director.toLowerCase().includes(director.toLowerCase()));
  }
  if (minRating > 0) {
    results = results.filter((item) => item.communityRating >= minRating);
  }
  if (maxRuntime > 0 && maxRuntime < 1000) {
    results = results.filter((item) => item.runtimeMinutes <= maxRuntime);
  }
  if (contentType && contentType !== 'all') {
    results = results.filter((item) => item.contentType === contentType);
  }
  if (category && category !== 'all') {
    if (category === 'recently_added') {
      results = [...results].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    } else {
      results = results.filter((item) => (item.categories || []).includes(category));
    }
  }
  if (provider && provider !== 'all') {
    results = results.filter((item) => (item.metadataProvider || 'local_json') === provider);
  }

  results.sort((a, b) => {
    if (sortBy === 'rating') return b.communityRating - a.communityRating;
    if (sortBy === 'year_desc' || sortBy === 'newest') return b.releaseYear - a.releaseYear;
    if (sortBy === 'year_asc' || sortBy === 'oldest') return a.releaseYear - b.releaseYear;
    if (sortBy === 'title_asc' || sortBy === 'alphabetical') return a.title.localeCompare(b.title);
    if (sortBy === 'recently_added') return (b.addedAt || '').localeCompare(a.addedAt || '');
    return b.popularityScore - a.popularityScore;
  });

  return results;
}

export function getCatalogSuggestions(catalog: CatalogItem[], query: string, limit = 6): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog
    .filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) ||
        item.director.toLowerCase().includes(q) ||
        item.cast.some((c) => c.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function getCatalogFilterOptions(catalog: CatalogItem[]) {
  const genres = Array.from(new Set(catalog.flatMap((c) => c.genres))).sort();
  const languages = Array.from(new Set(catalog.map((c) => c.language).filter(Boolean))).sort();
  const countries = Array.from(new Set(catalog.map((c) => c.country).filter(Boolean))).sort();
  const directors = Array.from(new Set(catalog.map((c) => c.director).filter(Boolean))).sort();
  const years = Array.from(new Set(catalog.map((c) => c.releaseYear))).sort((a, b) => b - a);

  return { genres, languages, countries, directors, years };
}

export const BUILT_IN_FRANCHISES: FranchiseDefinition[] = [
  {
    id: 'franchise-indian-patriotic',
    name: 'Indian Military & Historical Valor Collection',
    description: 'Chronological & release tracking of landmark Indian armed forces, intelligence, and historical war cinema.',
    category: 'Thematic / Historical Saga',
    watchedEntryIds: [],
    installments: [
      {
        entryId: 'inst-sam-bahadur',
        movieId: 'arch-sam-bahadur-2023',
        title: 'Sam Bahadur (1942–1971 Era)',
        releaseYear: 2023,
        chronologicalIndex: 1,
        releaseIndex: 8,
        contentType: 'movie',
        runtimeMinutes: 150,
        director: 'Meghna Gulzar',
      },
      {
        entryId: 'inst-raazi',
        movieId: 'arch-raazi-2018',
        title: 'Raazi (Pre-1971 Naval Intelligence)',
        releaseYear: 2018,
        chronologicalIndex: 2,
        releaseIndex: 3,
        contentType: 'movie',
        runtimeMinutes: 138,
        director: 'Meghna Gulzar',
      },
      {
        entryId: 'inst-pippa',
        movieId: 'arch-pippa-2023',
        title: 'Pippa (Battle of Garibpur, Nov 1971)',
        releaseYear: 2023,
        chronologicalIndex: 3,
        releaseIndex: 7,
        contentType: 'movie',
        runtimeMinutes: 139,
        director: 'Raja Krishna Menon',
      },
      {
        entryId: 'inst-border',
        movieId: 'arch-border-1997',
        title: 'Border (Battle of Longewala, Dec 1971)',
        releaseYear: 1997,
        chronologicalIndex: 4,
        releaseIndex: 1,
        contentType: 'movie',
        runtimeMinutes: 176,
        director: 'J.P. Dutta',
      },
      {
        entryId: 'inst-parmanu',
        movieId: 'arch-parmanu-2018',
        title: 'Parmanu: The Story of Pokhran (May 1998)',
        releaseYear: 2018,
        chronologicalIndex: 5,
        releaseIndex: 4,
        contentType: 'movie',
        runtimeMinutes: 129,
        director: 'Abhishek Sharma',
      },
      {
        entryId: 'inst-shershaah',
        movieId: 'arch-shershaah-2021',
        title: 'Shershaah (Kargil War, July 1999)',
        releaseYear: 2021,
        chronologicalIndex: 6,
        releaseIndex: 5,
        contentType: 'movie',
        runtimeMinutes: 135,
        director: 'Vishnuvardhan',
      },
      {
        entryId: 'inst-lakshya',
        movieId: 'arch-lakshya-2004',
        title: 'Lakshya (Kargil High-Altitude Campaign, 1999)',
        releaseYear: 2004,
        chronologicalIndex: 7,
        releaseIndex: 2,
        contentType: 'movie',
        runtimeMinutes: 186,
        director: 'Farhan Akhtar',
      },
      {
        entryId: 'inst-major',
        movieId: 'arch-major-2022',
        title: 'Major (NSG Operation Black Tornado, Nov 2008)',
        releaseYear: 2022,
        chronologicalIndex: 8,
        releaseIndex: 6,
        contentType: 'movie',
        runtimeMinutes: 150,
        director: 'Sashi Kiran Tikka',
      },
      {
        entryId: 'inst-uri',
        movieId: 'arch-uri-2019',
        title: 'Uri: The Surgical Strike (Sept 2016 Operation)',
        releaseYear: 2019,
        chronologicalIndex: 9,
        releaseIndex: 4,
        contentType: 'movie',
        runtimeMinutes: 138,
        director: 'Aditya Dhar',
      },
    ],
  },
  {
    id: 'franchise-dune-chronicles',
    name: 'Denis Villeneuve’s Dune Chronicles',
    description: 'Imperium saga following House Atreides and the Fremen across Arrakis.',
    category: 'Sci-Fi Saga',
    watchedEntryIds: [],
    installments: [
      {
        entryId: 'inst-dune-1',
        movieId: 'arch-dune-2021',
        title: 'Dune: Part One',
        releaseYear: 2021,
        chronologicalIndex: 1,
        releaseIndex: 1,
        contentType: 'movie',
        runtimeMinutes: 155,
        director: 'Denis Villeneuve',
      },
      {
        entryId: 'inst-dune-2',
        movieId: 'arch-dune-part-two-2024',
        title: 'Dune: Part Two',
        releaseYear: 2024,
        chronologicalIndex: 2,
        releaseIndex: 2,
        contentType: 'movie',
        runtimeMinutes: 166,
        director: 'Denis Villeneuve',
      },
      {
        entryId: 'inst-dune-3',
        movieId: 'arch-dune-messiah-2026',
        title: 'Dune: Messiah',
        releaseYear: 2026,
        chronologicalIndex: 3,
        releaseIndex: 3,
        contentType: 'movie',
        runtimeMinutes: 160,
        director: 'Denis Villeneuve',
        isUpcoming: true,
        releaseDate: '2026-12-18',
      },
    ],
  },
  {
    id: 'franchise-nolan-sci-fi',
    name: 'Christopher Nolan Temporal & Scientific Quartet',
    description: 'A curated director anthology exploring time, memory, physics, and human obsession.',
    category: 'Director Collection',
    watchedEntryIds: [],
    installments: [
      {
        entryId: 'inst-oppenheimer',
        movieId: 'arch-oppenheimer-2023',
        title: 'Oppenheimer (1920s–1950s Historical Era)',
        releaseYear: 2023,
        chronologicalIndex: 1,
        releaseIndex: 4,
        contentType: 'movie',
        runtimeMinutes: 180,
        director: 'Christopher Nolan',
      },
      {
        entryId: 'inst-inception',
        movieId: 'arch-inception-2010',
        title: 'Inception (Contemporary Dream Espionage)',
        releaseYear: 2010,
        chronologicalIndex: 2,
        releaseIndex: 1,
        contentType: 'movie',
        runtimeMinutes: 148,
        director: 'Christopher Nolan',
      },
      {
        entryId: 'inst-tenet',
        movieId: 'arch-tenet-2020',
        title: 'Tenet (Temporal Cold War)',
        releaseYear: 2020,
        chronologicalIndex: 3,
        releaseIndex: 3,
        contentType: 'movie',
        runtimeMinutes: 150,
        director: 'Christopher Nolan',
      },
      {
        entryId: 'inst-interstellar',
        movieId: 'arch-interstellar-2014',
        title: 'Interstellar (Late 21st Century Exodus)',
        releaseYear: 2014,
        chronologicalIndex: 4,
        releaseIndex: 2,
        contentType: 'movie',
        runtimeMinutes: 169,
        director: 'Christopher Nolan',
      },
    ],
  },
];
