import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PersonPage } from "../../pages/Person";

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => [mockSearchParams],
}));

const mockGetPersonDetails = vi.fn();
const mockGetPersonCredits = vi.fn();
const mockSearchPerson = vi.fn();
const mockFindByGuid = vi.fn();

vi.mock("../../services/tmdb", () => ({
  getPersonDetails: (...a: unknown[]) => mockGetPersonDetails(...a),
  getPersonCredits: (...a: unknown[]) => mockGetPersonCredits(...a),
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    tmdb: { searchPerson: (...a: unknown[]) => mockSearchPerson(...a) },
    plexServer: {
      findByGuid: (...a: unknown[]) => mockFindByGuid(...a),
    },
  },
}));

vi.mock("../../components/TopNav", () => ({
  TopNav: () => <div data-testid="top-nav" />,
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("PersonPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetPersonDetails.mockReset();
    mockGetPersonCredits.mockReset();
    mockSearchPerson.mockReset();
    mockParams = {};
    mockSearchParams = new URLSearchParams();
  });

  it("shows loading state", () => {
    mockParams = { id: "123" };
    mockGetPersonDetails.mockReturnValue(new Promise(() => {}));
    mockGetPersonCredits.mockReturnValue(new Promise(() => {}));
    render(<PersonPage />);
    expect(screen.getByText("Loading Person...")).toBeInTheDocument();
  });

  it("shows person not found when no data", async () => {
    mockParams = { id: "999" };
    mockGetPersonDetails.mockResolvedValue(null);
    mockGetPersonCredits.mockResolvedValue({ cast: [] });
    await act(async () => {
      render(<PersonPage />);
    });
    expect(screen.getByText("Person not found")).toBeInTheDocument();
  });

  it("renders person details", async () => {
    mockParams = { id: "123" };
    mockGetPersonDetails.mockResolvedValue({
      name: "Tom Hanks",
      biography: "An American actor.",
      profile_path: "/tom.jpg",
      birthday: "1956-07-09",
      place_of_birth: "Concord, California",
    });
    mockGetPersonCredits.mockResolvedValue({
      cast: [
        { id: 1, title: "Forrest Gump", media_type: "movie", popularity: 100, poster_path: "/fg.jpg", release_date: "1994-07-06" },
        { id: 2, name: "Band of Brothers", media_type: "tv", popularity: 80, poster_path: "/bob.jpg", first_air_date: "2001-09-09" },
      ],
    });
    await act(async () => {
      render(<PersonPage />);
    });
    expect(screen.getByText("Tom Hanks")).toBeInTheDocument();
    expect(screen.getByText("An American actor.")).toBeInTheDocument();
    expect(screen.getByText("Born: 1956-07-09")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("TV Shows")).toBeInTheDocument();
    expect(screen.getByText("Forrest Gump")).toBeInTheDocument();
    expect(screen.getByText("Band of Brothers")).toBeInTheDocument();
  });

  it("searches by name when no id param", async () => {
    mockParams = {};
    mockSearchParams = new URLSearchParams("name=Tom+Hanks");
    mockSearchPerson.mockResolvedValue({ results: [{ id: 123 }] });
    mockGetPersonDetails.mockResolvedValue({
      name: "Tom Hanks",
      biography: "Actor",
      profile_path: null,
    });
    mockGetPersonCredits.mockResolvedValue({ cast: [] });
    await act(async () => {
      render(<PersonPage />);
    });
    expect(mockSearchPerson).toHaveBeenCalledWith("Tom Hanks");
    expect(screen.getByText("Tom Hanks")).toBeInTheDocument();
  });

  it("shows placeholder when no profile image", async () => {
    mockParams = { id: "123" };
    mockGetPersonDetails.mockResolvedValue({
      name: "Jane Doe",
      biography: "",
      profile_path: null,
    });
    mockGetPersonCredits.mockResolvedValue({ cast: [] });
    await act(async () => {
      render(<PersonPage />);
    });
    expect(screen.getByText("J")).toBeInTheDocument();
  });
});
