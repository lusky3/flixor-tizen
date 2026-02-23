import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoodTags } from "../../components/MoodTags";
import { deriveMoods } from "../../utils/moodTagsUtils";

// --- deriveMoods unit tests ---

describe("deriveMoods", () => {
  it("returns empty array when no genres match", () => {
    expect(deriveMoods(["Nope", "Unknown", "Fake Genre"])).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(deriveMoods([])).toEqual([]);
  });

  it("deduplicates moods from genres mapping to the same mood", () => {
    // "Science Fiction" and "Sci-Fi" both map to "Mind-Bending"
    const result = deriveMoods(["Science Fiction", "Sci-Fi"]);
    expect(result).toEqual(["Mind-Bending"]);
  });

  it("limits output to 4 unique moods", () => {
    // Pick 6 genres that map to distinct moods
    const genres = [
      "Action",      // Adrenaline Rush
      "Comedy",      // Feel Good
      "Drama",       // Emotional
      "Horror",      // Spine-Chilling
      "Mystery",     // Suspenseful
      "Documentary", // Thought-Provoking
    ];
    const result = deriveMoods(genres);
    expect(result).toHaveLength(4);
  });

  it("is case-insensitive: 'action' matches same as 'Action'", () => {
    expect(deriveMoods(["action"])).toEqual(deriveMoods(["Action"]));
  });

  it("is case-insensitive: mixed case works", () => {
    expect(deriveMoods(["COMEDY"])).toEqual(deriveMoods(["Comedy"]));
    expect(deriveMoods(["hOrRoR"])).toEqual(deriveMoods(["Horror"]));
  });

  it("maps a single known genre correctly", () => {
    expect(deriveMoods(["Drama"])).toEqual(["Emotional"]);
  });

  it("preserves insertion order of first-seen moods", () => {
    const result = deriveMoods(["Horror", "Comedy", "Action"]);
    expect(result).toEqual(["Spine-Chilling", "Feel Good", "Adrenaline Rush"]);
  });
});

// --- MoodTags component tests ---

describe("MoodTags component", () => {
  it("renders null when no moods match", () => {
    const { container } = render(<MoodTags genres={["Unknown", "Nope"]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null for empty genres", () => {
    const { container } = render(<MoodTags genres={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders pill badges for matching genres", () => {
    render(<MoodTags genres={["Action", "Drama"]} />);
    expect(screen.getByText("Adrenaline Rush")).toBeInTheDocument();
    expect(screen.getByText("Emotional")).toBeInTheDocument();
  });

  it("renders max 4 pills even with many genres", () => {
    const genres = [
      "Action",
      "Comedy",
      "Drama",
      "Horror",
      "Mystery",
      "Documentary",
      "Romance",
    ];
    render(<MoodTags genres={genres} />);
    const pills = screen.getAllByText(/.+/);
    expect(pills.length).toBe(4);
  });

  it("renders deduplicated pills for genres sharing a mood", () => {
    render(<MoodTags genres={["Science Fiction", "Sci-Fi", "Drama"]} />);
    expect(screen.getByText("Mind-Bending")).toBeInTheDocument();
    expect(screen.getByText("Emotional")).toBeInTheDocument();
    // Only 2 unique moods
    const container = screen.getByText("Mind-Bending").parentElement!;
    expect(container.children).toHaveLength(2);
  });
});
