import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOverseerrMediaStatus,
  requestMedia,
  getStatusDisplayText,
} from "../../services/overseerr";

const mockLoadSettings = vi.fn();
vi.mock("../../services/settings", () => ({
  loadSettings: () => mockLoadSettings(),
}));

vi.mock("../../services/cache", () => ({
  cacheService: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const enabledSettings = {
  overseerrEnabled: true,
  overseerrUrl: "http://overseerr.local",
  overseerrApiKey: "test-api-key",
};

describe("overseerr service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSettings.mockReturnValue(enabledSettings);
  });

  describe("getOverseerrMediaStatus", () => {
    it("returns null when overseerr is disabled", async () => {
      mockLoadSettings.mockReturnValue({ overseerrEnabled: false });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toBeNull();
    });

    it("returns null when url is missing", async () => {
      mockLoadSettings.mockReturnValue({ overseerrEnabled: true, overseerrUrl: "", overseerrApiKey: "key" });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toBeNull();
    });

    it("returns available status", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 5, requests: [] } }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "available", canRequest: false });
    });

    it("returns partially_available status", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 4, requests: [] } }),
      });
      const result = await getOverseerrMediaStatus(123, "tv");
      expect(result).toEqual({ status: "partially_available", canRequest: true });
    });

    it("returns processing status", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 3, requests: [] } }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "processing", canRequest: false });
    });

    it("returns pending when request is pending", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 1, requests: [{ id: 10, status: 1 }] } }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "pending", requestId: 10, canRequest: false });
    });

    it("returns approved when request is approved", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 1, requests: [{ id: 11, status: 2 }] } }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "approved", requestId: 11, canRequest: false });
    });

    it("returns declined when request is declined", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 1, requests: [{ id: 12, status: 3 }] } }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "declined", requestId: 12, canRequest: true });
    });

    it("returns not_requested when no media info", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: null }),
      });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "not_requested", canRequest: true });
    });

    it("returns not_requested on 404", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toEqual({ status: "not_requested", canRequest: true });
    });

    it("returns null on non-404 error", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toBeNull();
    });

    it("returns null on fetch exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const result = await getOverseerrMediaStatus(123, "movie");
      expect(result).toBeNull();
    });

    it("uses /tv/ endpoint for tv type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mediaInfo: { status: 5, requests: [] } }),
      });
      await getOverseerrMediaStatus(456, "tv");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/tv/456"),
        expect.any(Object),
      );
    });
  });

  describe("requestMedia", () => {
    it("returns error when not configured", async () => {
      mockLoadSettings.mockReturnValue({ overseerrEnabled: false });
      const result = await requestMedia(123, "movie");
      expect(result).toEqual({ success: false, error: "Overseerr not configured" });
    });

    it("returns success on successful movie request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 99 }),
      });
      const result = await requestMedia(123, "movie");
      expect(result).toEqual({ success: true, requestId: 99, status: "pending" });
    });

    it("fetches seasons for TV requests", async () => {
      // First call: fetch TV details for seasons
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ seasons: [{ seasonNumber: 0 }, { seasonNumber: 1 }, { seasonNumber: 2 }] }),
        })
        // Second call: the actual request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 100 }),
        });
      const result = await requestMedia(789, "tv");
      expect(result.success).toBe(true);
      // Verify the POST body includes seasons (excluding season 0)
      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1].body);
      expect(body.seasons).toEqual([1, 2]);
    });

    it("returns error on failed request", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Bad request" }),
      });
      const result = await requestMedia(123, "movie");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Bad request");
    });

    it("returns error on fetch exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network fail"));
      const result = await requestMedia(123, "movie");
      expect(result).toEqual({ success: false, error: "Network fail" });
    });
  });

  describe("getStatusDisplayText", () => {
    it("returns correct text for each status", () => {
      expect(getStatusDisplayText("not_requested")).toBe("Request");
      expect(getStatusDisplayText("pending")).toBe("Pending");
      expect(getStatusDisplayText("approved")).toBe("Approved");
      expect(getStatusDisplayText("declined")).toBe("Declined");
      expect(getStatusDisplayText("processing")).toBe("Processing");
      expect(getStatusDisplayText("partially_available")).toBe("Partial");
      expect(getStatusDisplayText("available")).toBe("Available");
      expect(getStatusDisplayText("unknown")).toBe("Unknown");
    });
  });
});
