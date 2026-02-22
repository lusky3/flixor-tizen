import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUpdateCheck } from "../../hooks/useUpdateCheck";

const mockCheckForUpdate = vi.fn();
vi.mock("../../services/version", () => ({
  checkForUpdate: (...args: unknown[]) => mockCheckForUpdate(...args),
}));

describe("useUpdateCheck", () => {
  beforeEach(() => {
    mockCheckForUpdate.mockReset();
  });

  it("returns no update initially", () => {
    mockCheckForUpdate.mockResolvedValue({ hasUpdate: false, latestVersion: "1.0.0" });
    const { result } = renderHook(() => useUpdateCheck());
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.version).toBeNull();
  });

  it("detects available update", async () => {
    mockCheckForUpdate.mockResolvedValue({ hasUpdate: true, latestVersion: "2.0.0" });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });
    expect(result.current.version).toBe("2.0.0");
  });

  it("dismiss hides the update", async () => {
    mockCheckForUpdate.mockResolvedValue({ hasUpdate: true, latestVersion: "2.0.0" });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.hasUpdate).toBe(false);
  });

  it("handles fetch error gracefully", async () => {
    mockCheckForUpdate.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useUpdateCheck());
    // Should not throw, just stay false
    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(false);
    });
  });
});
