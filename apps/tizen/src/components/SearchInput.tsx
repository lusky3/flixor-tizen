import { useRef, useEffect } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search movies and shows...",
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref, focused } = useFocusable({
    onEnterPress: () => inputRef.current?.focus(),
    onArrowPress: (direction) => {
      if (direction === "down" || direction === "up") return false;
      return true;
    },
  });

  // Sync browser focus with spatial nav focus
  useEffect(() => {
    if (focused) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  }, [focused]);

  return (
    <div ref={ref} className="search-container">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`search-input${focused ? " spatial-focused" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value.length > 0 && (
          <button
            className="search-clear-btn"
            onClick={() => onChange("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
