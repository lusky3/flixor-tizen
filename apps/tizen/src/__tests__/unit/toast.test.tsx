import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastContainer } from "../../components/Toast";
import { ToastContext } from "../../hooks/useToast";
import type { Toast } from "../../hooks/useToast";

function renderWithToasts(toasts: Toast[], dismissToast = vi.fn()) {
  return render(
    <ToastContext.Provider value={{ toasts, showToast: vi.fn(), dismissToast }}>
      <ToastContainer />
    </ToastContext.Provider>,
  );
}

describe("ToastContainer", () => {
  it("renders nothing when no toasts", () => {
    const { container } = renderWithToasts([]);
    expect(container.innerHTML).toBe("");
  });

  it("renders success toast with checkmark icon", () => {
    renderWithToasts([{ id: 1, message: "Saved!", variant: "success" }]);
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders error toast with X icon", () => {
    renderWithToasts([{ id: 1, message: "Failed", variant: "error" }]);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("renders info toast with info icon", () => {
    renderWithToasts([{ id: 1, message: "Note", variant: "info" }]);
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("renders multiple toasts", () => {
    renderWithToasts([
      { id: 1, message: "First", variant: "info" },
      { id: 2, message: "Second", variant: "success" },
    ]);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("calls dismissToast when toast is clicked", () => {
    const dismiss = vi.fn();
    renderWithToasts([{ id: 42, message: "Click me", variant: "info" }], dismiss);
    fireEvent.click(screen.getByText("Click me"));
    expect(dismiss).toHaveBeenCalledWith(42);
  });

  it("has role=status for accessibility", () => {
    renderWithToasts([{ id: 1, message: "Test", variant: "info" }]);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
