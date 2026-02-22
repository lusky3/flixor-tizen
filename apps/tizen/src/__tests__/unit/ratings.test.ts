import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRatings, invalidateRatings } from "../../services/ratings";

const mockLoadSettings = vi.fn();
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockCacheInvalidate = vi.fn();
const mockGetMDBListRatings = vi.fn();
const mockFormatRating = vi.fn();
const mockGetSourceName = vi.fn();

vi.mock("../../services/settings", () => ({
  loadSettings: () => mockLoadSettings(),
}));

vi.mock("../../services/cache", () => ({
  cacheService: {
    get: (...a: unknown[]) => mockCacheGet(...a),
    set: (...a: unknown[]) => mockCacheSet(...a),
    invalidate: (...a: unknown[]) => mockCacheInvalidate(...a),
  },
}));

vi.mock("../../services/mdblist", () => ({
  getMDBListRatings: (...a: unknown[]) => mockGetMDBListRatings(...a),
  formatRating: (...a: unknown[]) => mockFormatRating(...a),
  getSourceName: (...a: unknown[]) => mockGetSourceName(...a),
}));

function defaultSettings(overrides = {}) {
  return {
    mdblistEnabled: true,
    mdblistApiKey: "test-key",
    showImdb: true,
    showRt: true,
    showLetterboxd: true,
    showMetacritic: true,
    showTmdbRating: true,
    showTraktRating: true,
    ...overrides,
  };
}

describe("ratings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSettings.mockReturnValue(defaultSettings());
    mockCacheGet.mockReturnValue(null);
    mockFormatRating.mockImplementation((score: number) => `${score}/10`);
    mockGetSourceName.mockImplementation((s: string) => s.toUpperCase());
  });

  it("returns empty when mdblist is disabled", async () => {
    mockLoadSettings.mockReturnValue(defaultSettings({ mdblistEnabled: false }));
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toEqual([]);
  });

  it("returns empty when no API key", async () => {
    mockLoadSettings.mockReturnValue(defaultSettings({ mdblistApiKey: "" }));
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toEqual([]);
  });

  it("returns empty when no imdbId", async () => {
    const result = await getRatings(123, "movie");
    expect(result.ratings).toEqual([]);
  });

  it("returns cached result filtered by visibility", async () => {
    const cached = {
      ratings: [
        { source: "imdb", label: "IMDB", score: 8.5, displayValue: "8.5/10" },
        { source: "tmdb", label: "TMDB", score: 7.0, displayValue: "7.0/10" },
      ],
      tmdbId: 123,
      mediaType: "movie" as const,
    };
    mockCacheGet.mockReturnValue(cached);
    mockLoadSettings.mockReturnValue(defaultSettings({ showTmdbRating: false }));

    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toHaveLength(1);
    expect(result.ratings[0].source).toBe("imdb");
  });

  it("fetches from MDBList and caches result", async () => {
    mockGetMDBListRatings.mockResolvedValue({ imdb: 8.5, tmdb: 7.0 });
    const result = await getRatings(123, "movie", "tt123");
    expect(mockGetMDBListRatings).toHaveBeenCalledWith("tt123", "movie");
    expect(result.ratings).toHaveLength(2);
    expect(mockCacheSet).toHaveBeenCalled();
  });

  it("returns empty when MDBList returns null", async () => {
    mockGetMDBListRatings.mockResolvedValue(null);
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toEqual([]);
  });

  it("returns empty on fetch error", async () => {
    mockGetMDBListRatings.mockRejectedValue(new Error("Network"));
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toEqual([]);
  });

  it("skips ratings with no display value", async () => {
    mockGetMDBListRatings.mockResolvedValue({ imdb: 8.5 });
    mockFormatRating.mockReturnValue("");
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings).toEqual([]);
  });

  it("filters by source visibility settings", async () => {
    mockGetMDBListRatings.mockResolvedValue({ imdb: 8.5, tmdb: 7.0 });
    mockLoadSettings.mockReturnValue(defaultSettings({ showImdb: false }));
    const result = await getRatings(123, "movie", "tt123");
    expect(result.ratings.find((r) => r.source === "imdb")).toBeUndefined();
  });

  it("invalidateRatings calls cache invalidate", () => {
    invalidateRatings(123, "movie");
    expect(mockCacheInvalidate).toHaveBeenCalledWith("ratings:movie:123");
  });
});
