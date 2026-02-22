import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  enhanceColor,
  hexToRgba,
} from '../../services/colorExtractor';

/**
 * Helper: convert RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1)
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rN) {
    h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
  } else if (max === gN) {
    h = ((bN - rN) / d + 2) / 6;
  } else {
    h = ((rN - gN) / d + 4) / 6;
  }

  return { h: h * 360, s, l };
}

/**
 * Helper: replicate the internal rgbToHex used by colorExtractor
 */
function rgbToHex(r: number, g: number, b: number): string {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Feature: tizen-parity-phase2, Property 1: Color extraction produces valid hex pairs and caching is idempotent
describe('Property 1: Color extraction produces valid hex pairs and caching is idempotent', () => {
  /**
   * Validates: Requirements 1.1, 1.4
   *
   * For any valid RGB input, running enhanceColor and converting to hex via rgbToHex
   * should produce a 6-character hexadecimal string matching /^[0-9a-f]{6}$/i.
   * Additionally, hexToRgba should produce a valid rgba() CSS string from any valid hex,
   * and calling enhanceColor twice on the same input should return identical results
   * (deterministic / idempotent).
   */
  it('should produce valid 6-char hex strings from enhanceColor → rgbToHex pipeline', () => {
    const hexPattern = /^[0-9a-f]{6}$/i;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          const enhanced = enhanceColor(r, g, b);
          const hex = rgbToHex(enhanced.r, enhanced.g, enhanced.b);

          // Hex must be exactly 6 characters of valid hex digits
          expect(hex).toMatch(hexPattern);

          // Enhanced RGB values must be valid 0-255 integers
          expect(enhanced.r).toBeGreaterThanOrEqual(0);
          expect(enhanced.r).toBeLessThanOrEqual(255);
          expect(enhanced.g).toBeGreaterThanOrEqual(0);
          expect(enhanced.g).toBeLessThanOrEqual(255);
          expect(enhanced.b).toBeGreaterThanOrEqual(0);
          expect(enhanced.b).toBeLessThanOrEqual(255);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce valid rgba() CSS strings from hexToRgba for any valid hex', () => {
    const rgbaPattern = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, [\d.eE+-]+\)$/;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (r, g, b, alpha) => {
          const hex = rgbToHex(r, g, b);
          const rgba = hexToRgba(hex, alpha);

          expect(rgba).toMatch(rgbaPattern);

          // Verify the RGB values round-trip correctly
          const match = rgba.match(/rgba\((\d+), (\d+), (\d+),/);
          expect(match).not.toBeNull();
          expect(Number(match![1])).toBe(r);
          expect(Number(match![2])).toBe(g);
          expect(Number(match![3])).toBe(b);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return identical results when enhanceColor is called twice on the same input (idempotent/deterministic)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          const result1 = enhanceColor(r, g, b);
          const result2 = enhanceColor(r, g, b);

          expect(result1).toEqual(result2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 2: Color enhancement increases saturation and reduces lightness
describe('Property 2: Color enhancement increases saturation and reduces lightness', () => {
  /**
   * Validates: Requirements 1.3
   *
   * For any RGB input color that is not achromatic (max ≠ min), the enhanceColor
   * function should produce an output whose HSL saturation is ≥ the original
   * saturation (up to the 1.0 clamp) and whose HSL lightness is ≤ the original
   * lightness (down to the 0.15 floor).
   */
  it('should increase saturation and reduce lightness for non-achromatic colors', () => {
    // Generate non-achromatic RGB values (where max channel ≠ min channel)
    const nonAchromaticRgb = fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
      )
      .filter(([r, g, b]) => {
        const rN = r / 255;
        const gN = g / 255;
        const bN = b / 255;
        return Math.max(rN, gN, bN) !== Math.min(rN, gN, bN);
      });

    fc.assert(
      fc.property(nonAchromaticRgb, ([r, g, b]) => {
        const originalHsl = rgbToHsl(r, g, b);
        const enhanced = enhanceColor(r, g, b);
        const enhancedHsl = rgbToHsl(enhanced.r, enhanced.g, enhanced.b);

        // Saturation should be >= original (up to 1.0 clamp)
        // Use epsilon to account for floating point and RGB integer quantization (0-255 rounding)
        const epsilon = 0.005;
        expect(enhancedHsl.s).toBeGreaterThanOrEqual(originalHsl.s - epsilon);

        // Lightness should be <= original lightness, down to the 0.15 floor.
        // When original lightness is very low (< 0.15), the floor clamps it UP to 0.15,
        // so the correct bound is max(originalL, 0.15).
        // The epsilon accounts for HSL→RGB(int)→HSL round-trip quantization.
        const lightnessUpperBound = Math.max(originalHsl.l, 0.15);
        expect(enhancedHsl.l).toBeLessThanOrEqual(lightnessUpperBound + epsilon);
      }),
      { numRuns: 100 },
    );
  });
});
