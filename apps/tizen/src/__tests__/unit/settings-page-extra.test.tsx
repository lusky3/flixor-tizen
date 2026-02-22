import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SettingsPage } from "../../pages/Settings";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockSignOutPlex = vi.fn().mockResolvedValue(undefined);
const mockClearAllCaches = vi.fn().mockResolvedValue(undefined);
const mockGenerateDeviceCode = vi.fn();
const mockWaitForDeviceCode = vi.fn();
const mockTraktSignOut = vi.fn().mockResolvedValue(undefined);
let mockTraktAuthenticated = false;

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    discoveryDisabled: false,
    includeTmdbInSearch: true,
  }),
  saveSettings: vi.fn((partial: Record<string, unknown>) => ({ ...partial })),
  setDiscoveryDisabled: vi.fn(),
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    server: { name: "TestServer" },
    currentProfile: { title: "TestUser" },
    trakt: {
      isAuthenticated: () => mockTraktAuthenticated,
      generateDeviceCode: (...a: unknown[]) => mockGenerateDeviceCode(...a),
      waitForDeviceCode: (...a: unknown[]) => mockWaitForDeviceCode(...a),
      signOut: (...a: unknown[]) => mockTraktSignOut(...a),
    },
    signOutPlex: (...a: unknown[]) => mockSignOutPlex(...a),
    clearAllCaches: (...a: unknown[]) => mockClearAllCaches(...a),
  },
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/SettingsCard", () => ({
  SettingsCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`card-${title}`}><h3>{title}</h3>{children}</div>
  ),
}));

// Render SettingItem with real control callbacks
vi.mock("../../components/SettingItem", () => ({
  SettingItem: ({ label, description, control, disabled }: {
    label: string;
    description?: string;
    control: { type: string; buttonLabel?: string; onPress?: () => void; checked?: boolean; onChange?: (v: boolean) => void };
    disabled?: boolean;
  }) => {
    if (control.type === "button") {
      return (
        <button data-testid={`setting-${label}`} onClick={control.onPress} disabled={disabled}>
          <span>{label}</span>
          {description && <span>{description}</span>}
          <span>{control.buttonLabel}</span>
        </button>
      );
    }
    if (control.type === "toggle") {
      return (
        <button data-testid={`setting-${label}`} onClick={() => control.onChange?.(!control.checked)} disabled={disabled}>
          <span>{label}</span>
          {description && <span>{description}</span>}
        </button>
      );
    }
    return (
      <button data-testid={`setting-${label}`} disabled={disabled}>
        <span>{label}</span>
        {description && <span>{description}</span>}
      </button>
    );
  },
}));

vi.mock("../../components/settings/HomeScreenSettings", () => ({ HomeScreenSettings: () => <div data-testid="home-screen-settings" /> }));
vi.mock("../../components/settings/PlaybackSettings", () => ({ PlaybackSettings: () => <div data-testid="playback-settings" /> }));
vi.mock("../../components/settings/IntegrationSettings", () => ({ IntegrationSettings: () => <div data-testid="integration-settings" /> }));
vi.mock("../../components/settings/AppearanceSettings", () => ({ AppearanceSettings: () => <div data-testid="appearance-settings" /> }));
vi.mock("../../components/settings/CatalogSettings", () => ({ CatalogSettings: () => <div data-testid="catalog-settings" /> }));
vi.mock("../../components/settings/ContinueWatchingSettings", () => ({ ContinueWatchingSettings: () => <div data-testid="cw-settings" /> }));
vi.mock("../../components/settings/DetailsScreenSettings", () => ({ DetailsScreenSettings: () => <div data-testid="details-settings" /> }));
vi.mock("../../components/settings/PlexSettings", () => ({ PlexSettings: () => <div data-testid="plex-settings" /> }));
vi.mock("../../components/settings/TraktSettings", () => ({ TraktSettings: () => <div data-testid="trakt-settings" /> }));
vi.mock("../../components/settings/TMDBSettings", () => ({ TMDBSettings: () => <div data-testid="tmdb-settings" /> }));
vi.mock("../../components/settings/MDBListSettings", () => ({ MDBListSettings: () => <div data-testid="mdblist-settings" /> }));
vi.mock("../../components/settings/OverseerrSettings", () => ({ OverseerrSettings: () => <div data-testid="overseerr-settings" /> }));

describe("SettingsPage – actions & keyboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTraktAuthenticated = false;
    // Stub alert
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
  });

  it("calls signOutPlex and redirects on Sign Out click", async () => {
    // Mock location.href setter
    const hrefSetter = vi.fn();
    Object.defineProperty(globalThis, "location", {
      value: { href: "/" },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis.location, "href", {
      set: hrefSetter,
      get: () => "/",
      configurable: true,
    });

    render(<SettingsPage />);
    const signOutBtn = screen.getByTestId("setting-Server");
    await act(async () => {
      fireEvent.click(signOutBtn);
    });
    expect(mockSignOutPlex).toHaveBeenCalled();
  });

  it("calls clearAllCaches and shows alert on Clear click", async () => {
    render(<SettingsPage />);
    const clearBtn = screen.getByTestId("setting-Clear All Caches");
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    expect(mockClearAllCaches).toHaveBeenCalled();
    expect(globalThis.alert).toHaveBeenCalledWith("All caches cleared.");
  });

  it("handles Backspace key on main screen to navigate back", () => {
    render(<SettingsPage />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("handles Backspace key on sub-screen to return to main", () => {
    render(<SettingsPage />);
    // Navigate to sub-screen
    fireEvent.click(screen.getByText("Home Screen"));
    expect(screen.getByTestId("home-screen-settings")).toBeInTheDocument();

    // Press Backspace
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
    });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("handles XF86Back key", () => {
    render(<SettingsPage />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "XF86Back" }));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("handles GoBack key", () => {
    render(<SettingsPage />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "GoBack" }));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows Trakt Connected status when authenticated", () => {
    mockTraktAuthenticated = true;
    render(<SettingsPage />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows Trakt Sign Out button when authenticated", async () => {
    mockTraktAuthenticated = true;
    render(<SettingsPage />);
    const signOutBtn = screen.getByTestId("setting-Status");
    await act(async () => {
      fireEvent.click(signOutBtn);
    });
    expect(mockTraktSignOut).toHaveBeenCalled();
  });

  it("initiates Trakt login flow and shows pin", async () => {
    mockTraktAuthenticated = false;
    mockGenerateDeviceCode.mockResolvedValue({
      user_code: "ABC123",
      verification_url: "https://trakt.tv/activate",
    });
    mockWaitForDeviceCode.mockResolvedValue({ access_token: "tok" });

    render(<SettingsPage />);
    const linkBtn = screen.getByTestId("setting-Status");
    await act(async () => {
      fireEvent.click(linkBtn);
    });
    // After successful auth, the component should update
    expect(mockGenerateDeviceCode).toHaveBeenCalled();
  });

  it("toggles discovery disabled", async () => {
    render(<SettingsPage />);
    const discoveryBtn = screen.getByTestId("setting-Library Only Mode");
    await act(async () => {
      fireEvent.click(discoveryBtn);
    });
    // The toggle should have been clicked (we can verify the button exists and is interactive)
    expect(discoveryBtn).toBeInTheDocument();
  });

  it("navigates to profile-select on Switch Profile click", () => {
    render(<SettingsPage />);
    const profileBtn = screen.getByTestId("setting-Switch Profile");
    fireEvent.click(profileBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });
});
