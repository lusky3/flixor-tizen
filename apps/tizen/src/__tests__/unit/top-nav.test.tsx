import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TopNav } from "../../components/TopNav";

const mockNavigate = vi.fn();
let mockPathname = "/";

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

const mockGetHomeUsers = vi.fn().mockResolvedValue([]);

vi.mock("../../services/flixor", () => ({
  flixor: {
    currentProfile: { title: "TestUser", thumb: "http://thumb.jpg" },
    getHomeUsers: (...a: unknown[]) => mockGetHomeUsers(...a),
  },
}));

vi.mock("../../components/UserAvatar", () => ({
  UserAvatar: ({ title, onPress }: any) => (
    <button data-testid="user-avatar" onClick={onPress}>{title}</button>
  ),
}));

describe("TopNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
  });

  it("renders logo", () => {
    render(<TopNav />);
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
  });

  it("renders all nav items", () => {
    render(<TopNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("My List")).toBeInTheDocument();
    expect(screen.getByText("New & Popular")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("Shows")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("⚙ Settings")).toBeInTheDocument();
  });

  it("marks Home as active on /", () => {
    mockPathname = "/";
    render(<TopNav />);
    expect(screen.getByText("Home").className).toContain("active");
  });

  it("marks My List as active on /mylist", () => {
    mockPathname = "/mylist";
    render(<TopNav />);
    expect(screen.getByText("My List").className).toContain("active");
  });

  it("marks Movies as active on /library/movie", () => {
    mockPathname = "/library/movie";
    render(<TopNav />);
    expect(screen.getByText("Movies").className).toContain("active");
  });

  it("navigates on click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByText("Search"));
    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("navigates to profile-select on avatar click", () => {
    render(<TopNav />);
    fireEvent.click(screen.getByTestId("user-avatar"));
    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });

  it("shows user name from currentProfile", () => {
    render(<TopNav />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("falls back to home users when no currentProfile", async () => {
    // Override the mock to have no currentProfile
    const flixorMod = await import("../../services/flixor");
    const original = (flixorMod.flixor as any).currentProfile;
    (flixorMod.flixor as any).currentProfile = null;
    mockGetHomeUsers.mockResolvedValue([{ title: "Admin", thumb: "", admin: true }]);
    await act(async () => {
      render(<TopNav />);
    });
    expect(screen.getByText("Admin")).toBeInTheDocument();
    (flixorMod.flixor as any).currentProfile = original;
  });
});
