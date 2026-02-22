import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Login } from "../../pages/Login";

const mockCreatePlexPin = vi.fn();
const mockWaitForPlexPin = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    createPlexPin: (...a: unknown[]) => mockCreatePlexPin(...a),
    waitForPlexPin: (...a: unknown[]) => mockWaitForPlexPin(...a),
  },
}));

describe("Login", () => {
  beforeEach(() => {
    mockCreatePlexPin.mockReset();
    mockWaitForPlexPin.mockReset();
  });

  it("renders login UI with plex.tv/link", () => {
    mockCreatePlexPin.mockReturnValue(new Promise(() => {}));
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText("FLIXOR")).toBeInTheDocument();
    expect(screen.getByText("Link your Plex Account")).toBeInTheDocument();
    expect(screen.getByText("plex.tv/link")).toBeInTheDocument();
  });

  it("shows loading spinner before pin is fetched", () => {
    mockCreatePlexPin.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Login onLogin={vi.fn()} />);
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
  });

  it("shows pin code after fetching", async () => {
    mockCreatePlexPin.mockResolvedValue({ id: 123, code: "ABCD" });
    mockWaitForPlexPin.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      render(<Login onLogin={vi.fn()} />);
    });
    expect(screen.getByText("ABCD")).toBeInTheDocument();
  });

  it("calls onLogin when pin is verified", async () => {
    const onLogin = vi.fn();
    mockCreatePlexPin.mockResolvedValue({ id: 123, code: "ABCD" });
    mockWaitForPlexPin.mockResolvedValue("token-123");
    await act(async () => {
      render(<Login onLogin={onLogin} />);
    });
    expect(onLogin).toHaveBeenCalled();
  });

  it("shows error message on failure", async () => {
    mockCreatePlexPin.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<Login onLogin={vi.fn()} />);
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows waiting for authorization text", () => {
    mockCreatePlexPin.mockReturnValue(new Promise(() => {}));
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText("Waiting for authorization...")).toBeInTheDocument();
  });
});
