import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ServiceIcons from "../../components/ServiceIcons";
import type { WatchProvider } from "../../components/ServiceIcons";

// ── Helpers ────────────────────────────────────────────────────────────

function makeProvider(overrides: Partial<WatchProvider> = {}, index = 0): WatchProvider {
  return {
    provider_id: 100 + index,
    provider_name: `Provider ${index + 1}`,
    logo_path: `/logo${index + 1}.png`,
    ...overrides,
  };
}

function makeProviders(count: number): WatchProvider[] {
  return Array.from({ length: count }, (_, i) => makeProvider({}, i));
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("ServiceIcons", () => {
  // ── 1. Renders nothing for null / undefined / empty ────────────────

  describe("empty states", () => {
    it("returns null when providers is null", () => {
      const { container } = render(<ServiceIcons providers={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when providers is undefined", () => {
      const { container } = render(<ServiceIcons providers={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when providers is an empty array", () => {
      const { container } = render(<ServiceIcons providers={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ── 2. Renders correct number of provider icons ────────────────────

  describe("rendering provider icons", () => {
    it("renders one icon for a single provider", () => {
      const providers = [makeProvider({ provider_name: "Netflix" })];
      render(<ServiceIcons providers={providers} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(1);
    });

    it("renders all icons when count is within default maxIcons", () => {
      const providers = makeProviders(4);
      render(<ServiceIcons providers={providers} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(4);
    });

    it("renders up to default maxIcons (6) when more providers exist", () => {
      const providers = makeProviders(10);
      render(<ServiceIcons providers={providers} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(6);
    });
  });

  // ── 3. Respects maxIcons prop ──────────────────────────────────────

  describe("maxIcons prop", () => {
    it("limits displayed icons to maxIcons value", () => {
      const providers = makeProviders(8);
      render(<ServiceIcons providers={providers} maxIcons={3} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(3);
    });

    it("shows all providers when maxIcons exceeds provider count", () => {
      const providers = makeProviders(2);
      render(<ServiceIcons providers={providers} maxIcons={10} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(2);
    });

    it("shows first N providers in order", () => {
      const providers = [
        makeProvider({ provider_name: "Netflix", logo_path: "/netflix.png" }, 0),
        makeProvider({ provider_name: "Disney+", logo_path: "/disney.png" }, 1),
        makeProvider({ provider_name: "Hulu", logo_path: "/hulu.png" }, 2),
      ];
      render(<ServiceIcons providers={providers} maxIcons={2} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(2);
      expect(imgs[0]).toHaveAttribute("alt", "Netflix");
      expect(imgs[1]).toHaveAttribute("alt", "Disney+");
    });
  });

  // ── 4. Correct TMDB image URLs ─────────────────────────────────────

  describe("TMDB image URLs", () => {
    it("constructs correct src from TMDB base URL and logo_path", () => {
      const providers = [
        makeProvider({ logo_path: "/abc123.png" }),
      ];
      render(<ServiceIcons providers={providers} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute(
        "src",
        "https://image.tmdb.org/t/p/w92/abc123.png",
      );
    });

    it("constructs correct URLs for multiple providers", () => {
      const providers = [
        makeProvider({ logo_path: "/netflix.png" }, 0),
        makeProvider({ logo_path: "/disney.png" }, 1),
      ];
      render(<ServiceIcons providers={providers} />);

      const imgs = screen.getAllByRole("img");
      expect(imgs[0]).toHaveAttribute(
        "src",
        "https://image.tmdb.org/t/p/w92/netflix.png",
      );
      expect(imgs[1]).toHaveAttribute(
        "src",
        "https://image.tmdb.org/t/p/w92/disney.png",
      );
    });
  });

  // ── 5. Alt text set to provider name ───────────────────────────────

  describe("alt text", () => {
    it("sets alt attribute to provider_name", () => {
      const providers = [
        makeProvider({ provider_name: "Netflix" }),
      ];
      render(<ServiceIcons providers={providers} />);

      expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    });

    it("sets title attribute to provider_name", () => {
      const providers = [
        makeProvider({ provider_name: "Disney+" }),
      ];
      render(<ServiceIcons providers={providers} />);

      const img = screen.getByAltText("Disney+");
      expect(img).toHaveAttribute("title", "Disney+");
    });

    it("each icon has its own provider name as alt text", () => {
      const providers = [
        makeProvider({ provider_name: "Netflix" }, 0),
        makeProvider({ provider_name: "Hulu" }, 1),
        makeProvider({ provider_name: "HBO Max" }, 2),
      ];
      render(<ServiceIcons providers={providers} />);

      expect(screen.getByAltText("Netflix")).toBeInTheDocument();
      expect(screen.getByAltText("Hulu")).toBeInTheDocument();
      expect(screen.getByAltText("HBO Max")).toBeInTheDocument();
    });
  });

  // ── 6. Image load error handling ───────────────────────────────────

  describe("image load error", () => {
    it("icon remains in DOM after image error (no onError handler)", () => {
      const providers = [
        makeProvider({ provider_name: "Broken Service", logo_path: "/broken.png" }),
      ];
      render(<ServiceIcons providers={providers} />);

      const img = screen.getByAltText("Broken Service");
      fireEvent.error(img);

      // Component has no onError handler — image stays in DOM with alt text
      expect(screen.getByAltText("Broken Service")).toBeInTheDocument();
    });
  });

  // ── 7. Lazy loading ────────────────────────────────────────────────

  describe("lazy loading", () => {
    it("sets loading='lazy' on all icons", () => {
      const providers = makeProviders(3);
      render(<ServiceIcons providers={providers} />);

      const imgs = screen.getAllByRole("img");
      imgs.forEach((img) => {
        expect(img).toHaveAttribute("loading", "lazy");
      });
    });
  });
});
