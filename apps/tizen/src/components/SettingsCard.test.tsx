import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsCard } from "./SettingsCard";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe("SettingsCard", () => {
  it("renders the title", () => {
    render(<SettingsCard title="General">content</SettingsCard>);
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders children inside the card body", () => {
    render(
      <SettingsCard title="Test">
        <span data-testid="child">Hello</span>
      </SettingsCard>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("wraps content in a section with settings-card class", () => {
    const { container } = render(
      <SettingsCard title="Section">body</SettingsCard>,
    );
    const section = container.querySelector("section.settings-card");
    expect(section).not.toBeNull();
  });
});
