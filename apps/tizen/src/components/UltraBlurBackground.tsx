import { hexToRgba, type UltraBlurColors } from "../services/colorExtractor";

interface UltraBlurBackgroundProps {
  src: string;
  className?: string;
  colors?: UltraBlurColors | null;
}

export function UltraBlurBackground({ src, className, colors }: UltraBlurBackgroundProps) {
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
