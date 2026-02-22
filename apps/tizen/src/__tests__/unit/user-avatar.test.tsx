import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UserAvatar } from "../../components/UserAvatar";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: vi.fn((opts?: { onEnterPress?: () => void }) => ({
    ref: vi.fn(),
    focusKey: "mock-key",
    focused: false,
    focusSelf: vi.fn(),
    ...(opts?.onEnterPress ? { _onEnterPress: opts.onEnterPress } : {}),
  })),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/" }),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    currentProfile: null as { title: string; thumb?: string } | null,
    getHomeUsers: vi.fn().mockResolvedValue([]),
  },
}));

import { flixor } from "../../services/flixor";
import { TopNav } from "../../components/TopNav";

const mockFlixor = flixor as unknown as {
  currentProfile: { title: string; thumb?: string } | null;
  getHomeUsers: ReturnType<typeof vi.fn>;
};

// ── UserAvatar Tests ───────────────────────────────────────────────────

describe("UserAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Renders image when thumb URL is provided ────────────────────

  it("renders avatar image when thumb URL is provided", () => {
    render(<UserAvatar thumb="https://plex.test/avatar.jpg" title="Alice" />);

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://plex.test/avatar.jpg");
  });

  // ── 2. Shows initial letter fallback when image fails to load ──────

  it("shows initial letter fallback when image fails to load", () => {
    render(<UserAvatar thumb="https://plex.test/broken.jpg" title="Bob" />);

    // Image is rendered initially
    const img = screen.getByRole("img", { name: "Bob" });
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img);

    // Image should be gone, initial letter shown instead
    expect(screen.queryByRole("img", { name: "Bob" })).toBeNull();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  // ── 3. Shows initial letter when no thumb provided ─────────────────

  it("shows initial letter when no thumb is provided", () => {
    render(<UserAvatar title="Charlie" />);

    // No image should be rendered
    expect(screen.queryByRole("img")).toBeNull();
    // Initial letter "C" should be visible
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows '?' when title is empty", () => {
    render(<UserAvatar title="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  // ── 4. Calls onPress callback when clicked ─────────────────────────

  it("calls onPress callback when clicked", () => {
    const onPress = vi.fn();
    render(<UserAvatar title="Dave" onPress={onPress} />);

    const button = screen.getByRole("button", { name: /User profile: Dave/ });
    fireEvent.click(button);

    expect(onPress).toHaveBeenCalledOnce();
  });

  it("does not throw when clicked without onPress", () => {
    render(<UserAvatar title="Eve" />);

    const button = screen.getByRole("button", { name: /User profile: Eve/ });
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  // ── Displays user name beside avatar ───────────────────────────────

  it("displays user name beside avatar", () => {
    render(<UserAvatar title="Frank" />);
    expect(screen.getByText("Frank")).toBeInTheDocument();
  });
});

// ── TopNav Tests ───────────────────────────────────────────────────────

describe("TopNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlixor.currentProfile = null;
    mockFlixor.getHomeUsers.mockResolvedValue([]);
  });

  // ── 5. Renders UserAvatar with current user info ───────────────────

  it("renders UserAvatar with current profile info", () => {
    mockFlixor.currentProfile = {
      title: "Alice",
      thumb: "https://plex.test/alice.jpg",
    };

    render(<TopNav />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toHaveAttribute("src", "https://plex.test/alice.jpg");
  });

  it("falls back to fetched home users when no active profile", async () => {
    mockFlixor.currentProfile = null;
    mockFlixor.getHomeUsers.mockResolvedValue([
      { id: 1, title: "Admin User", thumb: "https://plex.test/admin.jpg", admin: true },
      { id: 2, title: "Kid", thumb: "https://plex.test/kid.jpg", admin: false },
    ]);

    await act(async () => {
      render(<TopNav />);
    });

    // Should use the admin user
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("shows default 'User' when no profile and getHomeUsers fails", async () => {
    mockFlixor.currentProfile = null;
    mockFlixor.getHomeUsers.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<TopNav />);
    });

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  // ── 6. Navigates to /profile-select when avatar is pressed ─────────

  it("navigates to /profile-select when avatar is pressed", () => {
    mockFlixor.currentProfile = { title: "Alice" };

    render(<TopNav />);

    const avatarButton = screen.getByRole("button", { name: /User profile: Alice/ });
    fireEvent.click(avatarButton);

    expect(mockNavigate).toHaveBeenCalledWith("/profile-select");
  });
});
