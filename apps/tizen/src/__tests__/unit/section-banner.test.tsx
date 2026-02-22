import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionBanner } from "../../components/SectionBanner";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

let capturedOnEnterPress: (() => void) | undefined;
vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => {
    capturedOnEnterPress = opts?.onEnterPress;
    return { ref: { current: null }, focused: false };
  },
}));

// ── Tests ──────────────────────────────────────────────────────────────

describe("SectionBanner", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    capturedOnEnterPress = undefined;
  });

  it("renders message and CTA text", () => {
    render(
      <SectionBanner message="Connect your server" cta="Settings" to="/settings" />,
    );
    expect(screen.getByText("Connect your server")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <SectionBanner title="Get Started" message="Set up now" cta="Go" to="/setup" />,
    );
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("does not render title element when title is omitted", () => {
    const { container } = render(
      <SectionBanner message="No title here" cta="OK" to="/ok" />,
    );
    expect(container.querySelector("h3")).toBeNull();
  });

  it("navigates to `to` path on CTA Enter press", () => {
    render(
      <SectionBanner message="Link Plex" cta="Go to Settings" to="/settings" />,
    );
    expect(capturedOnEnterPress).toBeDefined();
    capturedOnEnterPress!();
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("CTA button has role='button'", () => {
    render(
      <SectionBanner message="msg" cta="Click me" to="/x" />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("renders as a section element", () => {
    const { container } = render(
      <SectionBanner message="msg" cta="CTA" to="/path" />,
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });
});
