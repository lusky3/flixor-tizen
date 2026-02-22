import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailsTabs } from "../../components/DetailsTabs";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test",
    onEnterPress: opts?.onEnterPress,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const tabs = [
  { label: "Episodes", content: <div>Episodes list</div> },
  { label: "Related", content: <div>Related content</div> },
  { label: "Details", content: <div>Details info</div> },
];

describe("DetailsTabs", () => {
  it("renders nothing when tabs is empty", () => {
    const { container } = render(<DetailsTabs tabs={[]} activeTab={0} onTabChange={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders tab buttons", () => {
    render(<DetailsTabs tabs={tabs} activeTab={0} onTabChange={vi.fn()} />);
    expect(screen.getByText("Episodes")).toBeInTheDocument();
    expect(screen.getByText("Related")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows active tab content", () => {
    render(<DetailsTabs tabs={tabs} activeTab={0} onTabChange={vi.fn()} />);
    expect(screen.getByText("Episodes list")).toBeInTheDocument();
  });

  it("shows second tab content when activeTab=1", () => {
    render(<DetailsTabs tabs={tabs} activeTab={1} onTabChange={vi.fn()} />);
    expect(screen.getByText("Related content")).toBeInTheDocument();
  });

  it("calls onTabChange when tab button is clicked", () => {
    const onChange = vi.fn();
    render(<DetailsTabs tabs={tabs} activeTab={0} onTabChange={onChange} />);
    fireEvent.click(screen.getByText("Related"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("has tablist role", () => {
    render(<DetailsTabs tabs={tabs} activeTab={0} onTabChange={vi.fn()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("has tabpanel role", () => {
    render(<DetailsTabs tabs={tabs} activeTab={0} onTabChange={vi.fn()} />);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
});
