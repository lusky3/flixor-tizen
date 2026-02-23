/** Normalize common rating string variations to canonical form. */
export function normalizeRating(rating: string): string {
  const normalized = rating.toUpperCase().trim();
  const mappings: Record<string, string> = {
    TVPG: "TV-PG",
    TVMA: "TV-MA",
    TV14: "TV-14",
    TVY: "TV-Y",
    TVY7: "TV-Y7",
    TVG: "TV-G",
    PG13: "PG-13",
    NC17: "NC-17",
    NOTRATED: "NR",
    "NOT RATED": "NR",
    UNRATED: "NR",
  };
  return mappings[normalized.replace(/[\s-]/g, "")] || normalized;
}

/** Returns true for ratings that indicate mature content. */
export function isMatureRating(rating?: string): boolean {
  if (!rating) return false;
  const normalized = normalizeRating(rating);
  return ["R", "NC-17", "TV-MA", "TV-14"].includes(normalized);
}
