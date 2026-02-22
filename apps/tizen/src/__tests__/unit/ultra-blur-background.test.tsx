import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UltraBlurBackground } from "../../components/UltraBlurBackground";

describe("UltraBlurBackground", () => {
  it("renders with background image", () => {
    const { container } = render(<UltraBlurBackground src="https://example.com/bg.jpg" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundImage).toContain("https://example.com/bg.jpg");
  });

  it("renders static overlay when no colors provided", () => {
    const { container } = render(<UltraBlurBackground src="test.jpg" />);
    expect(container.querySelector(".ultra-blur-bg__overlay")).not.toBeNull();
    expect(container.querySelector(".ultra-blur-bg__dynamic-overlay")).toBeNull();
  });

  it("renders dynamic overlays when colors provided", () => {
    const colors = { topRight: "#ff0000", bottomLeft: "#0000ff" };
    const { container } = render(<UltraBlurBackground src="test.jpg" colors={colors} />);
    const overlays = container.querySelectorAll(".ultra-blur-bg__dynamic-overlay");
    expect(overlays.length).toBe(2);
    expect(container.querySelector(".ultra-blur-bg__overlay")).toBeNull();
  });

  it("applies custom className", () => {
    const { container } = render(<UltraBlurBackground src="test.jpg" className="custom" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("custom");
  });

  it("renders without colors (null)", () => {
    const { container } = render(<UltraBlurBackground src="test.jpg" colors={null} />);
    expect(container.querySelector(".ultra-blur-bg__overlay")).not.toBeNull();
  });
});
