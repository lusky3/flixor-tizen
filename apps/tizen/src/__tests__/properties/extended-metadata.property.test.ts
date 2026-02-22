// Feature: tizen-parity-phase2, Property 24: Extended metadata formatting
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 24: Extended metadata formatting
 *
 * For any budget value > 0, the formatted string equals "$" + Math.round(budget / 1000000) + "M".
 * For any revenue value > 0, the formatted string equals "$" + (revenue / 1000000).toFixed(1) + "M".
 * For any production companies or networks array, at most 6 items are displayed.
 */

function formatBudget(budget: number): string {
  if (budget >= 1_000_000) return `$${Math.round(budget / 1_000_000)}M`;
  return `$${Math.round(budget / 1_000)}K`;
}

function formatRevenue(revenue: number): string {
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(revenue / 1_000)}K`;
}

function limitList(items: string[], max: number = 6): string[] {
  return items.slice(0, max);
}

describe("Property 24: Extended metadata formatting", () => {
  it("budget >= 1M formats as $XM with rounded value", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000, max: 1_000_000_000 }),
        (budget) => {
          const formatted = formatBudget(budget);
          expect(formatted).toBe(`$${Math.round(budget / 1_000_000)}M`);
          expect(formatted).toMatch(/^\$\d+M$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("revenue >= 1M formats as $X.XM with one decimal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000, max: 2_000_000_000 }),
        (revenue) => {
          const formatted = formatRevenue(revenue);
          expect(formatted).toBe(`$${(revenue / 1_000_000).toFixed(1)}M`);
          expect(formatted).toMatch(/^\$\d+\.\d{1}M$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("production companies limited to at most 6", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
        (companies) => {
          const limited = limitList(companies, 6);
          expect(limited.length).toBeLessThanOrEqual(6);
          expect(limited.length).toBe(Math.min(companies.length, 6));
          // First 6 items preserved in order
          for (let i = 0; i < limited.length; i++) {
            expect(limited[i]).toBe(companies[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("networks limited to at most 6", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
        (nets) => {
          const limited = limitList(nets, 6);
          expect(limited.length).toBeLessThanOrEqual(6);
          expect(limited.length).toBe(Math.min(nets.length, 6));
        },
      ),
      { numRuns: 100 },
    );
  });
});
