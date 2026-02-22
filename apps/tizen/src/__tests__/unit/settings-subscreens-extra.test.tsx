import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ContinueWatchingSettings } from "../../components/settings/ContinueWatchingSettings";
import { DetailsScreenSettings } from "../../components/settings/DetailsScreenSettings";
import { CatalogSettings } from "../../components/settings/CatalogSettings";
import { PlexSettings } from "../../components/settings/PlexSettings";
import { TraktSettings } from "../../components/settings/TraktSettings";
import { TMDBSettings } from "../../components/settings/TMDBSettings";
import { MDBListSettings } from "../../components/settings/MDBListSettings";
import { OverseerrSettings } from "../../components/settings/OverseerrSettings";
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

const mockSignOutPlex = vi.fn().mockResolvedValue(undefined);
const mockTraktIsAuth = vi.fn().mockReturnValue(false);
const mockGenerateDeviceCode = vi.fn();
const mockWaitForDeviceCode = vi.fn();
const mockTraktSignOut = vi.fn().mockResolvedValue(undefined);
const mockGetLibraries = vi.fn().mockResolvedValue([]);

vi.mock("../../services/flixor", () => ({
  flixor: {
    server: { name: "MyPlexServer" },
    currentProfile: { title: "JohnDoe" },
    signOutPlex: (...a: unknown[]) => mockSignOutPlex(...a),
    trakt: {
      isAuthenticated: () => mockTraktIsAuth(),
      generateDeviceCode: (...a: unknown[]) => mockGenerateDeviceCode(...a),
      waitForDeviceCode: (...a: unknown[]) => mockWaitForDeviceCode(...a),
      signOut: (...a: unknown[]) => mockTraktSignOut(...a),
    },
    plexServer: {
      getLibraries: (...a: unknown[]) => mockGetLibraries(...a),
    },
  },
}));

function settings(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

// ── ContinueWatchingSettings ────────────────────────────────────────

describe("ContinueWatchingSettings", () => {
  it("renders card style and cache settings", () => {
    render(<ContinueWatchingSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Card Style")).toBeInTheDocument();
    expect(screen.getByText("Cache Streams")).toBeInTheDocument();
    expect(screen.getByText("Cache Duration")).toBeInTheDocument();
  });

  it("calls onChange when card style is changed", () => {
    const onChange = vi.fn();
    render(<ContinueWatchingSettings settings={settings()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Card Style").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("continueWatchingCardStyle", expect.any(String));
  });

  it("calls onChange when cache toggle is clicked", () => {
    const onChange = vi.fn();
    render(<ContinueWatchingSettings settings={settings({ continueWatchingCachedStreams: false })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Cache Streams").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("continueWatchingCachedStreams", true);
  });

  it("disables cache duration when cache is off", () => {
    render(<ContinueWatchingSettings settings={settings({ continueWatchingCachedStreams: false })} onChange={vi.fn()} />);
    const durationBtn = screen.getByText("Cache Duration").closest("button")!;
    expect(durationBtn).toBeDisabled();
  });

  it("enables cache duration when cache is on", () => {
    render(<ContinueWatchingSettings settings={settings({ continueWatchingCachedStreams: true })} onChange={vi.fn()} />);
    const durationBtn = screen.getByText("Cache Duration").closest("button")!;
    expect(durationBtn).not.toBeDisabled();
  });

  it("calls onChange with minutes when cache duration is changed", () => {
    const onChange = vi.fn();
    render(<ContinueWatchingSettings settings={settings({ continueWatchingCachedStreams: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Cache Duration").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("continueWatchingCacheDuration", expect.any(Number));
  });
});

// ── DetailsScreenSettings ───────────────────────────────────────────

describe("DetailsScreenSettings", () => {
  it("renders layout, ratings, and episode settings", () => {
    render(<DetailsScreenSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Details Page Layout")).toBeInTheDocument();
    expect(screen.getByText("IMDb")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Critics")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Audience")).toBeInTheDocument();
    expect(screen.getByText("Episode Layout")).toBeInTheDocument();
  });

  it("calls onChange when layout is changed", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={settings()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Details Page Layout").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("detailsPageLayout", expect.any(String));
  });

  it("calls onChange when IMDb toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={settings({ showImdb: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("IMDb").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showImdb", false);
  });

  it("calls onChange when RT Critics toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={settings({ showRtCritics: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rotten Tomatoes Critics").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showRtCritics", false);
  });

  it("calls onChange when RT Audience toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={settings({ showRtAudience: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rotten Tomatoes Audience").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showRtAudience", false);
  });

  it("calls onChange when episode layout is changed", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={settings()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Episode Layout").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("episodeLayout", expect.any(String));
  });
});

// ── CatalogSettings ─────────────────────────────────────────────────

describe("CatalogSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockGetLibraries.mockReturnValue(new Promise(() => {}));
    render(<CatalogSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Loading libraries…")).toBeInTheDocument();
  });

  it("shows no libraries message when empty", async () => {
    mockGetLibraries.mockResolvedValue([]);
    await act(async () => {
      render(<CatalogSettings settings={settings()} onChange={vi.fn()} />);
    });
    expect(screen.getByText(/No libraries found/)).toBeInTheDocument();
  });

  it("renders library toggles after loading", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
      { key: "2", title: "My TV Shows", type: "show" },
    ]);
    await act(async () => {
      render(<CatalogSettings settings={settings()} onChange={vi.fn()} />);
    });
    expect(screen.getByText("My Movies")).toBeInTheDocument();
    expect(screen.getByText("My TV Shows")).toBeInTheDocument();
  });

  it("calls onChange to disable a library", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
    ]);
    const onChange = vi.fn();
    await act(async () => {
      render(<CatalogSettings settings={settings({ catalogDisabledLibraries: [] })} onChange={onChange} />);
    });
    fireEvent.click(screen.getByText("My Movies").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("catalogDisabledLibraries", ["1"]);
  });

  it("calls onChange to enable a disabled library", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
    ]);
    const onChange = vi.fn();
    await act(async () => {
      render(<CatalogSettings settings={settings({ catalogDisabledLibraries: ["1"] })} onChange={onChange} />);
    });
    fireEvent.click(screen.getByText("My Movies").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("catalogDisabledLibraries", []);
  });

  it("handles library fetch error gracefully", async () => {
    mockGetLibraries.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<CatalogSettings settings={settings()} onChange={vi.fn()} />);
    });
    expect(screen.getByText(/No libraries found/)).toBeInTheDocument();
  });

  it("filters out non-movie/show libraries", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
      { key: "3", title: "Music", type: "artist" },
      { key: "4", title: "Photos", type: "photo" },
    ]);
    await act(async () => {
      render(<CatalogSettings settings={settings()} onChange={vi.fn()} />);
    });
    expect(screen.getByText("My Movies")).toBeInTheDocument();
    expect(screen.queryByText("Music")).not.toBeInTheDocument();
    expect(screen.queryByText("Photos")).not.toBeInTheDocument();
  });
});

// ── PlexSettings ────────────────────────────────────────────────────

describe("PlexSettings", () => {
  it("renders server name and profile", () => {
    render(<PlexSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("MyPlexServer")).toBeInTheDocument();
    expect(screen.getByText("JohnDoe")).toBeInTheDocument();
  });

  it("renders sign out button", () => {
    render(<PlexSettings settings={settings()} onChange={vi.fn()} />);
    // "Sign Out" appears as both a label and button text
    expect(screen.getAllByText("Sign Out").length).toBeGreaterThanOrEqual(1);
  });

  it("calls signOutPlex on sign out click", async () => {
    Object.defineProperty(globalThis, "location", {
      value: { href: "/" },
      writable: true,
      configurable: true,
    });
    render(<PlexSettings settings={settings()} onChange={vi.fn()} />);
    // Find the Sign Out button by its description text
    const signOutBtn = screen.getByText("Disconnect from Plex and return to login").closest("button")!;
    await act(async () => {
      fireEvent.click(signOutBtn);
    });
    expect(mockSignOutPlex).toHaveBeenCalled();
  });
});

// ── TraktSettings ───────────────────────────────────────────────────

describe("TraktSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTraktIsAuth.mockReturnValue(false);
  });

  it("shows Not Connected when not authenticated", () => {
    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Not Connected")).toBeInTheDocument();
  });

  it("shows Connected and Sign Out when authenticated", () => {
    mockTraktIsAuth.mockReturnValue(true);
    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls signOut on Sign Out click", async () => {
    mockTraktIsAuth.mockReturnValue(true);
    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Sign Out").closest("button")!);
    });
    expect(mockTraktSignOut).toHaveBeenCalled();
  });

  it("initiates login flow and shows pin", async () => {
    mockGenerateDeviceCode.mockResolvedValue({
      user_code: "XYZ789",
      verification_url: "https://trakt.tv/activate",
    });
    mockWaitForDeviceCode.mockResolvedValue({ access_token: "tok" });

    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Link Trakt Account").closest("button")!);
    });
    expect(mockGenerateDeviceCode).toHaveBeenCalled();
  });

  it("handles login failure gracefully", async () => {
    mockGenerateDeviceCode.mockRejectedValue(new Error("Network error"));

    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Link Trakt Account").closest("button")!);
    });
    // Should not crash, button should be re-enabled
    expect(screen.getByText("Link Trakt Account")).toBeInTheDocument();
  });

  it("renders scrobbling toggle", () => {
    mockTraktIsAuth.mockReturnValue(true);
    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Trakt Scrobbling")).toBeInTheDocument();
  });

  it("disables scrobbling toggle when not authenticated", () => {
    mockTraktIsAuth.mockReturnValue(false);
    render(<TraktSettings settings={settings()} onChange={vi.fn()} />);
    const scrobbleBtn = screen.getByText("Trakt Scrobbling").closest("button")!;
    expect(scrobbleBtn).toBeDisabled();
  });

  it("calls onChange when scrobbling toggle is clicked", () => {
    mockTraktIsAuth.mockReturnValue(true);
    const onChange = vi.fn();
    render(<TraktSettings settings={settings({ traktScrobblingEnabled: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Trakt Scrobbling").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("traktScrobblingEnabled", false);
  });
});

// ── TMDBSettings ────────────────────────────────────────────────────

describe("TMDBSettings", () => {
  it("renders enable toggle and bearer token input", () => {
    render(<TMDBSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable TMDB")).toBeInTheDocument();
    expect(screen.getByText("Bearer Token")).toBeInTheDocument();
  });

  it("disables enable toggle when discovery is disabled", () => {
    render(<TMDBSettings settings={settings({ discoveryDisabled: true })} onChange={vi.fn()} />);
    const btn = screen.getByText("Enable TMDB").closest("button")!;
    expect(btn).toBeDisabled();
  });

  it("disables bearer token when TMDB is disabled", () => {
    render(<TMDBSettings settings={settings({ tmdbEnabled: false })} onChange={vi.fn()} />);
    // TextInputRow renders as a div with a disabled input inside
    const input = screen.getByPlaceholderText("Enter TMDB bearer token");
    expect(input).toBeDisabled();
  });

  it("calls onChange when TMDB toggle is clicked", () => {
    const onChange = vi.fn();
    render(<TMDBSettings settings={settings({ tmdbEnabled: true })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable TMDB").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("tmdbEnabled", false);
  });
});

// ── MDBListSettings ─────────────────────────────────────────────────

describe("MDBListSettings", () => {
  it("renders enable toggle and API key input", () => {
    render(<MDBListSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable MDBList Ratings")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("disables API key when MDBList is disabled", () => {
    render(<MDBListSettings settings={settings({ mdblistEnabled: false })} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Enter MDBList API key");
    expect(input).toBeDisabled();
  });

  it("calls onChange when MDBList toggle is clicked", () => {
    const onChange = vi.fn();
    render(<MDBListSettings settings={settings({ mdblistEnabled: false })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable MDBList Ratings").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("mdblistEnabled", true);
  });
});

// ── OverseerrSettings ───────────────────────────────────────────────

describe("OverseerrSettings", () => {
  it("renders enable toggle, URL, and API key", () => {
    render(<OverseerrSettings settings={settings()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable Overseerr")).toBeInTheDocument();
    expect(screen.getByText("Server URL")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("disables URL and API key when Overseerr is disabled", () => {
    render(<OverseerrSettings settings={settings({ overseerrEnabled: false })} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).toBeDisabled();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).toBeDisabled();
  });

  it("enables URL and API key when Overseerr is enabled", () => {
    render(<OverseerrSettings settings={settings({ overseerrEnabled: true })} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).not.toBeDisabled();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).not.toBeDisabled();
  });

  it("calls onChange when Overseerr toggle is clicked", () => {
    const onChange = vi.fn();
    render(<OverseerrSettings settings={settings({ overseerrEnabled: false })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable Overseerr").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("overseerrEnabled", true);
  });
});
