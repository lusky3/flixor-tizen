import { hexToRgba, type UltraBlurColors } from "../services/colorExtractor";
import { loadSettings } from "../services/settings";

interface UltraBlurBackgroundProps {
  src: string;
  className?: string;
  colors?: UltraBlurColors | null;
}

export function UltraBlurBackground({ src, className, colors }: UltraBlurBackgroundProps) {
  const perfMode = loadSettings().performanceModeEnabled;

  // In performance mode, render a simple dark background instead of the expensive blur
  if (perfMode) {
    return (
      <div
        className={`ultra-blur-bg ultra-blur-bg--perf${className ? ` ${className}` : ""}`}
        style={{ backgroundImage: `url(${src})` }}
      >
        <div className="ultra-blur-bg__overlay" />
      </div>
    );
  }

  return (
    <div
      className={`ultra-blur-bg${className ? ` ${className}` : ""}`}
      style={{ backgroundImage: `url(${src})` }}
    >
      {colors ? (
        <>
          <div
            className="ultra-blur-bg__dynamic-overlay"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(colors.bottomLeft, 0.55)} 0%, ${hexToRgba(colors.bottomLeft, 0.25)} 35%, transparent 65%)`,
            }}
          />
          <div
            className="ultra-blur-bg__dynamic-overlay"
            style={{
              background: `linear-gradient(315deg, ${hexToRgba(colors.topRight, 0.5)} 0%, ${hexToRgba(colors.topRight, 0.2)} 35%, transparent 65%)`,
            }}
          />
        </>
      ) : (
        <div className="ultra-blur-bg__overlay" />
      )}
    </div>
  );
}
