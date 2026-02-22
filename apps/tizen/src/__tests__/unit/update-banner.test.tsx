import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpdateBanner } from "../../components/UpdateBanner";

const mockDismiss = vi.fn();
const mockUseUpdateCheck = vi.fn();

vi.mock("../../hooks/useUpdateCheck", () => ({
  useUpdateCheck: () => mockUseUpdateCheck(),
}));

describe("UpdateBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDismiss.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when no update available", () => {
    mockUseUpdateCheck.mockReturnValue({ hasUpdate: false, version: null, dismiss: mockDismiss });
    const { container } = render(<UpdateBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("renders banner when update is available", () => {
    mockUseUpdateCheck.mockReturnValue({ hasUpdate: true, version: "2.0.0", dismiss: mockDismiss });
    render(<UpdateBanner />);
    expect(screen.getByText("Version 2.0.0 is available")).toBeInTheDocument();
  });

  it("dismiss button calls dismiss", () => {
    mockUseUpdateCheck.mockReturnValue({ hasUpdate: true, version: "2.0.0", dismiss: mockDismiss });
    render(<UpdateBanner />);
    fireEvent.click(screen.getByLabelText("Dismiss update notification"));
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("auto-dismisses after 10 seconds", () => {
    mockUseUpdateCheck.mockReturnValue({ hasUpdate: true, version: "2.0.0", dismiss: mockDismiss });
    render(<UpdateBanner />);
    vi.advanceTimersByTime(10000);
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("has role=status for accessibility", () => {
    mockUseUpdateCheck.mockReturnValue({ hasUpdate: true, version: "2.0.0", dismiss: mockDismiss });
    render(<UpdateBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
