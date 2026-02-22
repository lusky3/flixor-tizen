import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractUltraBlurColors,
  clearColorCache,
  hexToRgba,
  enhanceColor,
  DEFAULT_ULTRABLUR_COLORS,
} from '../../services/colorExtractor';

/**
 * Creates a mock Image constructor that captures the instance for test manipulation.
 * Returns [constructor, getter] — use getter() to access the created instance after
 * extractUltraBlurColors is called.
 */
function createMockImageClass(opts?: { triggerOnload?: boolean; triggerOnerror?: boolean }) {
  let instance: Record<string, unknown> | null = null;

  class MockImage {
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 200;
    height = 100;
    _src = '';

    get src() { return this._src; }
    set src(val: string) {
      this._src = val;
      if (opts?.triggerOnerror) {
        setTimeout(() => this.onerror?.(), 10);
      } else if (opts?.triggerOnload) {
        setTimeout(() => this.onload?.(), 10);
      }
    }

    constructor() {
      instance = this as unknown as Record<string, unknown>;
    }
  }

  return {
    MockImage: MockImage as unknown as typeof Image,
    getInstance: () => instance,
  };
}

/** Creates a mock canvas element with configurable context */
function createMockCanvas(ctxOverride?: CanvasRenderingContext2D | null) {
  const defaultCtx = {
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 180;     // R
        data[i + 1] = 60;  // G
        data[i + 2] = 40;  // B
        data[i + 3] = 255; // A
      }
      return { data, width: w, height: h };
    },
  };

  return {
    width: 0,
    height: 0,
    getContext: () => (ctxOverride === null ? null : (ctxOverride ?? defaultCtx)),
  } as unknown as HTMLCanvasElement;
}

describe('ColorExtractor Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearColorCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('extractUltraBlurColors — timeout behavior', () => {
    it('should return null after 5s timeout when image never loads', async () => {
      const { MockImage } = createMockImageClass(); // never triggers onload/onerror
      vi.stubGlobal('Image', MockImage);

      const promise = extractUltraBlurColors('https://example.com/slow-image.jpg');

      // Advance past the 5s timeout
      vi.advanceTimersByTime(5000);

      const result = await promise;
      expect(result).toBeNull();
    });

    it('should not resolve twice if image loads after timeout', async () => {
      const { MockImage, getInstance } = createMockImageClass();
      vi.stubGlobal('Image', MockImage);

      vi.spyOn(document, 'createElement').mockReturnValue(createMockCanvas() as unknown as HTMLElement);

      const promise = extractUltraBlurColors('https://example.com/late-image.jpg');

      // Timeout fires first
      vi.advanceTimersByTime(5000);
      const result = await promise;
      expect(result).toBeNull();

      // Late onload fires — should be ignored due to resolved flag
      const img = getInstance();
      if (img && typeof img.onload === 'function') {
        expect(() => (img.onload as () => void)()).not.toThrow();
      }
    });
  });

  describe('extractUltraBlurColors — CORS error handling', () => {
    it('should return null when image fails to load (CORS error)', async () => {
      const { MockImage } = createMockImageClass({ triggerOnerror: true });
      vi.stubGlobal('Image', MockImage);

      const promise = extractUltraBlurColors('https://cross-origin.com/image.jpg');
      vi.advanceTimersByTime(10);

      const result = await promise;
      expect(result).toBeNull();
    });

    it('should set crossOrigin to "anonymous" on the image', async () => {
      const { MockImage, getInstance } = createMockImageClass({ triggerOnerror: true });
      vi.stubGlobal('Image', MockImage);

      const promise = extractUltraBlurColors('https://example.com/img.jpg');
      vi.advanceTimersByTime(10);
      await promise;

      const img = getInstance();
      expect(img).not.toBeNull();
      expect(img!.crossOrigin).toBe('anonymous');
    });
  });

  describe('clearColorCache', () => {
    it('should clear cached results so next call re-extracts', async () => {
      const url = 'https://example.com/cached-image.jpg';

      // First call — successful extraction
      const { MockImage: Img1 } = createMockImageClass({ triggerOnload: true });
      vi.stubGlobal('Image', Img1);
      vi.spyOn(document, 'createElement').mockReturnValue(createMockCanvas() as unknown as HTMLElement);

      const promise1 = extractUltraBlurColors(url);
      vi.advanceTimersByTime(10);
      const result1 = await promise1;
      expect(result1).not.toBeNull();

      // Second call — should return cached result
      const result2 = await extractUltraBlurColors(url);
      expect(result2).toEqual(result1);

      // Clear cache
      clearColorCache();

      // Restore mocks and set up a failing image to prove cache was cleared
      vi.restoreAllMocks();
      const { MockImage: Img2 } = createMockImageClass({ triggerOnerror: true });
      vi.stubGlobal('Image', Img2);

      const promise3 = extractUltraBlurColors(url);
      vi.advanceTimersByTime(10);
      const result3 = await promise3;

      // After cache clear, same URL returns null because image now fails
      expect(result3).toBeNull();
    });
  });

  describe('extractUltraBlurColors — null on canvas unavailable', () => {
    it('should return null when canvas context is unavailable', async () => {
      const { MockImage } = createMockImageClass({ triggerOnload: true });
      vi.stubGlobal('Image', MockImage);

      // Canvas getContext returns null
      vi.spyOn(document, 'createElement').mockReturnValue(
        createMockCanvas(null) as unknown as HTMLElement,
      );

      const promise = extractUltraBlurColors('https://example.com/no-canvas.jpg');
      vi.advanceTimersByTime(10);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('extractUltraBlurColors — successful extraction', () => {
    it('should return valid UltraBlurColors on success', async () => {
      const { MockImage } = createMockImageClass({ triggerOnload: true });
      vi.stubGlobal('Image', MockImage);
      vi.spyOn(document, 'createElement').mockReturnValue(createMockCanvas() as unknown as HTMLElement);

      const promise = extractUltraBlurColors('https://example.com/good-image.jpg');
      vi.advanceTimersByTime(10);

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result!.bottomLeft).toMatch(/^[0-9a-f]{6}$/i);
      expect(result!.topRight).toMatch(/^[0-9a-f]{6}$/i);
    });
  });

  describe('hexToRgba', () => {
    it('should convert hex to rgba with given alpha', () => {
      expect(hexToRgba('ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(hexToRgba('00ff00', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
      expect(hexToRgba('0000ff', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('should handle hex with # prefix', () => {
      expect(hexToRgba('#7a1612', 0.8)).toBe('rgba(122, 22, 18, 0.8)');
    });
  });

  describe('enhanceColor', () => {
    it('should handle achromatic (gray) colors by adding slight tint', () => {
      const result = enhanceColor(100, 100, 100);
      expect(result.r).toBe(120);
      expect(result.g).toBe(120);
      expect(result.b).toBe(120);
    });

    it('should handle pure black (achromatic edge case)', () => {
      const result = enhanceColor(0, 0, 0);
      expect(result.r).toBe(20);
      expect(result.g).toBe(20);
      expect(result.b).toBe(20);
    });

    it('should handle pure white (achromatic edge case)', () => {
      const result = enhanceColor(255, 255, 255);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('should return valid RGB values in 0-255 range for chromatic input', () => {
      const result = enhanceColor(200, 50, 30);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(255);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(255);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(255);
    });
  });

  describe('DEFAULT_ULTRABLUR_COLORS', () => {
    it('should have valid hex color defaults', () => {
      const hexPattern = /^[0-9a-f]{6}$/i;
      expect(DEFAULT_ULTRABLUR_COLORS.bottomLeft).toMatch(hexPattern);
      expect(DEFAULT_ULTRABLUR_COLORS.topRight).toMatch(hexPattern);
    });
  });
});
