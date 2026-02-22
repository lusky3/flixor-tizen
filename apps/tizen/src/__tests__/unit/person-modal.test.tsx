import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: vi.fn((opts?: { onEnterPress?: () => void }) => ({
    ref: vi.fn(),
    focusKey: "mock-key",
    focused: false,
    focusSelf: vi.fn(),
  })),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockSearchPerson = vi.fn();
const mockFindByGuid = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    tmdb: {
      searchPerson: (...args: unknown[]) => mockSearchPerson(...args),
    },
    plexServer: {
      findByGuid: (...args: unknown[]) => mockFindByGuid(...args),
    },
  },
}));

const mockGetPersonDetails = vi.fn();
const mockGetPersonCredits = vi.fn();

vi.mock("../../services/tmdb", () => ({
  getPersonDetails: (...args: unknown[]) => mockGetPersonDetails(...args),
  getPersonCredits: (...args: unknown[]) => mockGetPersonCredits(...args),
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="smart-image" />
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makePerson(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    name: "Jane Doe",
    biography: "An acclaimed actress known for many roles.",
    birthday: "1985-06-15",
    place_of_birth: "Los Angeles, California, USA",
    profile_path: "/profile123.jpg",
    ...overrides,
  };
}

function makeCredits(movieCount = 2, tvCount = 1) {
  const cast = [
    ...Array.from({ length: movieCount }, (_, i) => ({
      id: 100 + i,
      title: `Movie ${i + 1}`,
      media_type: "movie" as const,
      poster_path: `/movie${i + 1}.jpg`,
      character: `Character ${i + 1}`,
      release_date: `${2020 + i}-01-01`,
      vote_count: 500 - i * 100,
    })),
    ...Array.from({ length: tvCount }, (_, i) => ({
      id: 200 + i,
      name: `TV Show ${i + 1}`,
      media_type: "tv" as const,
      poster_path: `/tv${i + 1}.jpg`,
      character: `TV Role ${i + 1}`,
      first_air_date: `${2021 + i}-03-01`,
      vote_count: 300 - i * 100,
    })),
  ];
  return { cast, crew: [] };
}

async function importPersonModal() {
  const mod = await import("../../components/PersonModal");
  return mod.PersonModal;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("PersonModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersonDetails.mockResolvedValue(makePerson());
    mockGetPersonCredits.mockResolvedValue(makeCredits());
    mockSearchPerson.mockResolvedValue({ results: [{ id: 123 }] });
    mockFindByGuid.mockResolvedValue([]);
  });

  // ── 1. Renders nothing when open=false ─────────────────────────────

  describe("closed state", () => {
    it("renders nothing when open is false", async () => {
      const PersonModal = await importPersonModal();
      const { container } = render(
        <PersonModal open={false} onClose={vi.fn()} personId={123} />,
      );
      expect(container.innerHTML).toBe("");
    });
  });

  // ── 2. Loading state ───────────────────────────────────────────────

  describe("loading state", () => {
    it("shows loading text when open and data is being fetched", async () => {
      const PersonModal = await importPersonModal();
      // Never resolve to keep loading state
      mockGetPersonDetails.mockReturnValue(new Promise(() => {}));
      mockGetPersonCredits.mockReturnValue(new Promise(() => {}));

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  // ── 3. Person details after loading ────────────────────────────────

  describe("person details", () => {
    it("shows name, biography, birthday, and place of birth", async () => {
      const PersonModal = await importPersonModal();

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("An acclaimed actress known for many roles.")).toBeInTheDocument();
      // Date rendering depends on timezone; just verify "Born:" prefix and year appear
      expect(screen.getByText(/Born:/).textContent).toContain("1985");
      expect(screen.getByText("Los Angeles, California, USA")).toBeInTheDocument();
    });

    it("renders profile photo via SmartImage", async () => {
      const PersonModal = await importPersonModal();

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      const img = screen.getByAltText("Jane Doe");
      expect(img).toHaveAttribute("src", "/profile123.jpg");
    });

    it("shows initial letter fallback when no profile photo", async () => {
      const PersonModal = await importPersonModal();
      mockGetPersonDetails.mockResolvedValue(makePerson({ profile_path: undefined }));

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  // ── 4. Person not found ────────────────────────────────────────────

  describe("person not found", () => {
    it("shows 'Person not found.' when no person data available", async () => {
      const PersonModal = await importPersonModal();
      mockGetPersonDetails.mockResolvedValue(null);

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("Person not found.")).toBeInTheDocument();
    });

    it("shows 'Person not found.' when no personId and name search fails", async () => {
      const PersonModal = await importPersonModal();
      mockSearchPerson.mockResolvedValue({ results: [] });

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} name="Nobody" />);
      });

      expect(screen.getByText("Person not found.")).toBeInTheDocument();
    });
  });

  // ── 5. Credit rows ─────────────────────────────────────────────────

  describe("credit rows", () => {
    it("renders Movies and TV Shows credit rows with counts", async () => {
      const PersonModal = await importPersonModal();

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText(/Movies/)).toBeInTheDocument();
      expect(screen.getByText(/TV Shows/)).toBeInTheDocument();
    });

    it("shows credit item titles and characters", async () => {
      const PersonModal = await importPersonModal();

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("Movie 1")).toBeInTheDocument();
      expect(screen.getByText("Character 1")).toBeInTheDocument();
      expect(screen.getByText("TV Show 1")).toBeInTheDocument();
      expect(screen.getByText("TV Role 1")).toBeInTheDocument();
    });

    it("shows 'No filmography found' when no credits exist", async () => {
      const PersonModal = await importPersonModal();
      mockGetPersonCredits.mockResolvedValue({ cast: [], crew: [] });

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      expect(screen.getByText("No filmography found for this person.")).toBeInTheDocument();
    });
  });

  // ── 6. Close behavior ─────────────────────────────────────────────

  describe("close behavior", () => {
    it("calls onClose when close button is clicked", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      const closeBtn = screen.getByLabelText("Close");
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls onClose when overlay background is clicked", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();

      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <PersonModal open={true} onClose={onClose} personId={123} />,
        );
        container = result.container;
      });

      // The overlay is the outermost fixed div
      const overlay = container!.firstElementChild as HTMLElement;
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does NOT call onClose when modal content is clicked", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      // Click on the person name (inside modal content)
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose on Escape key press", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ── 7. Navigation on credit click ──────────────────────────────────

  describe("credit click navigation", () => {
    it("navigates to Plex details page when findByGuid returns a match", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();
      mockFindByGuid.mockResolvedValue([{ ratingKey: "999" }]);

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Movie 1"));
      });

      expect(mockFindByGuid).toHaveBeenCalledWith("tmdb://100", 1);
      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/details/999");
    });

    it("navigates to TMDB-only details when no Plex match found", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();
      mockFindByGuid.mockResolvedValue([]);

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Movie 1"));
      });

      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/details/tmdb:movie:100");
    });

    it("falls back to TMDB-only navigation on findByGuid error", async () => {
      const PersonModal = await importPersonModal();
      const onClose = vi.fn();
      mockFindByGuid.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        render(<PersonModal open={true} onClose={onClose} personId={123} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByText("TV Show 1"));
      });

      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/details/tmdb:tv:200");
    });

    it("uses mediaType=2 for TV show credits in findByGuid", async () => {
      const PersonModal = await importPersonModal();
      mockFindByGuid.mockResolvedValue([]);

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} personId={123} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByText("TV Show 1"));
      });

      expect(mockFindByGuid).toHaveBeenCalledWith("tmdb://200", 2);
    });
  });

  // ── 8. Name-based search fallback ──────────────────────────────────

  describe("name search fallback", () => {
    it("searches by name when personId is not provided", async () => {
      const PersonModal = await importPersonModal();

      await act(async () => {
        render(<PersonModal open={true} onClose={vi.fn()} name="Jane Doe" />);
      });

      expect(mockSearchPerson).toHaveBeenCalledWith("Jane Doe");
      expect(mockGetPersonDetails).toHaveBeenCalledWith(123);
    });
  });
});
