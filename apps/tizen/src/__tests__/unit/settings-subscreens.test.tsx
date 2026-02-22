import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CatalogSettings } from "../../components/settings/CatalogSettings";
import { ContinueWatchingSettings } from "../../components/settings/ContinueWatchingSettings";
import { DetailsScreenSettings } from "../../components/settings/DetailsScreenSettings";
import { PlexSettings } from "../../components/settings/PlexSettings";
import { TraktSettings } from "../../components/settings/TraktSettings";
import { TMDBSettings } from "../../components/settings/TMDBSettings";
import { MDBListSettings } from "../../components/settings/MDBListSettings";
import { OverseerrSettings } from "../../components/settings/OverseerrSettings";
import { type TizenSettings } from "../../services/settings";

// --- Mocks ---

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

const mockGetLibraries = vi.fn();
const mockSignOutPlex = vi.fn();
const mockIsAuthenticated = vi.fn(() => false);
const mockGenerateDeviceCode = vi.fn();
const mockWaitForDeviceCode = vi.fn();
const mockSignOutTrakt = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: { getLibraries: (...args: unknown[]) => mockGetLibraries(...args) },
    server: { name: "Test Plex Server" },
    currentProfile: { title: "TestUser" },
    signOutPlex: (...args: unknown[]) => mockSignOutPlex(...args),
    trakt: {
      isAuthenticated: () => mockIsAuthenticated(),
      generateDeviceCode: (...args: unknown[]) => mockGenerateDeviceCode(...args),
      waitForDeviceCode: (...args: unknown[]) => mockWaitForDeviceCode(...args),
      signOut: (...args: unknown[]) => mockSignOutTrakt(...args),
    },
  },
}));

// --- Helpers ---

const defaultSettings: TizenSettings = {
  catalogDisabledLibraries: [],
  continueWatchingCardStyle: "landscape",
  continueWatchingCachedStreams: false,
  continueWatchingCacheDuration: 30,
  detailsPageLayout: "tabbed",
  showImdb: true,
  showRtCritics: true,
  showRtAudience: true,
  episodeLayout: "vertical",
  tmdbEnabled: true,
  tmdbBearerToken: "",
  mdblistEnabled: false,
  mdblistApiKey: "",
  overseerrEnabled: false,
  overseerrUrl: "",
  overseerrApiKey: "",
  traktScrobblingEnabled: true,
};

function s(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...defaultSettings, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated.mockReturnValue(false);
});

// ── CatalogSettings ─────────────────────────────────────────────────

describe("CatalogSettings", () => {
  it("renders loading state while fetching libraries", () => {
    mockGetLibraries.mockReturnValue(new Promise(() => {})); // never resolves
    render(<CatalogSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Loading libraries…")).toBeInTheDocument();
  });

  it("renders library toggles after fetch", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
      { key: "2", title: "My Shows", type: "show" },
    ]);
    render(<CatalogSettings settings={s()} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("My Movies")).toBeInTheDocument();
    });
    expect(screen.getByText("My Shows")).toBeInTheDocument();
  });

  it("toggling a library calls onChange with updated catalogDisabledLibraries", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
    ]);
    const onChange = vi.fn();
    render(<CatalogSettings settings={s()} onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByText("My Movies")).toBeInTheDocument();
    });
    // Library is enabled by default — clicking disables it
    fireEvent.click(screen.getByText("My Movies").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("catalogDisabledLibraries", ["1"]);
  });
});

// ── ContinueWatchingSettings ────────────────────────────────────────

describe("ContinueWatchingSettings", () => {
  it("renders card style select", () => {
    render(<ContinueWatchingSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Card Style")).toBeInTheDocument();
    expect(screen.getByText("landscape")).toBeInTheDocument();
  });

  it("renders cache toggle", () => {
    render(<ContinueWatchingSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Cache Streams")).toBeInTheDocument();
  });

  it("cache duration is disabled when cache is off", () => {
    render(
      <ContinueWatchingSettings
        settings={s({ continueWatchingCachedStreams: false })}
        onChange={vi.fn()}
      />,
    );
    const durationBtn = screen.getByText("Cache Duration").closest("button")!;
    expect(durationBtn).toBeDisabled();
  });

  it("cache duration is enabled when cache is on", () => {
    render(
      <ContinueWatchingSettings
        settings={s({ continueWatchingCachedStreams: true })}
        onChange={vi.fn()}
      />,
    );
    const durationBtn = screen.getByText("Cache Duration").closest("button")!;
    expect(durationBtn).not.toBeDisabled();
  });
});

// ── DetailsScreenSettings ───────────────────────────────────────────

describe("DetailsScreenSettings", () => {
  it("renders layout select", () => {
    render(<DetailsScreenSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Details Page Layout")).toBeInTheDocument();
    expect(screen.getByText("tabbed")).toBeInTheDocument();
  });

  it("renders rating toggles", () => {
    render(<DetailsScreenSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("IMDb")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Critics")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Audience")).toBeInTheDocument();
  });

  it("renders episode layout select", () => {
    render(<DetailsScreenSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Episode Layout")).toBeInTheDocument();
    expect(screen.getByText("vertical")).toBeInTheDocument();
  });

  it("calls onChange when RT Critics toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rotten Tomatoes Critics").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showRtCritics", false);
  });
});

// ── PlexSettings ────────────────────────────────────────────────────

describe("PlexSettings", () => {
  it("renders server name", () => {
    render(<PlexSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Test Plex Server")).toBeInTheDocument();
  });

  it("renders sign-out button", () => {
    render(<PlexSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getAllByText("Sign Out").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Disconnect from Plex and return to login")).toBeInTheDocument();
  });
});


// ── TraktSettings ───────────────────────────────────────────────────

describe("TraktSettings", () => {
  it("renders connection status when not connected", () => {
    mockIsAuthenticated.mockReturnValue(false);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Not Connected")).toBeInTheDocument();
    expect(screen.getByText("Link Trakt Account")).toBeInTheDocument();
  });

  it("renders connected status when authenticated", () => {
    mockIsAuthenticated.mockReturnValue(true);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("scrobbling toggle is disabled when not connected", () => {
    mockIsAuthenticated.mockReturnValue(false);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    const scrobbleBtn = screen.getByText("Trakt Scrobbling").closest("button")!;
    expect(scrobbleBtn).toBeDisabled();
  });

  it("scrobbling toggle is enabled when connected", () => {
    mockIsAuthenticated.mockReturnValue(true);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    const scrobbleBtn = screen.getByText("Trakt Scrobbling").closest("button")!;
    expect(scrobbleBtn).not.toBeDisabled();
  });
});

// ── TMDBSettings ────────────────────────────────────────────────────

describe("TMDBSettings", () => {
  it("renders enable toggle", () => {
    render(<TMDBSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable TMDB")).toBeInTheDocument();
  });

  it("renders bearer token input", () => {
    render(<TMDBSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Enter TMDB bearer token")).toBeInTheDocument();
  });

  it("bearer token input is disabled when TMDB is off", () => {
    render(
      <TMDBSettings settings={s({ tmdbEnabled: false })} onChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("Enter TMDB bearer token")).toBeDisabled();
  });
});

// ── MDBListSettings ─────────────────────────────────────────────────

describe("MDBListSettings", () => {
  it("renders enable toggle", () => {
    render(<MDBListSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable MDBList Ratings")).toBeInTheDocument();
  });

  it("renders API key input", () => {
    render(<MDBListSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Enter MDBList API key")).toBeInTheDocument();
  });

  it("API key input is disabled when MDBList is off", () => {
    render(
      <MDBListSettings settings={s({ mdblistEnabled: false })} onChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("Enter MDBList API key")).toBeDisabled();
  });

  it("API key input is enabled when MDBList is on", () => {
    render(
      <MDBListSettings settings={s({ mdblistEnabled: true })} onChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("Enter MDBList API key")).not.toBeDisabled();
  });
});

// ── OverseerrSettings ───────────────────────────────────────────────

describe("OverseerrSettings", () => {
  it("renders enable toggle", () => {
    render(<OverseerrSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable Overseerr")).toBeInTheDocument();
  });

  it("renders URL and API key inputs", () => {
    render(<OverseerrSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).toBeInTheDocument();
  });

  it("URL and API key inputs are disabled when Overseerr is off", () => {
    render(
      <OverseerrSettings settings={s({ overseerrEnabled: false })} onChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).toBeDisabled();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).toBeDisabled();
  });

  it("URL and API key inputs are enabled when Overseerr is on", () => {
    render(
      <OverseerrSettings settings={s({ overseerrEnabled: true })} onChange={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).not.toBeDisabled();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).not.toBeDisabled();
  });
});
