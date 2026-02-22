import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: Record<string, unknown>) => ({
    ref: { current: null },
    focusKey: opts?.focusKey ?? "auto-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {},
}));

// Import after mock
import { useSpatialSection } from "../../hooks/useSpatialNavigation";

describe("useSpatialSection", () => {
  it("returns ref, focusKey, and focusSelf", () => {
    const { result } = renderHook(() => useSpatialSection());
    expect(result.current.ref).toBeDefined();
    expect(result.current.focusKey).toBeDefined();
    expect(typeof result.current.focusSelf).toBe("function");
  });

  it("passes custom focusKey", () => {
    const { result } = renderHook(() => useSpatialSection("my-section"));
    expect(result.current.focusKey).toBe("my-section");
  });
});
