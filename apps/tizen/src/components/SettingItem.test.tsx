import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingItem } from "./SettingItem";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    ...opts,
  }),
}));

describe("SettingItem — toggle", () => {
  it("renders label and ON indicator when checked", () => {
    render(
      <SettingItem
        label="Dark Mode"
        control={{ type: "toggle", checked: true, onChange: vi.fn() }}
      />,
    );
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("renders OFF indicator when unchecked", () => {
    render(
      <SettingItem
        label="Dark Mode"
        control={{ type: "toggle", checked: false, onChange: vi.fn() }}
      />,
    );
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("calls onChange with toggled value on click", () => {
    const onChange = vi.fn();
    render(
      <SettingItem
        label="Toggle"
        control={{ type: "toggle", checked: false, onChange }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(
      <SettingItem
        label="Toggle"
        control={{ type: "toggle", checked: false, onChange }}
        disabled
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders description when provided", () => {
    render(
      <SettingItem
        label="Toggle"
        description="A helpful hint"
        control={{ type: "toggle", checked: false, onChange: vi.fn() }}
      />,
    );
    expect(screen.getByText("A helpful hint")).toBeInTheDocument();
  });

  it("sets aria-pressed attribute", () => {
    render(
      <SettingItem
        label="Toggle"
        control={{ type: "toggle", checked: true, onChange: vi.fn() }}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SettingItem — text input", () => {
  it("renders a text input with the current value", () => {
    render(
      <SettingItem
        label="API Key"
        control={{ type: "text", value: "abc123", onChange: vi.fn() }}
      />,
    );
    expect(screen.getByDisplayValue("abc123")).toBeInTheDocument();
  });

  it("calls onChange when text is entered", () => {
    const onChange = vi.fn();
    render(
      <SettingItem
        label="API Key"
        control={{ type: "text", value: "", placeholder: "Enter key", onChange }}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Enter key"), {
      target: { value: "new-key" },
    });
    expect(onChange).toHaveBeenCalledWith("new-key");
  });

  it("disables the input when disabled prop is set", () => {
    render(
      <SettingItem
        label="API Key"
        control={{ type: "text", value: "", onChange: vi.fn() }}
        disabled
      />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

describe("SettingItem — select", () => {
  it("renders the current value", () => {
    render(
      <SettingItem
        label="Quality"
        control={{
          type: "select",
          value: "high",
          options: ["low", "medium", "high"],
          onChange: vi.fn(),
        }}
      />,
    );
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("cycles to the next option on click", () => {
    const onChange = vi.fn();
    render(
      <SettingItem
        label="Quality"
        control={{
          type: "select",
          value: "medium",
          options: ["low", "medium", "high"],
          onChange,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("high");
  });

  it("wraps around to the first option", () => {
    const onChange = vi.fn();
    render(
      <SettingItem
        label="Quality"
        control={{
          type: "select",
          value: "high",
          options: ["low", "medium", "high"],
          onChange,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("low");
  });
});

describe("SettingItem — button", () => {
  it("renders the button label", () => {
    render(
      <SettingItem
        label="Cache"
        control={{ type: "button", buttonLabel: "Clear", onPress: vi.fn() }}
      />,
    );
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("calls onPress on click", () => {
    const onPress = vi.fn();
    render(
      <SettingItem
        label="Cache"
        control={{ type: "button", buttonLabel: "Clear", onPress }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("does not call onPress when disabled", () => {
    const onPress = vi.fn();
    render(
      <SettingItem
        label="Cache"
        control={{ type: "button", buttonLabel: "Clear", onPress }}
        disabled
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
