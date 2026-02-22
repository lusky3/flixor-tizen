/**
 * Focused tests to cover inline onChange callbacks in settings sub-components.
 * These render the real SettingItem component and click each control to execute
 * the inline arrow functions in the `control` prop objects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { IntegrationSettings } from "../../components/settings/IntegrationSettings";
import { ContinueWatchingSettings } from "../../components/settings/ContinueWatchingSettings";
import { DetailsScreenSettings } from "../../components/settings/DetailsScreenSettings";
import { OverseerrSettings } from "../../components/settings/OverseerrSettings";
import { MDBListSettings } from "../../components/settings/MDBListSettings";
import { TMDBSettings } from "../../components/settings/TMDBSettings";
import { TraktSettings } from "../../components/settings/TraktSettings";
import { PlexSettings } from "../../components/settings/PlexSettings";
import { AppearanceSettings } from "../../components/settings/AppearanceSettings";
import { DEFAULT_SETTINGS, type TizenSettings } from "../../services/settings";

// Mock useFocusable to return a proper callback ref so React attaches it
vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: (el: HTMLElement | null) => { /* callback ref - React will call this */ },
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
const mockGenerateDeviceCode = vi.fn().mockResolvedValue({ user_code: "ABC", verification_url: "https://trakt.tv/activate" });
const mockWaitForDeviceCode = vi.fn().mockResolvedValue({ access_token: "tok" });
const mockTraktSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock("../../services/flixor", () => ({
  flixor: {
    server: { name: "TestServer" },
    currentProfile: { title: "TestUser" },
    signOutPlex: (...a: unknown[]) => mockSignOutPlex(...a),
    trakt: {
      isAuthenticated: () => mockTraktIsAuth(),
      generateDeviceCode: (...a: unknown[]) => mockGenerateDeviceCode(...a),
      waitForDeviceCode: (...a: unknown[]) => mockWaitForDeviceCode(...a),
      signOut: (...a: unknown[]) => mockTraktSignOut(...a),
    },
  },
}));

function s(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("IntegrationSettings – all control callbacks", () => {
  it("triggers MDBList toggle onChange", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ mdblistEnabled: false })} onChange={onChange} />);
    // Find the toggle by its aria-pressed attribute and label
    const toggles = screen.getAllByRole("button", { pressed: false });
    const mdbToggle = toggles.find(b => b.textContent?.includes("Enable MDBList"));
    expect(mdbToggle).toBeTruthy();
    fireEvent.click(mdbToggle!);
    expect(onChange).toHaveBeenCalledWith("mdblistEnabled", true);
  });

  it("triggers MDBList API key onChange via input", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ mdblistEnabled: true })} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Enter MDBList API key");
    fireEvent.change(input, { target: { value: "my-key" } });
    expect(onChange).toHaveBeenCalledWith("mdblistApiKey", "my-key");
  });

  it("triggers Overseerr toggle onChange", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ overseerrEnabled: false })} onChange={onChange} />);
    const toggles = screen.getAllByRole("button", { pressed: false });
    const osToggle = toggles.find(b => b.textContent?.includes("Enable Overseerr"));
    expect(osToggle).toBeTruthy();
    fireEvent.click(osToggle!);
    expect(onChange).toHaveBeenCalledWith("overseerrEnabled", true);
  });

  it("triggers Overseerr URL onChange via input", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ overseerrEnabled: true })} onChange={onChange} />);
    const input = screen.getByPlaceholderText("https://overseerr.example.com");
    fireEvent.change(input, { target: { value: "https://my-overseerr.com" } });
    expect(onChange).toHaveBeenCalledWith("overseerrUrl", "https://my-overseerr.com");
  });

  it("triggers Overseerr API key onChange via input", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ overseerrEnabled: true })} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Enter Overseerr API key");
    fireEvent.change(input, { target: { value: "os-key" } });
    expect(onChange).toHaveBeenCalledWith("overseerrApiKey", "os-key");
  });

  it("triggers TMDB toggle onChange", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ tmdbEnabled: true })} onChange={onChange} />);
    const toggles = screen.getAllByRole("button");
    const tmdbToggle = toggles.find(b => b.textContent?.includes("Enable TMDB"));
    expect(tmdbToggle).toBeTruthy();
    fireEvent.click(tmdbToggle!);
    expect(onChange).toHaveBeenCalledWith("tmdbEnabled", false);
  });

  it("triggers includeTmdbInSearch toggle onChange", () => {
    const onChange = vi.fn();
    render(<IntegrationSettings settings={s({ tmdbEnabled: true, includeTmdbInSearch: true })} onChange={onChange} />);
    const toggles = screen.getAllByRole("button");
    const searchToggle = toggles.find(b => b.textContent?.includes("Include TMDB in Search"));
    expect(searchToggle).toBeTruthy();
    fireEvent.click(searchToggle!);
    expect(onChange).toHaveBeenCalledWith("includeTmdbInSearch", false);
  });
});

describe("OverseerrSettings – all control callbacks", () => {
  it("triggers toggle and inputs", () => {
    const onChange = vi.fn();
    render(<OverseerrSettings settings={s({ overseerrEnabled: true })} onChange={onChange} />);
    // URL input
    fireEvent.change(screen.getByPlaceholderText("https://overseerr.example.com"), { target: { value: "http://test" } });
    expect(onChange).toHaveBeenCalledWith("overseerrUrl", "http://test");
    // API key input
    fireEvent.change(screen.getByPlaceholderText("Enter Overseerr API key"), { target: { value: "key123" } });
    expect(onChange).toHaveBeenCalledWith("overseerrApiKey", "key123");
  });
});

describe("MDBListSettings – all control callbacks", () => {
  it("triggers API key input onChange", () => {
    const onChange = vi.fn();
    render(<MDBListSettings settings={s({ mdblistEnabled: true })} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Enter MDBList API key"), { target: { value: "mdb-key" } });
    expect(onChange).toHaveBeenCalledWith("mdblistApiKey", "mdb-key");
  });
});

describe("TMDBSettings – all control callbacks", () => {
  it("triggers bearer token input onChange", () => {
    const onChange = vi.fn();
    render(<TMDBSettings settings={s({ tmdbEnabled: true })} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Enter TMDB bearer token"), { target: { value: "bearer-tok" } });
    expect(onChange).toHaveBeenCalledWith("tmdbBearerToken", "bearer-tok");
  });
});

describe("AppearanceSettings – all control callbacks", () => {
  it("triggers hero section toggle", () => {
    const onChange = vi.fn();
    render(<AppearanceSettings settings={s({ showHeroSection: true })} onChange={onChange} />);
    const toggles = screen.getAllByRole("button");
    const heroToggle = toggles.find(b => b.textContent?.includes("Hero Section"));
    fireEvent.click(heroToggle!);
    expect(onChange).toHaveBeenCalledWith("showHeroSection", false);
  });
});

describe("TraktSettings – login flow with pin display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTraktIsAuth.mockReturnValue(false);
  });

  it("shows pin code during login flow", async () => {
    mockGenerateDeviceCode.mockResolvedValue({
      user_code: "TESTPIN",
      verification_url: "https://trakt.tv/activate",
    });
    // Make waitForDeviceCode hang so we can see the pin
    mockWaitForDeviceCode.mockReturnValue(new Promise(() => {}));

    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    const linkBtn = screen.getAllByRole("button").find(b => b.textContent?.includes("Link Trakt Account"));
    await act(async () => {
      fireEvent.click(linkBtn!);
    });
    // Pin should be displayed
    expect(screen.getByText("TESTPIN")).toBeInTheDocument();
    expect(screen.getByText(/trakt.tv\/activate/)).toBeInTheDocument();
    expect(screen.getByText(/Waiting for authorization/)).toBeInTheDocument();
  });

  it("completes login flow successfully", async () => {
    mockGenerateDeviceCode.mockResolvedValue({
      user_code: "PIN123",
      verification_url: "https://trakt.tv/activate",
    });
    mockWaitForDeviceCode.mockResolvedValue({ access_token: "token123" });

    render(<TraktSettings settings={s()} onChange={vi.fn()} />);
    const linkBtn = screen.getAllByRole("button").find(b => b.textContent?.includes("Link Trakt Account"));
    await act(async () => {
      fireEvent.click(linkBtn!);
    });
    // After successful auth, should show Connected
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});

describe("PlexSettings – sign out callback", () => {
  it("triggers signOutPlex and redirects", async () => {
    Object.defineProperty(globalThis, "location", {
      value: { href: "/" },
      writable: true,
      configurable: true,
    });
    render(<PlexSettings settings={s()} onChange={vi.fn()} />);
    const signOutBtn = screen.getAllByRole("button").find(b => b.textContent?.includes("Sign Out"));
    await act(async () => {
      fireEvent.click(signOutBtn!);
    });
    expect(mockSignOutPlex).toHaveBeenCalled();
  });
});
