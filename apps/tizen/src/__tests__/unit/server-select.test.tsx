import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ServerSelect } from "../../pages/ServerSelect";

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

const mockGetPlexServers = vi.fn();
const mockConnectToPlexServer = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    getPlexServers: (...a: unknown[]) => mockGetPlexServers(...a),
    connectToPlexServer: (...a: unknown[]) => mockConnectToPlexServer(...a),
  },
}));

describe("ServerSelect", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetPlexServers.mockReset();
    mockConnectToPlexServer.mockReset();
  });

  it("shows loading state initially", () => {
    mockGetPlexServers.mockReturnValue(new Promise(() => {}));
    render(<ServerSelect />);
    expect(screen.getByText("Finding your servers…")).toBeInTheDocument();
  });

  it("shows server list after loading", async () => {
    mockGetPlexServers.mockResolvedValue([
      { id: "1", name: "Home Server", owned: true },
      { id: "2", name: "Friend Server", owned: false },
    ]);
    await act(async () => {
      render(<ServerSelect />);
    });
    expect(screen.getByText("Home Server")).toBeInTheDocument();
    expect(screen.getByText("Friend Server")).toBeInTheDocument();
    expect(screen.getByText("Owned")).toBeInTheDocument();
    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  it("auto-connects when only one server", async () => {
    const server = { id: "1", name: "Solo Server", owned: true };
    mockGetPlexServers.mockResolvedValue([server]);
    mockConnectToPlexServer.mockResolvedValue(undefined);
    await act(async () => {
      render(<ServerSelect />);
    });
    expect(mockConnectToPlexServer).toHaveBeenCalledWith(server);
    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });

  it("shows empty state when no servers", async () => {
    mockGetPlexServers.mockResolvedValue([]);
    await act(async () => {
      render(<ServerSelect />);
    });
    expect(screen.getByText("No Servers Found")).toBeInTheDocument();
  });

  it("shows error when fetch fails", async () => {
    mockGetPlexServers.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<ServerSelect />);
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("connects to server on click", async () => {
    const servers = [
      { id: "1", name: "Server A", owned: true },
      { id: "2", name: "Server B", owned: false },
    ];
    mockGetPlexServers.mockResolvedValue(servers);
    mockConnectToPlexServer.mockResolvedValue(undefined);
    await act(async () => {
      render(<ServerSelect />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Server A"));
    });
    expect(mockConnectToPlexServer).toHaveBeenCalledWith(servers[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });

  it("shows error when connection fails", async () => {
    mockGetPlexServers.mockResolvedValue([
      { id: "1", name: "Server A", owned: true },
      { id: "2", name: "Server B", owned: false },
    ]);
    mockConnectToPlexServer.mockRejectedValue(new Error("Connection refused"));
    await act(async () => {
      render(<ServerSelect />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Server A"));
    });
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
  });
});
