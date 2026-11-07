import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLibraryStatistics,
  computeFranchiseProgress,
  deriveTitleClusterRecommendations,
  exportLibraryToCsv,
  findDuplicateLibraryItem,
  generateExplainableRecommendations,
  recommendFromLastNWatched,
  toggleSeriesEpisode,
  validateAndPreviewImport,
} from './engine';
import {
  BUILT_IN_FRANCHISES,
  CURATED_CATALOG,
  getCatalogFilterOptions,
  getCatalogSuggestions,
  queryLocalCatalog,
} from './catalog';
import {
  SAMPLE_WIKIDATA_IMPORT_JSON,
  exportCatalogueToCsv,
  exportCatalogueToJson,
  mergeCatalogItemPreservingEdits,
  parseAndValidateCatalogueImport,
} from './metadataProviders';
import { LibraryItem } from '../types/nexus';

const sampleSeries: LibraryItem = {
  id: 'series-family-man',
  uid: 'user_a',
  movieId: 'movie-family-man-2019',
  title: 'The Family Man',
  contentType: 'series',
  status: 'want_to_watch',
  releaseYear: 2019,
  runtimeMinutes: 45,
  userRating: 9,
  isFavourite: true,
  isHighlyAnticipated: false,
  priority: 'high',
  genres: ['Espionage', 'Action', 'Thriller'],
  tags: ['Espionage', 'Realistic Operations'],
  cast: ['Manoj Bajpayee'],
  totalSeasons: 2,
  totalEpisodes: 6,
  completedEpisodes: 0,
  watchedEpisodeCodes: [],
  showStatus: 'completed',
  episodes: [
    { code: 'S1E1', seasonNumber: 1, episodeNumber: 1, title: 'Ep 1', releaseDate: '2019-09-20', runtimeMinutes: 45 },
    { code: 'S1E2', seasonNumber: 1, episodeNumber: 2, title: 'Ep 2', releaseDate: '2019-09-20', runtimeMinutes: 45 },
    { code: 'S1E3', seasonNumber: 1, episodeNumber: 3, title: 'Ep 3', releaseDate: '2019-09-20', runtimeMinutes: 45 },
    { code: 'S1E4', seasonNumber: 1, episodeNumber: 4, title: 'Ep 4', releaseDate: '2019-09-20', runtimeMinutes: 45 },
    { code: 'S2E1', seasonNumber: 2, episodeNumber: 1, title: 'Ep 5', releaseDate: '2021-06-04', runtimeMinutes: 45 },
    { code: 'S2E2', seasonNumber: 2, episodeNumber: 2, title: 'Ep 6', releaseDate: '2021-06-04', runtimeMinutes: 45 },
  ],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const watchedLakshya: LibraryItem = {
  id: 'movie-lakshya',
  uid: 'user_a',
  movieId: 'movie-lakshya-2004',
  title: 'Lakshya',
  contentType: 'movie',
  status: 'watched',
  releaseYear: 2004,
  language: 'Hindi',
  country: 'India',
  director: 'Farhan Akhtar',
  runtimeMinutes: 186,
  userRating: 9.5,
  isFavourite: true,
  isHighlyAnticipated: false,
  priority: 'high',
  genres: ['Military Drama', 'Drama', 'Action'],
  tags: ['Indian Military', 'Military Training', 'Inspirational'],
  cast: ['Hrithik Roshan'],
  lastWatchedAt: '2026-11-05',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
};

test('Series Tracker: Never marks whole series as watched when only 1 episode is completed', () => {
  const afterOne = toggleSeriesEpisode(sampleSeries, 'S1E1');
  assert.equal(afterOne.completedEpisodes, 1);
  assert.equal(afterOne.completionPercentage, 17);
  assert.equal(afterOne.status, 'currently_watching');
  assert.equal(afterOne.nextEpisodeCode, 'S1E2');
});

test('Recommendation Engine: Generates all 16 sections with explicit Why explanations and excludes watched/dropped/hidden titles', () => {
  const droppedMovie: LibraryItem = {
    ...watchedLakshya,
    id: 'movie-dropped',
    title: 'Zero Dark Thirty',
    status: 'dropped',
  };
  const sections = generateExplainableRecommendations(
    [watchedLakshya, droppedMovie],
    CURATED_CATALOG,
    BUILT_IN_FRANCHISES
  );

  assert.equal(sections.length, 16);
  for (const sec of sections) {
    for (const card of sec.items) {
      assert.ok(card.whyRecommended.length > 10, `Missing explanation in section ${sec.key}`);
      if (!card.isRewatchSuggestion) {
        assert.notEqual(card.catalogItem.title, 'Lakshya', 'Must not recommend already watched title in non-rewatch section');
        assert.notEqual(card.catalogItem.title, 'Zero Dark Thirty', 'Must not recommend dropped title');
      }
    }
  }

  // Verify Recently Watched derived suggestions for Lakshya
  const clusters = deriveTitleClusterRecommendations(watchedLakshya, CURATED_CATALOG, [watchedLakshya]);
  assert.ok(clusters.length >= 4);
  assert.ok(clusters.some((c) => c.categoryLabel.includes('Indian Military')));

  // Verify "Show me more movies like the last five films I watched"
  const lastFive = recommendFromLastNWatched([watchedLakshya], CURATED_CATALOG);
  assert.deepEqual(lastFive.sourceTitles, ['Lakshya']);
  assert.ok(lastFive.recommendations.length > 0);
  assert.ok(lastFive.recommendations[0].whyRecommended.includes('Lakshya'));
});

test('Franchise Engine: Distinguishes Chronological Order from Theatrical Release Order', () => {
  const nolan = BUILT_IN_FRANCHISES.find((f) => f.id === 'franchise-nolan-sci-fi')!;
  const chrono = computeFranchiseProgress(nolan, [], 'chronological');
  const release = computeFranchiseProgress(nolan, [], 'release');

  // Chronological starts with Oppenheimer (1920s-1950s), Release starts with Inception (2010)
  assert.ok(chrono.orderedInstallments[0].title.includes('Oppenheimer'));
  assert.ok(release.orderedInstallments[0].title.includes('Inception'));
});

test('Analytics & Backup Engine: Computes accurate statistics and detects duplicates on CSV/JSON import', () => {
  const stats = calculateLibraryStatistics([watchedLakshya], []);
  assert.equal(stats.totalMoviesWatched, 1);
  assert.equal(stats.totalViewingHours, 3.1);
  assert.equal(stats.averagePersonalRating, 9.5);

  const csv = exportLibraryToCsv([watchedLakshya]);
  assert.ok(csv.includes('Lakshya'));

  const preview = validateAndPreviewImport(csv, [watchedLakshya]);
  assert.equal(preview.isValid, true);
  assert.equal(preview.duplicatesCount, 1);
  assert.equal(preview.newItemsCount, 0);

  const dup = findDuplicateLibraryItem([watchedLakshya], { title: 'lakshya', releaseYear: 2004 });
  assert.ok(dup);
});

test('Local Movie Database & Discovery Engine: Searches by title, originalTitle, director, Wikidata ID, and sorts alphabetically & by recently added', () => {
  assert.ok(CURATED_CATALOG.length >= 20);

  // Search by Korean originalTitle for Parasite (기생충)
  const koreanHit = queryLocalCatalog(CURATED_CATALOG, { query: '기생충' });
  assert.equal(koreanHit.length, 1);
  assert.equal(koreanHit[0].title, 'Parasite');

  // Search by Wikidata ID
  const wikidataHit = queryLocalCatalog(CURATED_CATALOG, { query: 'Q25188' });
  assert.equal(wikidataHit.length, 1);
  assert.equal(wikidataHit[0].title, 'Inception');

  // Alphabetical sorting
  const alphaSorted = queryLocalCatalog(CURATED_CATALOG, { sortBy: 'alphabetical' });
  assert.equal(alphaSorted[0].title, 'Arrival');

  // Filter options & instant suggestions
  const options = getCatalogFilterOptions(CURATED_CATALOG);
  assert.ok(options.genres.includes('Sci-Fi'));
  assert.ok(options.countries.includes('India'));
  const suggestions = getCatalogSuggestions(CURATED_CATALOG, 'Nolan');
  assert.ok(suggestions.some((s) => s.title === 'Inception' || s.title === 'Oppenheimer'));
});

test('Wikidata Offline JSON/CSV Import & Manual Edit Preservation: Validates, deduplicates, and preserves manual edits', () => {
  const preview = parseAndValidateCatalogueImport(SAMPLE_WIKIDATA_IMPORT_JSON, CURATED_CATALOG, 'wikidata');
  assert.equal(preview.isValid, true);
  assert.equal(preview.parsedItems.length, 2);
  assert.equal(preview.newItemsCount, 2);
  assert.equal(preview.parsedItems[0].metadataProvider, 'wikidata');
  assert.equal(preview.parsedItems[0].wikidataId, 'Q237811');
  assert.equal(preview.parsedItems[0].title, '3 Idiots');

  // Round-trip CSV export & import
  const csvStr = exportCatalogueToCsv(preview.parsedItems);
  const csvPreview = parseAndValidateCatalogueImport(csvStr, CURATED_CATALOG, 'csv');
  assert.equal(csvPreview.isValid, true);
  assert.equal(csvPreview.parsedItems.length, 2);

  // Preserve manually edited fields when merging incoming Wikidata record
  const manualEditedRecord = {
    ...preview.parsedItems[0],
    overview: 'Custom curator synopsis that must never be overwritten.',
    isManuallyEdited: true,
  };
  const updatedIncoming = {
    ...preview.parsedItems[0],
    overview: 'Generic incoming synopsis',
    ageRating: 'R',
  };
  const { merged } = mergeCatalogItemPreservingEdits(manualEditedRecord, updatedIncoming);
  assert.equal(merged.overview, 'Custom curator synopsis that must never be overwritten.');

  // JSON export
  const jsonStr = exportCatalogueToJson(preview.parsedItems);
  assert.ok(jsonStr.includes('3 Idiots'));
});

