import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeScreenSettings } from "./HomeScreenSettings";
import { PlaybackSettings } from "./PlaybackSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { DEFAULT_SETTINGS, type TizenSettings } from "../../services/settings";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

function settings(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

// ── HomeScreenSettings ──────────────────────────────────────────────

describe("HomeScreenSettings", () => {
  it("renders all row visibility toggles", () => {
    render(
      <HomeScreenSettings settings={settings()} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
    expect(screen.getByText("Continue Watching")).toBeInTheDocument();
    expect(screen.getByText("Trending Rows")).toBeInTheDocument();
    expect(screen.getByText("Trakt Rows")).toBeInTheDocument();
    expect(screen.getByText("Recently Added")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("Genre Rows")).toBeInTheDocument();
  });

  it("calls onChange when a toggle is clicked", () => {
    const onChange = vi.fn();
    render(
      <HomeScreenSettings settings={settings()} onChange={onChange} />,
    );
    // Hero Section is ON by default — clicking should toggle it off
    fireEvent.click(screen.getByText("Hero Section").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showHeroSection", false);
  });

  it("disables discovery-dependent rows when discoveryDisabled is true", () => {
    render(
      <HomeScreenSettings
        settings={settings({ discoveryDisabled: true })}
        onChange={vi.fn()}
      />,
    );
    const trendingBtn = screen.getByText("Trending Rows").closest("button")!;
    const traktBtn = screen.getByText("Trakt Rows").closest("button")!;
    expect(trendingBtn).toBeDisabled();
    expect(traktBtn).toBeDisabled();
  });
});

// ── PlaybackSettings ────────────────────────────────────────────────

describe("PlaybackSettings", () => {
  it("renders episode layout, auto-play, quality, and stats HUD settings", () => {
    render(
      <PlaybackSettings settings={settings()} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Episode Layout")).toBeInTheDocument();
    expect(screen.getByText("Auto-play Next Episode")).toBeInTheDocument();
    expect(screen.getByText("Preferred Resolution")).toBeInTheDocument();
    expect(screen.getByText("Preferred Quality")).toBeInTheDocument();
    expect(screen.getByText("Playback Stats HUD")).toBeInTheDocument();
  });

  it("calls onChange when auto-play toggle is clicked", () => {
    const onChange = vi.fn();
    render(
      <PlaybackSettings settings={settings()} onChange={onChange} />,
    );
    fireEvent.click(
      screen.getByText("Auto-play Next Episode").closest("button")!,
    );
    // autoPlayNext defaults to true, so clicking toggles to false
    expect(onChange).toHaveBeenCalledWith("autoPlayNext", false);
  });

  it("cycles episode layout on click", () => {
    const onChange = vi.fn();
    render(
      <PlaybackSettings
        settings={settings({ episodeLayout: "horizontal" })}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Episode Layout").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("episodeLayout", "vertical");
  });
});

// ── IntegrationSettings ─────────────────────────────────────────────

describe("IntegrationSettings", () => {
  it("renders MDBList, Overseerr, and TMDB sections", () => {
    render(
      <IntegrationSettings settings={settings()} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Enable MDBList Ratings")).toBeInTheDocument();
    expect(screen.getByText("Enable Overseerr")).toBeInTheDocument();
    expect(screen.getByText("Enable TMDB")).toBeInTheDocument();
  });

  it("disables MDBList API key input when MDBList is disabled", () => {
    render(
      <IntegrationSettings
        settings={settings({ mdblistEnabled: false })}
        onChange={vi.fn()}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    // First text input is MDBList API key
    const mdblistInput = inputs.find(
      (el) => (el as HTMLInputElement).placeholder === "Enter MDBList API key",
    );
    expect(mdblistInput).toBeDisabled();
  });

  it("disables Overseerr fields when Overseerr is disabled", () => {
    render(
      <IntegrationSettings
        settings={settings({ overseerrEnabled: false })}
        onChange={vi.fn()}
      />,
    );
    const urlInput = screen.getByPlaceholderText(
      "https://overseerr.example.com",
    );
    const keyInput = screen.getByPlaceholderText("Enter Overseerr API key");
    expect(urlInput).toBeDisabled();
    expect(keyInput).toBeDisabled();
  });

  it("disables TMDB toggles when discovery is disabled", () => {
    render(
      <IntegrationSettings
        settings={settings({ discoveryDisabled: true })}
        onChange={vi.fn()}
      />,
    );
    const tmdbBtn = screen.getByText("Enable TMDB").closest("button")!;
    expect(tmdbBtn).toBeDisabled();
  });

  it("calls onChange when MDBList toggle is clicked", () => {
    const onChange = vi.fn();
    render(
      <IntegrationSettings
        settings={settings({ mdblistEnabled: false })}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByText("Enable MDBList Ratings").closest("button")!,
    );
    expect(onChange).toHaveBeenCalledWith("mdblistEnabled", true);
  });
});

// ── AppearanceSettings ──────────────────────────────────────────────

describe("AppearanceSettings", () => {
  it("renders hero section and discovery mode toggles", () => {
    render(
      <AppearanceSettings settings={settings()} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
    expect(screen.getByText("Discovery Mode")).toBeInTheDocument();
  });

  it("calls onChange to disable discovery when toggle is clicked off", () => {
    const onChange = vi.fn();
    // discoveryDisabled is falsy by default → Discovery Mode shows ON
    render(
      <AppearanceSettings settings={settings()} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Discovery Mode").closest("button")!);
    // Clicking ON → OFF means discoveryDisabled becomes true
    expect(onChange).toHaveBeenCalledWith("discoveryDisabled", true);
  });
});
