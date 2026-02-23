import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { detectAccessibilityBadges } from "../../utils/accessibilityUtils";

// Feature: tizen-parity-phase2, Property 22: Accessibility badge detection from Plex streams

/** Stream type constants matching Plex conventions */
const SUBTITLE_TYPE = 3;
const AUDIO_TYPE = 2;
const VIDEO_TYPE = 1;

/** Arbitrary stream type (1=video, 2=audio, 3=subtitle, or other) */
const streamTypeArb = fc.oneof(
  fc.constant(VIDEO_TYPE),
  fc.constant(AUDIO_TYPE),
  fc.constant(SUBTITLE_TYPE),
  fc.integer({ min: 0, max: 10 }),
);

/** Arbitrary optional string for displayTitle/title */
const optTitle = fc.option(fc.string({ minLength: 0, maxLength: 40 }), { nil: undefined });

/** Arbitrary stream object */
const streamArb = fc.record({
  streamType: fc.option(streamTypeArb, { nil: undefined }),
  displayTitle: optTitle,
  title: optTitle,
  codec: optTitle,
});

/** SDH keywords (case-insensitive) */
const SDH_KEYWORDS = ["sdh", "deaf", "hard of hearing"];

/** AD keywords (case-insensitive) */
const AD_KEYWORDS = ["description", "descriptive", " ad"];

/** Check if text contains any of the given keywords (case-insensitive) */
function textContainsAny(displayTitle: string | undefined, title: string | undefined, keywords: string[]): boolean {
  const text = `${displayTitle ?? ""} ${title ?? ""}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

describe("Property 22: Accessibility badge detection from Plex streams", () => {
  /**
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */

  it("hasCC is true iff at least one subtitle stream (streamType === 3) exists", () => {
    fc.assert(
      fc.property(fc.array(streamArb, { minLength: 0, maxLength: 20 }), (streams) => {
        const result = detectAccessibilityBadges(streams);
        const hasSubtitle = streams.some((s) => s.streamType === SUBTITLE_TYPE);
        expect(result.hasCC).toBe(hasSubtitle);
      }),
      { numRuns: 200 },
    );
  });

  it("hasSDH is true iff a subtitle stream has SDH/deaf/hard of hearing in displayTitle or title", () => {
    fc.assert(
      fc.property(fc.array(streamArb, { minLength: 0, maxLength: 20 }), (streams) => {
        const result = detectAccessibilityBadges(streams);
        const subtitles = streams.filter((s) => s.streamType === SUBTITLE_TYPE);
        const expectedSDH = subtitles.some((s) => textContainsAny(s.displayTitle, s.title, SDH_KEYWORDS));
        expect(result.hasSDH).toBe(expectedSDH);
      }),
      { numRuns: 200 },
    );
  });

  it("hasAD is true iff an audio stream has description/descriptive/ad in displayTitle or title", () => {
    fc.assert(
      fc.property(fc.array(streamArb, { minLength: 0, maxLength: 20 }), (streams) => {
        const result = detectAccessibilityBadges(streams);
        const audioStreams = streams.filter((s) => s.streamType === AUDIO_TYPE);
        const expectedAD = audioStreams.some((s) => textContainsAny(s.displayTitle, s.title, AD_KEYWORDS));
        expect(result.hasAD).toBe(expectedAD);
      }),
      { numRuns: 200 },
    );
  });

  it("empty streams array returns all false", () => {
    const result = detectAccessibilityBadges([]);
    expect(result).toEqual({ hasCC: false, hasSDH: false, hasAD: false });
  });

  it("all three booleans are independent", () => {
    fc.assert(
      fc.property(fc.array(streamArb, { minLength: 1, maxLength: 20 }), (streams) => {
        const result = detectAccessibilityBadges(streams);

        // Verify each boolean is computed independently from its own stream subset
        const subtitles = streams.filter((s) => s.streamType === SUBTITLE_TYPE);
        const audios = streams.filter((s) => s.streamType === AUDIO_TYPE);

        // CC depends only on subtitle streams existing
        expect(result.hasCC).toBe(subtitles.length > 0);
        // SDH depends only on subtitle stream titles
        expect(result.hasSDH).toBe(subtitles.some((s) => textContainsAny(s.displayTitle, s.title, SDH_KEYWORDS)));
        // AD depends only on audio stream titles
        expect(result.hasAD).toBe(audios.some((s) => textContainsAny(s.displayTitle, s.title, AD_KEYWORDS)));
      }),
      { numRuns: 200 },
    );
  });
});
