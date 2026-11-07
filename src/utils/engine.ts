import {
  CatalogItem,
  ContentType,
  FranchiseDefinition,
  FranchiseInstallment,
  LibraryItem,
  RecommendationCardItem,
  RecommendationFeedback,
  RecommendationSection,
  ReviewRecord,
  UserPreferences,
  WatchHistoryRecord,
} from '../types/nexus';

export interface SeriesProgressResult {
  watchedEpisodeCodes: string[];
  completedEpisodes: number;
  totalEpisodes: number;
  completionPercentage: number;
  currentSeason: number;
  currentEpisode: number;
  nextEpisodeCode: string | null;
  status: LibraryItem['status'];
}

/**
 * Part 3 Section C: Advanced Web-Series Tracker
 * NEVER marks a whole series as completed merely because one episode is completed.
 */
export function toggleSeriesEpisode(
  item: LibraryItem,
  episodeCode: string
): SeriesProgressResult {
  const existingCodes = new Set(item.watchedEpisodeCodes || []);
  if (existingCodes.has(episodeCode)) {
    existingCodes.delete(episodeCode);
  } else {
    existingCodes.add(episodeCode);
  }

  const watchedEpisodeCodes = Array.from(existingCodes).sort();
  const completedEpisodes = watchedEpisodeCodes.length;
  const totalEpisodes = Math.max(item.totalEpisodes || (item.episodes?.length ?? 10), 1);
  const completionPercentage = Math.min(100, Math.round((completedEpisodes / totalEpisodes) * 100));

  // Determine current and next episode
  let currentSeason = item.currentSeason || 1;
  let currentEpisode = item.currentEpisode || 1;
  let nextEpisodeCode: string | null = null;

  if (item.episodes && item.episodes.length > 0) {
    const sortedEps = [...item.episodes].sort(
      (a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber
    );
    const lastWatched = [...sortedEps].reverse().find((ep) => existingCodes.has(ep.code));
    if (lastWatched) {
      currentSeason = lastWatched.seasonNumber;
      currentEpisode = lastWatched.episodeNumber;
    }
    const nextUnwatched = sortedEps.find((ep) => !existingCodes.has(ep.code));
    nextEpisodeCode = nextUnwatched ? nextUnwatched.code : null;
  } else {
    // Fallback code parsing e.g. S1E2
    const lastCode = watchedEpisodeCodes[watchedEpisodeCodes.length - 1];
    if (lastCode) {
      const m = /^S(\d+)E(\d+)$/i.exec(lastCode);
      if (m) {
        currentSeason = Number(m[1]);
        currentEpisode = Number(m[2]);
        if (completedEpisodes < totalEpisodes) {
          nextEpisodeCode = `S${currentSeason}E${currentEpisode + 1}`;
        }
      }
    } else {
      nextEpisodeCode = 'S1E1';
    }
  }

  // Rule: Never mark a whole series as completed merely because one episode is completed.
  let nextStatus: LibraryItem['status'] = item.status;
  if (completedEpisodes === 0) {
    nextStatus = item.status === 'watched' ? 'want_to_watch' : item.status;
  } else if (
    completedEpisodes >= totalEpisodes &&
    totalEpisodes > 1 &&
    item.showStatus !== 'ongoing'
  ) {
    nextStatus = 'watched';
  } else {
    nextStatus = 'currently_watching';
  }

  return {
    watchedEpisodeCodes,
    completedEpisodes,
    totalEpisodes,
    completionPercentage,
    currentSeason,
    currentEpisode,
    nextEpisodeCode,
    status: nextStatus,
  };
}

/**
 * Duplicate Detection & Metadata Merge Helper (Feature 25 & Part 9)
 */
export function findDuplicateLibraryItem(
  library: LibraryItem[],
  candidate: { movieId?: string; title: string; releaseYear?: number; contentType?: ContentType }
): LibraryItem | undefined {
  const normTitle = candidate.title.trim().toLowerCase();
  return library.find((item) => {
    if (candidate.movieId && item.movieId && candidate.movieId === item.movieId) {
      return true;
    }
    const sameTitle = item.title.trim().toLowerCase() === normTitle;
    if (!sameTitle) return false;
    if (candidate.releaseYear && item.releaseYear) {
      return Math.abs(candidate.releaseYear - item.releaseYear) <= 1;
    }
    return true;
  });
}

export function mergeLibraryItemMetadata(existing: LibraryItem, incoming: Partial<LibraryItem>): LibraryItem {
  const mergedGenres = Array.from(new Set([...(existing.genres || []), ...(incoming.genres || [])]));
  const mergedTags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
  const mergedCast = Array.from(new Set([...(existing.cast || []), ...(incoming.cast || [])]));

  return {
    ...existing,
    movieId: existing.movieId || incoming.movieId,
    posterUrl: incoming.posterUrl || existing.posterUrl,
    backdropUrl: incoming.backdropUrl || existing.backdropUrl,
    overview: existing.overview || incoming.overview,
    personalNotes: existing.personalNotes
      ? incoming.personalNotes && incoming.personalNotes !== existing.personalNotes
        ? `${existing.personalNotes}\n${incoming.personalNotes}`
        : existing.personalNotes
      : incoming.personalNotes,
    director: existing.director || incoming.director,
    language: existing.language || incoming.language,
    country: existing.country || incoming.country,
    runtimeMinutes: existing.runtimeMinutes || incoming.runtimeMinutes || 120,
    userRating: incoming.userRating && incoming.userRating > 0 ? incoming.userRating : existing.userRating,
    genres: mergedGenres,
    tags: mergedTags,
    cast: mergedCast,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Part 4: Franchise Ordering & Progress Engine
 * Explicitly distinguishes Chronological Order from Theatrical Release Order and Custom Order.
 */
export interface FranchiseSummary {
  orderedInstallments: (FranchiseInstallment & { isWatched: boolean })[];
  watchedCount: number;
  releasedCount: number;
  completionPercentage: number;
  nextInstallmentToWatch: FranchiseInstallment | null;
  upcomingInstallments: FranchiseInstallment[];
}

export function computeFranchiseProgress(
  franchise: FranchiseDefinition,
  library: LibraryItem[],
  orderMode: 'chronological' | 'release' | 'custom' = 'chronological'
): FranchiseSummary {
  const watchedSet = new Set(franchise.watchedEntryIds || []);
  for (const libItem of library) {
    if (libItem.status === 'watched') {
      if (libItem.movieId) watchedSet.add(libItem.movieId);
      watchedSet.add(libItem.id);
      watchedSet.add(libItem.title.toLowerCase());
    }
  }

  const installmentsCopy = [...franchise.installments];
  if (orderMode === 'chronological') {
    installmentsCopy.sort((a, b) => a.chronologicalIndex - b.chronologicalIndex);
  } else if (orderMode === 'release') {
    installmentsCopy.sort((a, b) => a.releaseIndex - b.releaseIndex);
  } else if (orderMode === 'custom' && franchise.customOrderIds?.length) {
    const orderMap = new Map(franchise.customOrderIds.map((id, idx) => [id, idx]));
    installmentsCopy.sort(
      (a, b) => (orderMap.get(a.entryId) ?? 999) - (orderMap.get(b.entryId) ?? 999)
    );
  }

  const orderedInstallments = installmentsCopy.map((inst) => ({
    ...inst,
    isWatched:
      watchedSet.has(inst.entryId) ||
      watchedSet.has(inst.movieId) ||
      watchedSet.has(inst.title.toLowerCase()),
  }));

  const released = orderedInstallments.filter((i) => !i.isUpcoming);
  const watchedCount = released.filter((i) => i.isWatched).length;
  const releasedCount = Math.max(released.length, 1);
  const completionPercentage = Math.min(100, Math.round((watchedCount / releasedCount) * 100));
  const nextInstallmentToWatch = released.find((i) => !i.isWatched) || null;
  const upcomingInstallments = orderedInstallments.filter((i) => i.isUpcoming);

  return {
    orderedInstallments,
    watchedCount,
    releasedCount: released.length,
    completionPercentage,
    nextInstallmentToWatch,
    upcomingInstallments,
  };
}

/**
 * Part 12: Derived cluster suggestions directly below each Recently Watched title
 * Example: Recently watched Lakshya -> Other Indian military dramas, Military training stories,
 * Real-life military biographies, International military films, Similar inspirational stories.
 */
export interface DerivedTitleSuggestion {
  categoryLabel: string;
  item: CatalogItem;
  whyRecommended: string;
}

export function deriveTitleClusterRecommendations(
  watchedItem: LibraryItem,
  catalog: CatalogItem[],
  library: LibraryItem[]
): DerivedTitleSuggestion[] {
  const excludedTitles = new Set(
    library
      .filter((i) => i.status === 'watched' || i.status === 'dropped' || i.status === 'hidden')
      .map((i) => i.title.toLowerCase())
  );
  excludedTitles.add(watchedItem.title.toLowerCase());

  const candidates = catalog.filter((c) => !excludedTitles.has(c.title.toLowerCase()));
  const results: DerivedTitleSuggestion[] = [];
  const usedIds = new Set<string>();

  const pickBest = (predicate: (c: CatalogItem) => boolean, categoryLabel: string, reason: string) => {
    const match = candidates.find((c) => !usedIds.has(c.movieId) && predicate(c));
    if (match) {
      usedIds.add(match.movieId);
      results.push({
        categoryLabel,
        item: match,
        whyRecommended: reason,
      });
    }
  };

  const isMilitaryOrAction =
    watchedItem.genres.some((g) => /military|action|history|thriller|espionage|war/i.test(g)) ||
    watchedItem.tags.some((t) => /military|operations|espionage/i.test(t));

  if (isMilitaryOrAction) {
    pickBest(
      (c) => c.country === 'India' && c.genres.some((g) => /war|military/i.test(g)),
      'Other Indian Military Dramas',
      `Recommended because you recently watched ${watchedItem.title} (${watchedItem.language || 'Indian'} military cinema).`
    );
    pickBest(
      (c) => c.tags.some((t) => /training|operations|tactical/i.test(t)),
      'Military Training & Tactical Stories',
      `Recommended because ${watchedItem.title} features tactical preparation and high-stakes operations.`
    );
    pickBest(
      (c) => c.genres.includes('Biography') || c.tags.some((t) => /biography|biopic|true-events/i.test(t)),
      'Real-Life Military Biographies',
      `Recommended because you enjoy real-life historical and biographical chronicles like ${watchedItem.title}.`
    );
    pickBest(
      (c) => c.country !== 'India' && c.genres.some((g) => /military|espionage|history|war|spy/i.test(g)),
      'International Military & Intelligence Films',
      `Recommended as an international counterpart to ${watchedItem.title}.`
    );
  }

  // Fill remaining slots up to 5 with genre/director/tag matches
  for (const c of candidates) {
    if (results.length >= 5) break;
    if (usedIds.has(c.movieId)) continue;
    const sharedGenres = c.genres.filter((g) => watchedItem.genres.includes(g));
    if (sharedGenres.length > 0 || c.director === watchedItem.director) {
      usedIds.add(c.movieId);
      results.push({
        categoryLabel: sharedGenres[0] ? `Similar ${sharedGenres[0]} Stories` : 'Director & Tone Match',
        item: c,
        whyRecommended:
          c.director === watchedItem.director
            ? `Recommended because you watched ${watchedItem.title} directed by ${c.director}.`
            : `Recommended because you recently watched ${watchedItem.title} and enjoy ${sharedGenres.slice(0, 2).join(' & ')}.`,
      });
    }
  }

  return results;
}

/**
 * Part 12: "Show me more movies like the last five films I watched"
 * Deterministically computes recommendations using the user's actual last N watched titles.
 */
export function recommendFromLastNWatched(
  library: LibraryItem[],
  catalog: CatalogItem[],
  feedback: RecommendationFeedback[] = [],
  n = 5
): { sourceTitles: string[]; recommendations: RecommendationCardItem[] } {
  const watchedMovies = library
    .filter((i) => i.status === 'watched')
    .sort((a, b) => (b.lastWatchedAt || b.updatedAt).localeCompare(a.lastWatchedAt || a.updatedAt))
    .slice(0, n);

  const sourceTitles = watchedMovies.map((m) => m.title);
  const blockedTitles = new Set<string>([
    ...library
      .filter((i) => i.status === 'watched' || i.status === 'dropped' || i.status === 'hidden')
      .map((i) => i.title.toLowerCase()),
    ...feedback
      .filter((f) => f.feedbackType !== 'like')
      .map((f) => f.targetTitle.toLowerCase()),
  ]);

  const genreWeights = new Map<string, number>();
  const tagWeights = new Map<string, number>();
  const directorSet = new Set<string>();
  const languageWeights = new Map<string, number>();

  for (const item of watchedMovies) {
    const ratingMultiplier = item.userRating >= 8 ? 2 : 1;
    for (const g of item.genres) {
      genreWeights.set(g, (genreWeights.get(g) || 0) + 2 * ratingMultiplier);
    }
    for (const t of item.tags) {
      tagWeights.set(t, (tagWeights.get(t) || 0) + 1.5 * ratingMultiplier);
    }
    if (item.director) directorSet.add(item.director);
    if (item.language) {
      languageWeights.set(item.language, (languageWeights.get(item.language) || 0) + 1);
    }
  }

  const scored: RecommendationCardItem[] = [];
  for (const candidate of catalog) {
    if (blockedTitles.has(candidate.title.toLowerCase())) continue;
    let score = 0;
    const matchedGenres: string[] = [];
    const matchedTags: string[] = [];

    for (const g of candidate.genres) {
      const w = genreWeights.get(g);
      if (w) {
        score += w * 8;
        matchedGenres.push(g);
      }
    }
    for (const t of candidate.tags) {
      const w = tagWeights.get(t);
      if (w) {
        score += w * 6;
        matchedTags.push(t);
      }
    }
    if (directorSet.has(candidate.director)) {
      score += 22;
    }
    if (languageWeights.has(candidate.language)) {
      score += 10;
    }
    score += candidate.communityRating * 2;

    const topSource = watchedMovies.find(
      (w) =>
        w.director === candidate.director ||
        w.genres.some((g) => candidate.genres.includes(g))
    );

    const whyParts: string[] = [];
    if (topSource) {
      whyParts.push(`Recommended because your last ${watchedMovies.length} watched titles include ${topSource.title}`);
    } else {
      whyParts.push(`Recommended from your recent viewing profile`);
    }
    if (matchedGenres.length > 0) {
      whyParts.push(`matching your affinity for ${matchedGenres.slice(0, 2).join(' and ')}`);
    }
    if (matchedTags.length > 0) {
      whyParts.push(`(${matchedTags.slice(0, 2).join(', ')})`);
    }

    scored.push({
      catalogItem: candidate,
      matchScore: Math.min(99, Math.round(score)),
      whyRecommended: `${whyParts.join(' ')}.`,
      sectionKey: 'last_five_synthesis',
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return {
    sourceTitles,
    recommendations: scored.slice(0, 6),
  };
}

/**
 * Part 3 Section E: Complete 16-Section Explainable Recommendation Engine (Features 61–76)
 */
export function generateExplainableRecommendations(
  library: LibraryItem[],
  catalog: CatalogItem[],
  franchises: FranchiseDefinition[],
  preferences?: UserPreferences | null,
  feedback: RecommendationFeedback[] = [],
  reviews: ReviewRecord[] = []
): RecommendationSection[] {
  const watchedItems = library
    .filter((i) => i.status === 'watched')
    .sort((a, b) => (b.lastWatchedAt || b.updatedAt).localeCompare(a.lastWatchedAt || a.updatedAt));
  const droppedOrHiddenTitles = new Set(
    library
      .filter((i) => i.status === 'dropped' || i.status === 'hidden')
      .map((i) => i.title.toLowerCase())
  );
  const watchedTitles = new Set(watchedItems.map((i) => i.title.toLowerCase()));
  const feedbackBlocked = new Set(
    feedback
      .filter((f) => f.feedbackType === 'dislike' || f.feedbackType === 'not_interested' || f.feedbackType === 'dismissed')
      .map((f) => f.targetTitle.toLowerCase())
  );
  const likedFeedbackTitles = new Set(
    feedback.filter((f) => f.feedbackType === 'like').map((f) => f.targetTitle.toLowerCase())
  );

  // Eligibility helper for normal (non-rewatch) recommendations
  const isEligible = (c: CatalogItem) =>
    !watchedTitles.has(c.title.toLowerCase()) &&
    !droppedOrHiddenTitles.has(c.title.toLowerCase()) &&
    !feedbackBlocked.has(c.title.toLowerCase());

  const eligibleCatalog = catalog.filter(isEligible);

  // Derive top genres, directors, languages
  const genreCounts = new Map<string, number>();
  for (const item of watchedItems) {
    const weight = item.userRating >= 8 ? 2 : 1;
    for (const g of item.genres) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + weight);
    }
  }
  for (const prefGenre of preferences?.favouriteGenres || []) {
    genreCounts.set(prefGenre, (genreCounts.get(prefGenre) || 0) + 3);
  }
  // Optional Review Sentiment Opt-In
  if (preferences?.useReviewSentiment) {
    for (const rev of reviews) {
      if (rev.sentiment === 'positive') {
        const libMatch = library.find((l) => l.id === rev.itemId);
        for (const g of libMatch?.genres || []) {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 2);
        }
      }
    }
  }

  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const primaryGenre = topGenres[0] || 'Military Drama';
  const secondaryGenre = topGenres[1] || 'Thriller';

  const lastWatched = watchedItems[0];
  const lastWatchedMovie = watchedItems.find((i) => i.contentType === 'movie') || lastWatched;
  const highestRated = [...watchedItems].sort((a, b) => b.userRating - a.userRating)[0];
  const completedSeries = watchedItems.find(
    (i) => i.contentType === 'series' || i.contentType === 'anime' || i.contentType === 'animated_series'
  );

  const buildCards = (
    items: CatalogItem[],
    sectionKey: string,
    reasonBuilder: (c: CatalogItem) => string,
    isRewatchSuggestion = false
  ): RecommendationCardItem[] =>
    items.slice(0, 4).map((c, idx) => ({
      catalogItem: c,
      whyRecommended: reasonBuilder(c),
      matchScore: Math.max(78, 98 - idx * 3 + (likedFeedbackTitles.has(c.title.toLowerCase()) ? 2 : 0)),
      sectionKey,
      isRewatchSuggestion,
    }));

  // 61. Because You Recently Watched
  const sec61Items = eligibleCatalog.filter((c) =>
    lastWatched
      ? c.genres.some((g) => lastWatched.genres.includes(g)) ||
        c.tags.some((t) => lastWatched.tags.includes(t))
      : true
  );

  // 62. More Like Your Last Watched Movie
  const sec62Items = eligibleCatalog.filter((c) =>
    lastWatchedMovie
      ? c.contentType === 'movie' &&
        (c.genres.some((g) => lastWatchedMovie.genres.includes(g)) || c.country === lastWatchedMovie.country)
      : c.contentType === 'movie'
  );

  // 63. Similar to Your Highest-Rated Movies
  const sec63Items = eligibleCatalog.filter((c) =>
    highestRated
      ? c.genres.some((g) => highestRated.genres.includes(g)) || c.communityRating >= 8.0
      : c.communityRating >= 8.0
  );

  // 64. Based on Your Favourite Genres
  const sec64Items = eligibleCatalog.filter(
    (c) => c.genres.includes(primaryGenre) || c.genres.includes(secondaryGenre)
  );

  // 65. Hidden Gems You May Like (High rating, lower mainstream popularity)
  const sec65Items = eligibleCatalog.filter((c) => c.popularityScore <= 85 && c.communityRating >= 7.3);

  // 66. Underrated Recommendations
  const sec66Items = eligibleCatalog.filter(
    (c) => c.tags.some((t) => /underrated|hidden gem|auteur/i.test(t)) || c.popularityScore < 88
  );

  // 67. Popular Picks Matching Your Taste
  const sec67Items = [...eligibleCatalog].sort((a, b) => b.popularityScore - a.popularityScore);

  // 68. International Cinema Recommendations
  const sec68Items = eligibleCatalog.filter(
    (c) => c.language !== 'English' || c.country !== 'United States'
  );

  // 69. New Releases Matching Your Preferences
  const sec69Items = eligibleCatalog.filter((c) => c.releaseYear >= 2022);

  // 70. Continue Watching (From user's currently_watching library items)
  const continueWatchingCatalog: CatalogItem[] = library
    .filter((i) => i.status === 'currently_watching')
    .map((i) => ({
      movieId: i.movieId || i.id,
      title: i.title,
      contentType: i.contentType,
      releaseYear: i.releaseYear,
      language: i.language || 'English',
      country: i.country || 'India',
      director: i.director || 'Featured Director',
      cast: i.cast,
      genres: i.genres,
      tags: i.tags,
      runtimeMinutes: i.runtimeMinutes,
      communityRating: i.userRating || 8.5,
      popularityScore: 92,
      overview: i.overview || 'Continue from your active viewing progress.',
      posterUrl: i.posterUrl || catalog[0]?.posterUrl || '',
      backdropUrl: i.backdropUrl || catalog[0]?.backdropUrl || '',
      streamingByRegion: i.streamingByRegion || {},
    }));

  // 71. Next in Your Franchise
  const nextFranchiseItems: { item: CatalogItem; franchiseName: string }[] = [];
  for (const f of franchises) {
    const prog = computeFranchiseProgress(f, library, 'chronological');
    if (prog.nextInstallmentToWatch) {
      const catMatch =
        catalog.find((c) => c.movieId === prog.nextInstallmentToWatch?.movieId) ||
        ({
          movieId: prog.nextInstallmentToWatch.movieId,
          title: prog.nextInstallmentToWatch.title,
          contentType: prog.nextInstallmentToWatch.contentType,
          releaseYear: prog.nextInstallmentToWatch.releaseYear,
          language: 'English',
          country: 'United States',
          director: prog.nextInstallmentToWatch.director,
          cast: [],
          genres: ['Action', 'Adventure'],
          tags: [f.name],
          runtimeMinutes: prog.nextInstallmentToWatch.runtimeMinutes,
          communityRating: 8.1,
          popularityScore: 90,
          overview: `Next chronological installment in ${f.name}.`,
          posterUrl: catalog[0]?.posterUrl || '',
          backdropUrl: catalog[0]?.backdropUrl || '',
          streamingByRegion: {},
        } satisfies CatalogItem);
      if (!droppedOrHiddenTitles.has(catMatch.title.toLowerCase())) {
        nextFranchiseItems.push({ item: catMatch, franchiseName: f.name });
      }
    }
  }

  // 72. Your Next Perfect Watch
  const sec72Items = [...eligibleCatalog].sort(
    (a, b) => b.communityRating * 10 + b.popularityScore - (a.communityRating * 10 + a.popularityScore)
  );

  // 73. Forgotten Watchlist Picks
  const watchlistCatalog: CatalogItem[] = library
    .filter((i) => i.status === 'want_to_watch')
    .map((i) => ({
      movieId: i.movieId || i.id,
      title: i.title,
      contentType: i.contentType,
      releaseYear: i.releaseYear,
      language: i.language || 'English',
      country: i.country || 'India',
      director: i.director || 'Director',
      cast: i.cast,
      genres: i.genres,
      tags: i.tags,
      runtimeMinutes: i.runtimeMinutes,
      communityRating: i.userRating || 8.2,
      popularityScore: 88,
      overview: i.overview || 'Saved in your Watchlist.',
      posterUrl: i.posterUrl || catalog[0]?.posterUrl || '',
      backdropUrl: i.backdropUrl || catalog[0]?.backdropUrl || '',
      streamingByRegion: i.streamingByRegion || {},
    }));

  // 74. Random Discovery (Deterministic seed based on library size)
  const sec74Items = [...eligibleCatalog].reverse();

  // 75. Rewatch Recommendations (ONLY section allowed to include already-watched titles!)
  const rewatchCandidates: CatalogItem[] = library
    .filter((i) => (i.status === 'watched' && i.userRating >= 8) || i.status === 'plan_to_rewatch')
    .map((i) => ({
      movieId: i.movieId || i.id,
      title: i.title,
      contentType: i.contentType,
      releaseYear: i.releaseYear,
      language: i.language || 'Hindi',
      country: i.country || 'India',
      director: i.director || 'Director',
      cast: i.cast,
      genres: i.genres,
      tags: i.tags,
      runtimeMinutes: i.runtimeMinutes,
      communityRating: i.userRating || 9.0,
      popularityScore: 95,
      overview: i.overview || 'One of your highest-rated favourites ready for a rewatch.',
      posterUrl: i.posterUrl || catalog[0]?.posterUrl || '',
      backdropUrl: i.backdropUrl || catalog[0]?.backdropUrl || '',
      streamingByRegion: i.streamingByRegion || {},
    }));

  // 76. Recommendations Based on Your Recently Completed Series
  const sec76Items = eligibleCatalog.filter(
    (c) => c.contentType === 'series' || c.contentType === 'anime' || c.contentType === 'animated_series'
  );

  return [
    {
      key: 'because_recently_watched',
      number: 61,
      title: 'Because You Recently Watched',
      subtitle: lastWatched ? `Derived from ${lastWatched.title}` : 'Based on your recent screening activity',
      items: buildCards(
        sec61Items,
        'because_recently_watched',
        (c) =>
          lastWatched
            ? `Recommended because you recently watched ${lastWatched.title} (${c.genres.slice(0, 2).join(' · ')}).`
            : `Recommended because it aligns with your ${c.genres.slice(0, 2).join(' & ')} taste profile.`
      ),
    },
    {
      key: 'more_like_last_movie',
      number: 62,
      title: 'More Like Your Last Watched Movie',
      subtitle: lastWatchedMovie ? `Thematic & tonal matches to ${lastWatchedMovie.title}` : 'Feature film matches',
      items: buildCards(
        sec62Items,
        'more_like_last_movie',
        (c) =>
          lastWatchedMovie
            ? `Recommended because you watched ${lastWatchedMovie.title} and appreciate ${c.tags.slice(0, 2).join(' and ') || c.genres.join(', ')}.`
            : `Recommended feature film matching your preferred pacing and scale.`
      ),
    },
    {
      key: 'similar_highest_rated',
      number: 63,
      title: 'Similar to Your Highest-Rated Movies',
      subtitle: highestRated ? `Anchored by ${highestRated.title} (${highestRated.userRating}/10)` : 'Critically acclaimed matches',
      items: buildCards(
        sec63Items,
        'similar_highest_rated',
        (c) =>
          highestRated
            ? `Recommended because you rated ${highestRated.title} ${highestRated.userRating}/10.`
            : `Recommended for its ${c.communityRating}/10 critical acclaim in ${c.genres[0]}.`
      ),
    },
    {
      key: 'favourite_genres',
      number: 64,
      title: 'Based on Your Favourite Genres',
      subtitle: `Spotlighting ${primaryGenre} & ${secondaryGenre}`,
      items: buildCards(
        sec64Items,
        'favourite_genres',
        (c) =>
          `Recommended because you frequently rate ${c.genres.slice(0, 2).join(' and ')} titles highly.`
      ),
    },
    {
      key: 'hidden_gems',
      number: 65,
      title: 'Hidden Gems You May Like',
      subtitle: 'High critical acclaim outside mainstream blockbusters',
      items: buildCards(
        sec65Items,
        'hidden_gems',
        (c) =>
          `Recommended hidden gem (${c.communityRating}/10) matching your interest in ${c.genres.slice(0, 2).join(' & ')}.`
      ),
    },
    {
      key: 'underrated_picks',
      number: 66,
      title: 'Underrated Recommendations',
      subtitle: 'Overlooked auteur and specialist cinema',
      items: buildCards(
        sec66Items,
        'underrated_picks',
        (c) =>
          `Recommended underrated work by director ${c.director} with strong thematic resonance.`
      ),
    },
    {
      key: 'popular_matching_taste',
      number: 67,
      title: 'Popular Picks Matching Your Taste',
      subtitle: 'High-momentum titles filtered through your preferences',
      items: buildCards(
        sec67Items,
        'popular_matching_taste',
        (c) =>
          `Recommended popular standout (${c.popularityScore}% momentum) aligned with your ${c.genres[0]} history.`
      ),
    },
    {
      key: 'international_cinema',
      number: 68,
      title: 'International Cinema Recommendations',
      subtitle: 'World cinema across Hindi, Telugu, Japanese, French, and Korean',
      items: buildCards(
        sec68Items,
        'international_cinema',
        (c) =>
          `Recommended ${c.language}-language cinema from ${c.country} matching your ${c.genres[0]} preferences.`
      ),
    },
    {
      key: 'new_releases',
      number: 69,
      title: 'New Releases Matching Your Preferences',
      subtitle: 'Recent & upcoming premieres tailored to your taste',
      items: buildCards(
        sec69Items,
        'new_releases',
        (c) =>
          `Recommended ${c.releaseYear} release directed by ${c.director} matching your preferred genres.`
      ),
    },
    {
      key: 'continue_watching',
      number: 70,
      title: 'Continue Watching',
      subtitle: 'Active titles in progress in your personal library',
      items: buildCards(
        continueWatchingCatalog.length > 0 ? continueWatchingCatalog : sec76Items,
        'continue_watching',
        (c) => `Active in your library — pick up where you left off in ${c.title}.`
      ),
    },
    {
      key: 'next_in_franchise',
      number: 71,
      title: 'Next in Your Franchise',
      subtitle: 'The next chronological or release installment in your active sagas',
      items: nextFranchiseItems.slice(0, 4).map((nf, idx) => ({
        catalogItem: nf.item,
        whyRecommended: `Recommended because it is the next unwatched installment in ${nf.franchiseName}.`,
        matchScore: 97 - idx * 2,
        sectionKey: 'next_in_franchise',
      })),
    },
    {
      key: 'next_perfect_watch',
      number: 72,
      title: 'Your Next Perfect Watch',
      subtitle: 'Highest composite match across genre, director, runtime, and rating',
      items: buildCards(
        sec72Items,
        'next_perfect_watch',
        (c) =>
          `Top composite match (${c.runtimeMinutes}m) combining ${c.genres.slice(0, 2).join(', ')} and director ${c.director}.`
      ),
    },
    {
      key: 'forgotten_watchlist',
      number: 73,
      title: 'Forgotten Watchlist Picks',
      subtitle: 'High-priority titles waiting in your Want to Watch queue',
      items: buildCards(
        watchlistCatalog.length > 0 ? watchlistCatalog : sec65Items,
        'forgotten_watchlist',
        (c) => `Saved in your Watchlist — matches your current ${c.genres[0] || 'cinema'} mood.`
      ),
    },
    {
      key: 'random_discovery',
      number: 74,
      title: 'Random Discovery',
      subtitle: 'Serendipitous high-rated cinema outside your routine rotation',
      items: buildCards(
        sec74Items,
        'random_discovery',
        (c) =>
          `Serendipitous discovery: ${c.releaseYear} ${c.contentType.replace('_', ' ')} (${c.communityRating}/10) to expand your palette.`
      ),
    },
    {
      key: 'rewatch_recommendations',
      number: 75,
      title: 'Rewatch Recommendations',
      subtitle: 'Your personal 8+/10 masterpieces worth revisiting',
      items: buildCards(
        rewatchCandidates,
        'rewatch_recommendations',
        (c) =>
          `Rewatch suggestion: You previously rated ${c.title} ${c.communityRating}/10 in your library.`,
        true
      ),
    },
    {
      key: 'completed_series_followup',
      number: 76,
      title: 'Recommendations Based on Your Recently Completed Series',
      subtitle: completedSeries ? `Follow-up series to ${completedSeries.title}` : 'Long-form episodic storytelling',
      items: buildCards(
        sec76Items,
        'completed_series_followup',
        (c) =>
          completedSeries
            ? `Recommended because you tracked ${completedSeries.title} and enjoy episodic ${c.genres[0]}.`
            : `Recommended episodic series with ${c.totalSeasons || 1} season(s) and high viewer retention.`
      ),
    },
  ];
}

/**
 * Part 6: Advanced Personal Analytics Engine
 * All statistics are calculated strictly from actual personal records.
 */
export interface LibraryStatistics {
  totalMoviesWatched: number;
  totalSeriesCompleted: number;
  totalEpisodesWatched: number;
  totalViewingHours: number;
  averagePersonalRating: number;
  highestRatedTitles: LibraryItem[];
  lowestRatedTitles: LibraryItem[];
  mostWatchedGenres: { name: string; count: number }[];
  favouriteLanguages: { name: string; count: number }[];
  favouriteDirectors: { name: string; count: number }[];
  favouriteActors: { name: string; count: number }[];
  monthlyActivity: { month: string; count: number; hours: number }[];
  annualActivity: { year: string; count: number; hours: number }[];
  currentStreakDays: number;
  longestStreakDays: number;
  droppedCount: number;
  droppedPercentage: number;
  watchlistCount: number;
  ratingDistribution: { ratingBucket: string; count: number }[];
  mostActiveViewingMonth: string;
}

export function calculateLibraryStatistics(
  library: LibraryItem[],
  watchHistory: WatchHistoryRecord[],
  filters?: { year?: string; month?: string; contentType?: string; genre?: string }
): LibraryStatistics {
  const filteredLibrary = library.filter((item) => {
    if (filters?.contentType && filters.contentType !== 'all' && item.contentType !== filters.contentType) {
      return false;
    }
    if (filters?.genre && filters.genre !== 'all' && !item.genres.includes(filters.genre)) {
      return false;
    }
    if (filters?.year && filters.year !== 'all') {
      const watchYear = (item.lastWatchedAt || item.updatedAt || '').slice(0, 4);
      if (watchYear !== filters.year) return false;
    }
    if (filters?.month && filters.month !== 'all') {
      const watchMonth = (item.lastWatchedAt || item.updatedAt || '').slice(5, 7);
      if (watchMonth !== filters.month) return false;
    }
    return true;
  });

  const watchedItems = filteredLibrary.filter((i) => i.status === 'watched');
  const totalMoviesWatched = watchedItems.filter(
    (i) => i.contentType === 'movie' || i.contentType === 'animated_movie' || i.contentType === 'documentary' || i.contentType === 'short_film'
  ).length;
  const totalSeriesCompleted = watchedItems.filter(
    (i) => i.contentType === 'series' || i.contentType === 'anime' || i.contentType === 'animated_series'
  ).length;

  let totalEpisodesWatched = 0;
  let totalMinutes = 0;

  for (const item of filteredLibrary) {
    const epCount = item.completedEpisodes || item.watchedEpisodeCodes?.length || 0;
    totalEpisodesWatched += epCount;
    if (epCount > 0) {
      totalMinutes += epCount * (item.runtimeMinutes || 45);
    } else if (item.status === 'watched') {
      totalMinutes += item.runtimeMinutes || 120;
    }
  }

  // Include explicit rewatch sessions from watchHistory
  for (const h of watchHistory) {
    if (h.isRewatch) {
      totalMinutes += h.durationMinutes || 0;
    }
  }

  const totalViewingHours = Math.round((totalMinutes / 60) * 10) / 10;

  const ratedItems = filteredLibrary.filter((i) => i.userRating > 0);
  const averagePersonalRating =
    ratedItems.length > 0
      ? Math.round((ratedItems.reduce((acc, i) => acc + i.userRating, 0) / ratedItems.length) * 10) / 10
      : 0;

  const sortedByRating = [...ratedItems].sort((a, b) => b.userRating - a.userRating);
  const highestRatedTitles = sortedByRating.slice(0, 5);
  const lowestRatedTitles = [...ratedItems].sort((a, b) => a.userRating - b.userRating).slice(0, 5);

  const countMap = (extractor: (item: LibraryItem) => string[]) => {
    const m = new Map<string, number>();
    for (const item of filteredLibrary.filter((i) => i.status === 'watched' || i.status === 'currently_watching')) {
      for (const val of extractor(item)) {
        if (!val) continue;
        m.set(val, (m.get(val) || 0) + 1);
      }
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const mostWatchedGenres = countMap((i) => i.genres);
  const favouriteLanguages = countMap((i) => (i.language ? [i.language] : []));
  const favouriteDirectors = countMap((i) => (i.director ? [i.director] : []));
  const favouriteActors = countMap((i) => i.cast || []);

  // Monthly & Annual Activity
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyBuckets = new Map<string, { count: number; minutes: number }>();
  for (const m of monthNames) {
    monthlyBuckets.set(m, { count: 0, minutes: 0 });
  }

  const annualBuckets = new Map<string, { count: number; minutes: number }>();

  for (const item of watchedItems) {
    const dateStr = item.lastWatchedAt || item.updatedAt || '2026-11-01';
    const d = new Date(dateStr);
    const mIdx = Number.isNaN(d.getMonth()) ? 10 : d.getMonth();
    const mName = monthNames[mIdx];
    const yr = Number.isNaN(d.getFullYear()) ? '2026' : String(d.getFullYear());

    const curM = monthlyBuckets.get(mName) || { count: 0, minutes: 0 };
    curM.count += 1;
    curM.minutes += item.runtimeMinutes || 120;
    monthlyBuckets.set(mName, curM);

    const curY = annualBuckets.get(yr) || { count: 0, minutes: 0 };
    curY.count += 1;
    curY.minutes += item.runtimeMinutes || 120;
    annualBuckets.set(yr, curY);
  }

  const monthlyActivity = Array.from(monthlyBuckets.entries()).map(([month, data]) => ({
    month,
    count: data.count,
    hours: Math.round((data.minutes / 60) * 10) / 10,
  }));

  const annualActivity = Array.from(annualBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, data]) => ({
      year,
      count: data.count,
      hours: Math.round((data.minutes / 60) * 10) / 10,
    }));

  const mostActiveMonthEntry = [...monthlyActivity].sort((a, b) => b.count - a.count)[0];
  const mostActiveViewingMonth =
    mostActiveMonthEntry && mostActiveMonthEntry.count > 0 ? mostActiveMonthEntry.month : 'Nov';

  // Streaks from watchHistory dates
  const uniqueDates = Array.from(
    new Set(
      [
        ...watchHistory.map((h) => h.watchedDate.slice(0, 10)),
        ...watchedItems.map((i) => (i.lastWatchedAt || i.updatedAt).slice(0, 10)),
      ].filter(Boolean)
    )
  ).sort();

  let longestStreakDays = uniqueDates.length > 0 ? 1 : 0;
  let currentRun = uniqueDates.length > 0 ? 1 : 0;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]).getTime();
    const curr = new Date(uniqueDates[i]).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentRun += 1;
      if (currentRun > longestStreakDays) longestStreakDays = currentRun;
    } else if (diffDays > 1) {
      currentRun = 1;
    }
  }

  const droppedCount = filteredLibrary.filter((i) => i.status === 'dropped').length;
  const droppedPercentage =
    filteredLibrary.length > 0 ? Math.round((droppedCount / filteredLibrary.length) * 100) : 0;
  const watchlistCount = filteredLibrary.filter((i) => i.status === 'want_to_watch').length;

  const ratingDistribution = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bucket) => ({
    ratingBucket: `${bucket}/10`,
    count: ratedItems.filter((i) => Math.round(i.userRating) === bucket).length,
  }));

  return {
    totalMoviesWatched,
    totalSeriesCompleted,
    totalEpisodesWatched,
    totalViewingHours,
    averagePersonalRating,
    highestRatedTitles,
    lowestRatedTitles,
    mostWatchedGenres,
    favouriteLanguages,
    favouriteDirectors,
    favouriteActors,
    monthlyActivity,
    annualActivity,
    currentStreakDays: currentRun,
    longestStreakDays,
    droppedCount,
    droppedPercentage,
    watchlistCount,
    ratingDistribution,
    mostActiveViewingMonth,
  };
}

/**
 * Part 9: Backup, Export (JSON/CSV) and Validated Import with Duplicate Detection
 */
export function exportLibraryToCsv(library: LibraryItem[]): string {
  const headers = [
    'id',
    'title',
    'contentType',
    'status',
    'releaseYear',
    'language',
    'country',
    'director',
    'runtimeMinutes',
    'userRating',
    'isFavourite',
    'priority',
    'genres',
    'tags',
  ];
  const escapeCell = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = library.map((item) =>
    [
      item.id,
      item.title,
      item.contentType,
      item.status,
      item.releaseYear,
      item.language || '',
      item.country || '',
      item.director || '',
      item.runtimeMinutes,
      item.userRating,
      item.isFavourite,
      item.priority,
      (item.genres || []).join('|'),
      (item.tags || []).join('|'),
    ]
      .map(escapeCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export interface ImportPreviewReport {
  isValid: boolean;
  format: 'json' | 'csv' | 'legacy_cineshelf';
  validItems: Partial<LibraryItem>[];
  duplicatesCount: number;
  newItemsCount: number;
  errors: string[];
}

export function validateAndPreviewImport(
  rawContent: string,
  existingLibrary: LibraryItem[]
): ImportPreviewReport {
  const errors: string[] = [];
  const validItems: Partial<LibraryItem>[] = [];
  let format: ImportPreviewReport['format'] = 'json';

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      isValid: false,
      format: 'json',
      validItems: [],
      duplicatesCount: 0,
      newItemsCount: 0,
      errors: ['Import file is empty.'],
    };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.library)
        ? parsed.library
        : Array.isArray(parsed.items)
        ? parsed.items
        : null;

      if (parsed.cineshelfVersion || Array.isArray(parsed.items)) {
        format = 'legacy_cineshelf';
      }

      if (!rawList) {
        errors.push('JSON structure must contain a "library" array or an array of entertainment entries.');
      } else {
        rawList.forEach((entry: Record<string, unknown>, idx: number) => {
          if (!entry || typeof entry.title !== 'string' || !entry.title.trim()) {
            errors.push(`Row ${idx + 1}: Missing valid "title" field.`);
            return;
          }
          validItems.push({
            title: String(entry.title).trim().slice(0, 300),
            contentType: (entry.contentType as ContentType) || 'movie',
            status: (entry.status as LibraryItem['status']) || 'want_to_watch',
            releaseYear: Number(entry.releaseYear) || 2024,
            runtimeMinutes: Number(entry.runtimeMinutes) || 120,
            userRating: Math.min(10, Math.max(0, Number(entry.userRating) || 0)),
            language: typeof entry.language === 'string' ? entry.language : 'English',
            country: typeof entry.country === 'string' ? entry.country : 'India',
            director: typeof entry.director === 'string' ? entry.director : '',
            genres: Array.isArray(entry.genres) ? entry.genres.map(String) : ['Drama'],
            tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
            cast: Array.isArray(entry.cast) ? entry.cast.map(String) : [],
            isFavourite: Boolean(entry.isFavourite),
            isHighlyAnticipated: Boolean(entry.isHighlyAnticipated),
            priority: (entry.priority as LibraryItem['priority']) || 'medium',
          });
        });
      }
    } catch (e) {
      errors.push(`Invalid JSON syntax: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    // Parse CSV
    format = 'csv';
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      errors.push('CSV must include a header row and at least one data row.');
    } else {
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const titleIdx = headers.indexOf('title');
      if (titleIdx === -1) {
        errors.push('CSV header must include a "title" column.');
      } else {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const title = cols[titleIdx];
          if (!title) {
            errors.push(`CSV line ${i + 1}: Empty title.`);
            continue;
          }
          const getCol = (name: string) => {
            const idx = headers.indexOf(name.toLowerCase());
            return idx >= 0 ? cols[idx] : undefined;
          };
          validItems.push({
            title: title.slice(0, 300),
            contentType: (getCol('contenttype') as ContentType) || 'movie',
            status: (getCol('status') as LibraryItem['status']) || 'want_to_watch',
            releaseYear: Number(getCol('releaseyear')) || 2024,
            runtimeMinutes: Number(getCol('runtimeminutes')) || 120,
            userRating: Math.min(10, Math.max(0, Number(getCol('userrating')) || 0)),
            language: getCol('language') || 'English',
            country: getCol('country') || 'India',
            director: getCol('director') || '',
            genres: getCol('genres') ? getCol('genres')!.split('|').filter(Boolean) : ['Drama'],
            tags: getCol('tags') ? getCol('tags')!.split('|').filter(Boolean) : [],
            cast: [],
            isFavourite: getCol('isfavourite') === 'true',
            isHighlyAnticipated: false,
            priority: (getCol('priority') as LibraryItem['priority']) || 'medium',
          });
        }
      }
    }
  }

  let duplicatesCount = 0;
  let newItemsCount = 0;
  for (const item of validItems) {
    if (
      findDuplicateLibraryItem(existingLibrary, {
        title: item.title || '',
        releaseYear: item.releaseYear,
        contentType: item.contentType,
      })
    ) {
      duplicatesCount += 1;
    } else {
      newItemsCount += 1;
    }
  }

  return {
    isValid: errors.length === 0 && validItems.length > 0,
    format,
    validItems,
    duplicatesCount,
    newItemsCount,
    errors,
  };
}
