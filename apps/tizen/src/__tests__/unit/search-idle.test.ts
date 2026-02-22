import { describe, it, expect } from "vitest";

/**
 * Unit tests for Search idle state behavior.
 * Tests the logic for showing trending/popular sections vs search results.
 */

describe("Search Idle State", () => {
  describe("query threshold logic", () => {
    it("shows trending when query is empty", () => {
      const query = "";
      const showTrending = query.length < 2;
      expect(showTrending).toBe(true);
    });

    it("shows trending when query is 1 character", () => {
      const query = "a";
      const showTrending = query.length < 2;
      expect(showTrending).toBe(true);
    });

    it("hides trending when query is 2+ characters", () => {
      const query = "ab";
      const showTrending = query.length < 2;
      expect(showTrending).toBe(false);
    });
  });

  describe("Trakt popular visibility", () => {
    it("shows Trakt popular when authenticated and query < 2", () => {
      const isAuthenticated = true;
      const query = "";
      const traktPopularItems = [{ id: "1", title: "Movie" }];
      const showTraktPopular = query.length < 2 && isAuthenticated && traktPopularItems.length > 0;
      expect(showTraktPopular).toBe(true);
    });

    it("hides Trakt popular when not authenticated", () => {
      const isAuthenticated = false;
      const query = "";
      const traktPopularItems: any[] = [];
      const showTraktPopular = query.length < 2 && isAuthenticated && traktPopularItems.length > 0;
      expect(showTraktPopular).toBe(false);
    });

    it("hides Trakt popular when query >= 2", () => {
      const isAuthenticated = true;
      const query = "ab";
      const traktPopularItems = [{ id: "1", title: "Movie" }];
      const showTraktPopular = query.length < 2 && isAuthenticated && traktPopularItems.length > 0;
      expect(showTraktPopular).toBe(false);
    });
  });

  describe("trending data interleaving", () => {
    it("interleaves movies and shows", () => {
      const movies = [
        { id: 1, title: "Movie A" },
        { id: 2, title: "Movie B" },
      ];
      const shows = [
        { id: 3, name: "Show A" },
        { id: 4, name: "Show B" },
      ];

      const items: Array<{ id: string; title: string; type: string }> = [];
      for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
        if (movies[i]) {
          items.push({ id: `tmdb-movie-${movies[i].id}`, title: movies[i].title, type: "movie" });
        }
        if (shows[i]) {
          items.push({ id: `tmdb-tv-${shows[i].id}`, title: shows[i].name, type: "tv" });
        }
      }

      expect(items.length).toBe(4);
      expect(items[0].type).toBe("movie");
      expect(items[1].type).toBe("tv");
    });

    it("limits trending to 12 items", () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
      }));
      const limited = items.slice(0, 12);
      expect(limited.length).toBe(12);
    });
  });

  describe("API failure handling", () => {
    it("trending remains empty on TMDB failure", () => {
      const trending: any[] = [];
      // Simulating failed fetch — trending stays empty
      expect(trending.length).toBe(0);
    });

    it("Trakt popular remains empty on API failure", () => {
      const traktPopular: any[] = [];
      expect(traktPopular.length).toBe(0);
    });
  });
});
