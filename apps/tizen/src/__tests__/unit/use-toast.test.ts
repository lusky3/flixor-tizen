import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToastState } from "../../hooks/useToast";

describe("useToastState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty toasts", () => {
    const { result } = renderHook(() => useToastState());
    expect(result.current.toasts).toEqual([]);
  });

  it("adds a toast with showToast", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("Hello", "success");
    });
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe("Hello");
    expect(result.current.toasts[0].variant).toBe("success");
  });

  it("defaults to info variant", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("Info toast");
    });
    expect(result.current.toasts[0].variant).toBe("info");
  });

  it("dismisses a toast by id", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("Toast 1");
    });
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.dismissToast(id);
    });
    expect(result.current.toasts.length).toBe(0);
  });

  it("auto-dismisses after 3 seconds", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("Auto dismiss");
    });
    expect(result.current.toasts.length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toasts.length).toBe(0);
  });

  it("supports multiple toasts", () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.showToast("First", "info");
      result.current.showToast("Second", "error");
    });
    expect(result.current.toasts.length).toBe(2);
  });
});
