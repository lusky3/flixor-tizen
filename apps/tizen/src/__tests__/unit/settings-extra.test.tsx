import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ContinueWatchingSettings } from "../../components/settings/ContinueWatchingSettings";
import { DetailsScreenSettings } from "../../components/settings/DetailsScreenSettings";
import { MDBListSettings } from "../../components/settings/MDBListSettings";
import { OverseerrSettings } from "../../components/settings/OverseerrSettings";
import { TMDBSettings } from "../../components/settings/TMDBSettings";
import { TraktSettings } from "../../components/settings/TraktSettings";
import { PlexSettings } from "../../components/settings/PlexSettings";
import { CatalogSettings } from "../../components/settings/CatalogSettings";
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

const mockGetLibraries = vi.fn();
const mockSignOutPlex = vi.fn();
const mockTraktIsAuth = vi.fn(() => false);
const mockTraktGenerateCode = vi.fn();
const mockTraktWaitForCode = vi.fn();
const mockTraktSignOut = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: { getLibraries: (...a: unknown[]) => mockGetLibraries(...a) },
    server: { name: "TestServer" },
    currentProfile: { title: "TestUser" },
    signOutPlex: (...a: unknown[]) => mockSignOutPlex(...a),
    trakt: {
      isAuthenticated: () => mockTraktIsAuth(),
      generateDeviceCode: (...a: unknown[]) => mockTraktGenerateCode(...a),
      waitForDeviceCode: (...a: unknown[]) => mockTraktWaitForCode(...a),
      signOut: (...a: unknown[]) => mockTraktSignOut(...a),
    },
  },
}));

function s(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

// ── ContinueWatchingSettings ────────────────────────────────────────

describe("ContinueWatchingSettings", () => {
  it("renders card style and cache settings", () => {
    render(<ContinueWatchingSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Card Style")).toBeInTheDocument();
    expect(screen.getByText("Cache Streams")).toBeInTheDocument();
    expect(screen.getByText("Cache Duration")).toBeInTheDocument();
  });

  it("calls onChange when cache toggle is clicked", () => {
    const onChange = vi.fn();
    render(<ContinueWatchingSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Cache Streams").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("continueWatchingCachedStreams", true);
  });

  it("disables cache duration when cache is off", () => {
    const { container } = render(
      <ContinueWatchingSettings settings={s({ continueWatchingCachedStreams: false })} onChange={vi.fn()} />,
    );
    const durationItem = screen.getByText("Cache Duration").closest("button");
    expect(durationItem).toBeDisabled();
  });
});

// ── DetailsScreenSettings ───────────────────────────────────────────

describe("DetailsScreenSettings", () => {
  it("renders layout, ratings, and episode settings", () => {
    render(<DetailsScreenSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Details Page Layout")).toBeInTheDocument();
    expect(screen.getByText("IMDb")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Critics")).toBeInTheDocument();
    expect(screen.getByText("Rotten Tomatoes Audience")).toBeInTheDocument();
    expect(screen.getByText("Episode Layout")).toBeInTheDocument();
  });

  it("calls onChange when IMDb toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("IMDb").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showImdb", false);
  });

  it("calls onChange when RT Critics toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rotten Tomatoes Critics").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showRtCritics", false);
  });

  it("calls onChange when RT Audience toggle is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsScreenSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rotten Tomatoes Audience").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("showRtAudience", false);
  });
});

// ── MDBListSettings ─────────────────────────────────────────────────

describe("MDBListSettings", () => {
  it("renders toggle and API key input", () => {
    render(<MDBListSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable MDBList Ratings")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("disables API key when MDBList is off", () => {
    render(<MDBListSettings settings={s({ mdblistEnabled: false })} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Enter MDBList API key");
    expect(input).toBeDisabled();
  });

  it("calls onChange when toggle is clicked", () => {
    const onChange = vi.fn();
    render(<MDBListSettings settings={s({ mdblistEnabled: false })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable MDBList Ratings").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("mdblistEnabled", true);
  });
});

// ── OverseerrSettings ───────────────────────────────────────────────

describe("OverseerrSettings", () => {
  it("renders toggle, URL, and API key inputs", () => {
    render(<OverseerrSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable Overseerr")).toBeInTheDocument();
    expect(screen.getByText("Server URL")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
  });

  it("disables URL and API key when Overseerr is off", () => {
    render(<OverseerrSettings settings={s({ overseerrEnabled: false })} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("https://overseerr.example.com")).toBeDisabled();
    expect(screen.getByPlaceholderText("Enter Overseerr API key")).toBeDisabled();
  });

  it("calls onChange when toggle is clicked", () => {
    const onChange = vi.fn();
    render(<OverseerrSettings settings={s({ overseerrEnabled: false })} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable Overseerr").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("overseerrEnabled", true);
  });
});

// ── TMDBSettings ────────────────────────────────────────────────────

describe("TMDBSettings", () => {
  it("renders toggle and bearer token input", () => {
    render(<TMDBSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Enable TMDB")).toBeInTheDocument();
    expect(screen.getByText("Bearer Token")).toBeInTheDocument();
  });

  it("disables TMDB toggle when discovery is disabled", () => {
    render(<TMDBSettings settings={s({ discoveryDisabled: true })} onChange={vi.fn()} />);
    const btn = screen.getByText("Enable TMDB").closest("button");
    expect(btn).toBeDisabled();
  });

  it("calls onChange when toggle is clicked", () => {
    const onChange = vi.fn();
    render(<TMDBSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Enable TMDB").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("tmdbEnabled", false);
  });
});

// ── PlexSettings ────────────────────────────────────────────────────

describe("PlexSettings", () => {
  it("renders server name and profile", () => {
    render(<PlexSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("TestServer")).toBeInTheDocument();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("renders sign out button", () => {
    render(<PlexSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getAllByText("Sign Out").length).toBeGreaterThanOrEqual(1);
  });
});

// ── TraktSettings ───────────────────────────────────────────────────

describe("TraktSettings", () => {
  beforeEach(() => {
    mockTraktIsAuth.mockReturnValue(false);
    mockTraktGenerateCode.mockReset();
    mockTraktWaitForCode.mockReset();
    mockTraktSignOut.mockReset();
  });

  it("shows Link Trakt Account when not authenticated", () => {
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Not Connected")).toBeInTheDocument();
    expect(screen.getByText("Link Trakt Account")).toBeInTheDocument();
  });

  it("shows Connected and Sign Out when authenticated", () => {
    mockTraktIsAuth.mockReturnValue(true);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("shows scrobbling toggle", () => {
    mockTraktIsAuth.mockReturnValue(true);
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Trakt Scrobbling")).toBeInTheDocument();
  });

  it("disables scrobbling toggle when not authenticated", () => {
    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    const btn = screen.getByText("Trakt Scrobbling").closest("button");
    expect(btn).toBeDisabled();
  });

  it("calls onChange when scrobbling toggle is clicked", () => {
    mockTraktIsAuth.mockReturnValue(true);
    const onChange = vi.fn();
    render(<TraktSettings settings={s()} onChange={onChange} />);
    fireEvent.click(screen.getByText("Trakt Scrobbling").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("traktScrobblingEnabled", false);
  });

  it("shows device code after clicking Link Trakt Account", async () => {
    mockTraktGenerateCode.mockResolvedValue({
      user_code: "ABC123",
      verification_url: "https://trakt.tv/activate",
    });
    mockTraktWaitForCode.mockReturnValue(new Promise(() => {}));

    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Link Trakt Account"));
    });
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });
});

// ── CatalogSettings ─────────────────────────────────────────────────

describe("CatalogSettings", () => {
  beforeEach(() => {
    mockGetLibraries.mockReset();
  });

  it("shows loading state initially", () => {
    mockGetLibraries.mockReturnValue(new Promise(() => {}));
    render(<CatalogSettings settings={s()} onChange={vi.fn()} />);
    expect(screen.getByText("Loading libraries…")).toBeInTheDocument();
  });

  it("shows libraries after loading", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
      { key: "2", title: "My Shows", type: "show" },
    ]);
    await act(async () => {
      render(<CatalogSettings settings={s()} onChange={vi.fn()} />);
    });
    expect(screen.getByText("My Movies")).toBeInTheDocument();
    expect(screen.getByText("My Shows")).toBeInTheDocument();
  });

  it("shows empty state when no libraries", async () => {
    mockGetLibraries.mockResolvedValue([]);
    await act(async () => {
      render(<CatalogSettings settings={s()} onChange={vi.fn()} />);
    });
    expect(screen.getByText(/No libraries found/)).toBeInTheDocument();
  });

  it("calls onChange when library toggle is clicked", async () => {
    mockGetLibraries.mockResolvedValue([
      { key: "1", title: "My Movies", type: "movie" },
    ]);
    const onChange = vi.fn();
    await act(async () => {
      render(<CatalogSettings settings={s()} onChange={onChange} />);
    });
    fireEvent.click(screen.getByText("My Movies").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("catalogDisabledLibraries", ["1"]);
  });
});
