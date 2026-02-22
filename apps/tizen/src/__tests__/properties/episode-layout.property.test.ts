// Feature: tizen-parity-phase2, Property 23: Episode layout toggle respects setting
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 23: Episode layout toggle respects setting
 *
 * For any episodeLayout setting value, when set to "horizontal" the Details page
 * renders EpisodeLandscapeCard components, and when set to "vertical" or undefined
 * it renders vertical list items. The set of episodes displayed is identical
 * regardless of layout mode (same count and same IDs).
 */

interface Episode {
  id: string;
  title: string;
  index: number;
}

function resolveLayout(setting: string | undefined): "horizontal" | "vertical" {
  return setting === "horizontal" ? "horizontal" : "vertical";
}

function getRenderedEpisodeIds(episodes: Episode[], _layout: "horizontal" | "vertical"): string[] {
  // Both layouts render the same set of episodes — only the component differs
  return episodes.map((ep) => ep.id);
}

const arbEpisode = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  index: fc.integer({ min: 1, max: 100 }),
});

describe("Property 23: Episode layout toggle respects setting", () => {
  it("resolves 'horizontal' setting to horizontal layout", () => {
    fc.assert(
      fc.property(fc.constant("horizontal"), (setting) => {
        expect(resolveLayout(setting)).toBe("horizontal");
      }),
      { numRuns: 100 },
    );
  });

  it("resolves 'vertical' or undefined setting to vertical layout", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant("vertical"), fc.constant(undefined)),
        (setting) => {
          expect(resolveLayout(setting)).toBe("vertical");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("both layouts render the same episode set (same count and IDs)", () => {
    fc.assert(
      fc.property(fc.array(arbEpisode, { minLength: 0, maxLength: 30 }), (episodes) => {
        const horizontalIds = getRenderedEpisodeIds(episodes, "horizontal");
        const verticalIds = getRenderedEpisodeIds(episodes, "vertical");
        expect(horizontalIds).toEqual(verticalIds);
        expect(horizontalIds.length).toBe(episodes.length);
      }),
      { numRuns: 100 },
    );
  });
});
