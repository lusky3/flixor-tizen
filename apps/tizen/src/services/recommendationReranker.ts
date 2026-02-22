// --- Interfaces ---

export interface RerankerCandidate {
  id: string;
  title: string;
  genres?: string[];
  cast?: string[];
  popularity?: number;
}

export interface RerankerContext {
  likedGenres: string[];
  likedCast: string[];
}

// --- Internal Types ---

interface ScoredCandidate extends RerankerCandidate {
  _score: number;
}

// --- Functions ---

/**
 * Internal scoring: genreMatches * 2 + castMatches * 3 + popularity * 0.1
 *
 * - genreMatches = count of candidate.genres that appear in context.likedGenres (case-insensitive)
 * - castMatches = count of candidate.cast that appear in context.likedCast (case-insensitive)
 * - popularity defaults to 0 when missing
 */
export function scoreCandidate(
  candidate: RerankerCandidate,
  context: RerankerContext,
): number {
  const likedGenresLower = context.likedGenres.map((g) => g.toLowerCase());
  const likedCastLower = context.likedCast.map((c) => c.toLowerCase());

  const genres = candidate.genres ?? [];
  const cast = candidate.cast ?? [];
  const popularity = candidate.popularity ?? 0;

  const genreMatches = genres.filter((g) =>
    likedGenresLower.includes(g.toLowerCase()),
  ).length;

  const castMatches = cast.filter((c) =>
    likedCastLower.includes(c.toLowerCase()),
  ).length;

  return genreMatches * 2 + castMatches * 3 + popularity * 0.1;
}

/**
 * Score and sort candidates by affinity. Returns a new array sorted by
 * descending score. Original order is preserved for ties (stable sort).
 *
 * Internal `_score` is stripped from the output — only original
 * RerankerCandidate fields are returned.
 */
export function rerankCandidates(
  candidates: RerankerCandidate[],
  context: RerankerContext,
): RerankerCandidate[] {
  if (candidates.length === 0) return [];

  // Score each candidate, preserving original index for stable sort
  const scored: ScoredCandidate[] = candidates.map((c) => ({
    ...c,
    _score: scoreCandidate(c, context),
  }));

  // Stable sort descending by score (Array.prototype.sort is stable in modern engines)
  scored.sort((a, b) => b._score - a._score);

  // Strip _score from output
  return scored.map(({ _score, ...rest }) => rest);
}
