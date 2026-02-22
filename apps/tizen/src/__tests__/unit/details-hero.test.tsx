import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsHero } from "../../components/DetailsHero";

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ alt, src }: { alt: string; src: string }) => (
    <img data-testid="smart-image" alt={alt} src={src} />
  ),
}));

vi.mock("../../components/ContentRatingBadge", () => ({
  default: ({ rating }: { rating: string }) => <span data-testid="rating">{rating}</span>,
}));

describe("DetailsHero", () => {
  it("renders title", () => {
    render(<DetailsHero title="Inception" />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("renders year and duration", () => {
    render(<DetailsHero title="Test" year={2020} duration={7200000} />);
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("120m")).toBeInTheDocument();
  });

  it("renders content rating badge", () => {
    render(<DetailsHero title="Test" contentRating="PG-13" />);
    expect(screen.getByTestId("rating")).toHaveTextContent("PG-13");
  });

  it("renders overview and tagline", () => {
    render(<DetailsHero title="Test" overview="A great movie" tagline="Dream big" />);
    expect(screen.getByText("A great movie")).toBeInTheDocument();
    expect(screen.getByText(/Dream big/)).toBeInTheDocument();
  });

  it("renders backdrop image when provided", () => {
    render(<DetailsHero title="Test" backdropUrl="https://img.com/bg.jpg" />);
    const imgs = screen.getAllByTestId("smart-image");
    expect(imgs.some((img) => img.getAttribute("src") === "https://img.com/bg.jpg")).toBe(true);
  });

  it("renders poster image when provided", () => {
    render(<DetailsHero title="Test" posterUrl="https://img.com/poster.jpg" />);
    expect(screen.getByAltText("Test")).toBeInTheDocument();
  });

  it("renders logo instead of title when logoUrl provided", () => {
    render(<DetailsHero title="Test" logoUrl="https://img.com/logo.png" />);
    const logo = screen.getByAltText("Test");
    expect(logo.getAttribute("src")).toBe("https://img.com/logo.png");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders tech badges", () => {
    render(<DetailsHero title="Test" techBadges={["4K", "HDR"]} />);
    expect(screen.getByText("4K")).toBeInTheDocument();
    expect(screen.getByText("HDR")).toBeInTheDocument();
  });

  it("prefixes digit-starting badge classes with res-", () => {
    const { container } = render(<DetailsHero title="Test" techBadges={["4K"]} />);
    expect(container.querySelector(".tech-badge.res-4k")).not.toBeNull();
  });

  it("renders director and writers", () => {
    render(<DetailsHero title="Test" director="Nolan" writers={["Nolan", "Thomas"]} />);
    expect(screen.getByText("Director: Nolan")).toBeInTheDocument();
    expect(screen.getByText("Writers: Nolan, Thomas")).toBeInTheDocument();
  });

  it("renders children in hero-actions", () => {
    render(<DetailsHero title="Test"><button>Play</button></DetailsHero>);
    expect(screen.getByText("Play")).toBeInTheDocument();
  });
});
