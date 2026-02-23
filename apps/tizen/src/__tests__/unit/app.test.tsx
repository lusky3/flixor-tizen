import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  init: vi.fn(),
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockInitialize = vi.fn();
const mockGetPlexServers = vi.fn();
const mockConnectToPlexServer = vi.fn();
const mockGetHomeUsers = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    initialize: (...a: unknown[]) => mockInitialize(...a),
    getPlexServers: (...a: unknown[]) => mockGetPlexServers(...a),
    connectToPlexServer: (...a: unknown[]) => mockConnectToPlexServer(...a),
    getHomeUsers: (...a: unknown[]) => mockGetHomeUsers(...a),
    plexServer: {
      getLibraries: vi.fn().mockResolvedValue([]),
      getRecentlyAdded: vi.fn().mockResolvedValue([]),
      getOnDeck: vi.fn().mockResolvedValue([]),
      getImageUrl: () => "",
    },
    tmdb: {
      getTrendingMovies: vi.fn().mockResolvedValue({ results: [] }),
      getTrendingTV: vi.fn().mockResolvedValue({ results: [] }),
      getImageUrl: () => "",
    },
    trakt: {
      isAuthenticated: () => false,
    },
  },
}));

vi.mock("../../services/settings", () => ({
  loadSettings: () => ({
    onboardingCompleted: true,
    catalogDisabledLibraries: [],
  }),
  saveSettings: vi.fn(),
}));

vi.mock("../../hooks/useTizenRemote", () => ({
  useTizenRemote: vi.fn(),
}));

// Stub heavy page components to keep tests fast
vi.mock("../../pages/Home", () => ({ Home: () => <div data-testid="home-page">Home</div> }));
vi.mock("../../pages/Library", () => ({ LibraryPage: () => <div>Library</div> }));
vi.mock("../../pages/Details", () => ({ DetailsPage: () => <div>Details</div> }));
vi.mock("../../pages/Player", () => ({ PlayerPage: () => <div>Player</div> }));
vi.mock("../../pages/Search", () => ({ SearchPage: () => <div>Search</div> }));
vi.mock("../../pages/Login", () => ({ Login: () => <div data-testid="login-page">Login</div> }));
vi.mock("../../pages/Settings", () => ({ SettingsPage: () => <div>Settings</div> }));
vi.mock("../../pages/MyList", () => ({ MyListPage: () => <div>MyList</div> }));
vi.mock("../../pages/Person", () => ({ PersonPage: () => <div>Person</div> }));
vi.mock("../../pages/NewPopular", () => ({ NewPopularPage: () => <div>NewPopular</div> }));
vi.mock("../../pages/Onboarding", () => ({ Onboarding: () => <div data-testid="onboarding-page">Onboarding</div> }));
vi.mock("../../pages/ServerSelect", () => ({ ServerSelect: () => <div data-testid="server-select-page">ServerSelect</div> }));
vi.mock("../../pages/ProfileSelect", () => ({ ProfileSelect: () => <div data-testid="profile-select-page">ProfileSelect</div> }));
vi.mock("../../pages/Browse", () => ({ BrowsePage: () => <div>Browse</div> }));
vi.mock("../../components/UpdateBanner", () => ({ UpdateBanner: () => <div data-testid="update-banner" /> }));
vi.mock("../../components/Toast", () => ({ ToastContainer: () => <div data-testid="toast-container" /> }));
vi.mock("../../hooks/useToast", () => ({
  useToastState: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),
  ToastContext: {
    Provider: ({ children }: any) => <>{children}</>,
  },
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading screen initially", () => {
    mockInitialize.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
  });

  it("shows login when not authenticated", async () => {
    mockInitialize.mockResolvedValue(false);
    await act(async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("shows home when fully authenticated with single server", async () => {
    mockInitialize.mockResolvedValue(true);
    mockGetPlexServers.mockResolvedValue([{ name: "MyServer", uri: "http://plex" }]);
    mockConnectToPlexServer.mockResolvedValue(undefined);
    mockGetHomeUsers.mockResolvedValue([{ id: 1, title: "User" }]);
    await act(async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  it("shows server select when multiple servers", async () => {
    mockInitialize.mockResolvedValue(true);
    mockGetPlexServers.mockResolvedValue([
      { name: "Server1", uri: "http://s1" },
      { name: "Server2", uri: "http://s2" },
    ]);
    await act(async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("server-select-page")).toBeInTheDocument();
  });

  it("shows profile select when multiple home users", async () => {
    mockInitialize.mockResolvedValue(true);
    mockGetPlexServers.mockResolvedValue([{ name: "MyServer", uri: "http://plex" }]);
    mockConnectToPlexServer.mockResolvedValue(undefined);
    mockGetHomeUsers.mockResolvedValue([
      { id: 1, title: "User1" },
      { id: 2, title: "User2" },
    ]);
    await act(async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("profile-select-page")).toBeInTheDocument();
  });

  it("renders toast container", async () => {
    mockInitialize.mockResolvedValue(false);
    await act(async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      );
    });
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
  });
});
