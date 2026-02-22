import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonRow } from "../../components/SkeletonRow";

describe("SkeletonRow", () => {
  it("renders default 6 skeleton cards", () => {
    const { container } = render(<SkeletonRow />);
    const cards = container.querySelectorAll(".skeleton-card");
    expect(cards.length).toBe(6);
  });

  it("renders custom count of skeleton cards", () => {
    const { container } = render(<SkeletonRow count={3} />);
    const cards = container.querySelectorAll(".skeleton-card");
    expect(cards.length).toBe(3);
  });

  it("applies poster class by default", () => {
    const { container } = render(<SkeletonRow />);
    const card = container.querySelector(".skeleton-card");
    expect(card?.classList.contains("poster")).toBe(true);
  });

  it("applies landscape class when variant is landscape", () => {
    const { container } = render(<SkeletonRow variant="landscape" />);
    const card = container.querySelector(".skeleton-card");
    expect(card?.classList.contains("landscape")).toBe(true);
  });

  it("renders shimmer elements for title and thumbnails", () => {
    const { container } = render(<SkeletonRow />);
    expect(container.querySelector(".skeleton-title.shimmer")).not.toBeNull();
    expect(container.querySelectorAll(".skeleton-thumb.shimmer").length).toBe(6);
    expect(container.querySelectorAll(".skeleton-label.shimmer").length).toBe(6);
  });
});
