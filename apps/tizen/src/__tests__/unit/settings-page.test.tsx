import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    discoveryDisabled: false,
    includeTmdbInSearch: true,
  }),
  saveSettings: vi.fn((partial: any) => ({ ...partial })),
  setDiscoveryDisabled: vi.fn(),
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    server: { name: "TestServer" },
    currentProfile: { title: "TestUser" },
    trakt: {
      isAuthenticated: () => false,
      generateDeviceCode: vi.fn(),
      waitForDeviceCode: vi.fn(),
      signOut: vi.fn(),
    },
    signOutPlex: vi.fn(),
    clearAllCaches: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../components/TopNav", () => ({ TopNav: () => <div data-testid="top-nav" /> }));
vi.mock("../../components/SettingsCard", () => ({
  SettingsCard: ({ title, children }: any) => <div data-testid="settings-card"><h3>{title}</h3>{children}</div>,
}));
vi.mock("../../components/SettingItem", () => ({
  SettingItem: ({ label, description }: any) => (
    <button data-testid="setting-item"><span>{label}</span>{description && <span>{description}</span>}</button>
  ),
}));

// Mock all sub-screen components
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

describe("SettingsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders main settings screen with title", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Plex Account section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Plex Account")).toBeInTheDocument();
  });

  it("renders Discovery section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("renders Content & Display section with nav items", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Content & Display")).toBeInTheDocument();
    expect(screen.getByText("Home Screen")).toBeInTheDocument();
    expect(screen.getByText("Playback")).toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
  });

  it("renders About section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("navigates to Home Screen sub-screen on click", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Home Screen"));
    expect(screen.getByTestId("home-screen-settings")).toBeInTheDocument();
  });

  it("navigates to Playback sub-screen on click", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Playback"));
    expect(screen.getByTestId("playback-settings")).toBeInTheDocument();
  });

  it("navigates to Catalog sub-screen on click", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Catalog"));
    expect(screen.getByTestId("catalog-settings")).toBeInTheDocument();
  });

  it("shows Back button on sub-screen", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Home Screen"));
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("returns to main screen when Back is clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Home Screen"));
    fireEvent.click(screen.getByText("← Back"));
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("navigates to all sub-screens", () => {
    const subScreens = [
      { nav: "Appearance", testId: "appearance-settings" },
      { nav: "Integrations", testId: "integration-settings" },
      { nav: "Continue Watching", testId: "cw-settings" },
      { nav: "Details Screen", testId: "details-settings" },
      { nav: "Plex", testId: "plex-settings" },
      { nav: "Trakt", testId: "trakt-settings" },
      { nav: "TMDB", testId: "tmdb-settings" },
      { nav: "MDBList", testId: "mdblist-settings" },
      { nav: "Overseerr", testId: "overseerr-settings" },
    ];
    for (const { nav, testId } of subScreens) {
      const { unmount } = render(<SettingsPage />);
      fireEvent.click(screen.getByText(nav));
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      unmount();
    }
  });
});
