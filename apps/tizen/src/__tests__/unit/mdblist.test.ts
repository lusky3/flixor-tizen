import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMDBListRatings,
  formatRating,
  getSourceName,
} from "../../services/mdblist";

const mockLoadSettings = vi.fn();
vi.mock("../../services/settings", () => ({
  loadSettings: () => mockLoadSettings(),
}));

vi.mock("../../services/cache", () => ({
  cacheService: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("mdblist service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSettings.mockReturnValue({
      mdblistEnabled: true,
      mdblistApiKey: "test-key",
    });
  });

  describe("getMDBListRatings", () => {
    it("returns null when disabled", async () => {
      mockLoadSettings.mockReturnValue({ mdblistEnabled: false });
      const result = await getMDBListRatings("tt1234567", "movie");
      expect(result).toBeNull();
    });

    it("returns null when api key missing", async () => {
      mockLoadSettings.mockReturnValue({ mdblistEnabled: true, mdblistApiKey: "" });
      const result = await getMDBListRatings("tt1234567", "movie");
      expect(result).toBeNull();
    });

    it("fetches ratings for all sources", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ratings: [{ rating: 8.5 }] }),
      });
      const result = await getMDBListRatings("tt1234567", "movie");
      expect(result).toBeTruthy();
      // Should have called fetch 7 times (one per rating type)
      expect(mockFetch).toHaveBeenCalledTimes(7);
    });

    it("handles fetch failures gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const result = await getMDBListRatings("tt1234567", "movie");
      // Each fetchRating catches internally, so result is empty object
      expect(result).toEqual({});
    });

    it("handles non-ok responses", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const result = await getMDBListRatings("tt1234567", "movie");
      expect(result).toEqual({});
    });

    it("handles missing rating in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ratings: [{}] }),
      });
      const result = await getMDBListRatings("tt1234567", "show");
      expect(result).toEqual({});
    });

    it("prepends tt to imdb id if missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ratings: [{ rating: 7.0 }] }),
      });
      await getMDBListRatings("1234567", "movie");
      const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCallBody.ids[0]).toBe("tt1234567");
    });
  });

  describe("formatRating", () => {
    it("returns null for undefined rating", () => {
      expect(formatRating(undefined, "imdb")).toBeNull();
    });

    it("formats percentage sources", () => {
      expect(formatRating(85, "tomatoes")).toBe("85%");
      expect(formatRating(72.3, "audience")).toBe("72%");
      expect(formatRating(90, "metacritic")).toBe("90%");
    });

    it("formats decimal sources", () => {
      expect(formatRating(8.5, "imdb")).toBe("8.5");
      expect(formatRating(7.123, "tmdb")).toBe("7.1");
      expect(formatRating(4.0, "trakt")).toBe("4.0");
      expect(formatRating(3.8, "letterboxd")).toBe("3.8");
    });
  });

  describe("getSourceName", () => {
    it("returns display names for known sources", () => {
      expect(getSourceName("trakt")).toBe("Trakt");
      expect(getSourceName("imdb")).toBe("IMDb");
      expect(getSourceName("tmdb")).toBe("TMDB");
      expect(getSourceName("letterboxd")).toBe("Letterboxd");
      expect(getSourceName("tomatoes")).toBe("RT Critics");
      expect(getSourceName("audience")).toBe("RT Audience");
      expect(getSourceName("metacritic")).toBe("Metacritic");
    });

    it("returns raw source for unknown sources", () => {
      expect(getSourceName("unknown")).toBe("unknown");
    });
  });
});
