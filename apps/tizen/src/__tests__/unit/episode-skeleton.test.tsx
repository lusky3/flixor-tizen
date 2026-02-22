import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  EpisodeSkeletonList,
  PLACEHOLDER_COUNT,
} from "../../components/EpisodeSkeletonList";

describe("EpisodeSkeletonList", () => {
  it("default count (6) renders 6 rows with 4 skeleton elements each", () => {
    const { container } = render(<EpisodeSkeletonList />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons).toHaveLength(6 * PLACEHOLDER_COUNT);
  });

  it("custom count (3) renders 3 rows with 4 skeleton elements each", () => {
    const { container } = render(<EpisodeSkeletonList count={3} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons).toHaveLength(3 * PLACEHOLDER_COUNT);
  });

  it("count 0 renders null", () => {
    const { container } = render(<EpisodeSkeletonList count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("count 1 renders 1 row with 4 skeleton elements", () => {
    const { container } = render(<EpisodeSkeletonList count={1} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons).toHaveLength(PLACEHOLDER_COUNT);
  });

  it("each skeleton element has the 'skeleton' CSS class", () => {
    const { container } = render(<EpisodeSkeletonList count={2} />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    skeletons.forEach((el) => {
      expect(el.classList.contains("skeleton")).toBe(true);
    });
  });
});
