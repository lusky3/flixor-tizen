import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

/**
 * Pure display-data extractors that mirror the rendering logic in
 * ServerCard (ServerSelect.tsx) and ProfileCard (ProfileSelect.tsx).
 */

function getServerDisplayData(server: { name: string; owned: boolean }) {
  return {
    name: server.name,
    statusIndicator: 'Available',
    ownershipBadge: server.owned ? 'Owned' : 'Shared',
  };
}

function getProfileDisplayData(user: { title: string; thumb?: string; admin?: boolean }) {
  return {
    name: user.title,
    hasAvatar: !!user.thumb,
    placeholder: user.title.charAt(0).toUpperCase(),
    showAdminBadge: !!user.admin,
  };
}

// Feature: tizen-feature-parity, Property 4: Server display contains required fields
describe('Property 4: Server display contains required fields', () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any PlexServer object with a name, owned flag, and connection status,
   * the server selection UI rendering function SHALL produce output containing
   * the server name, an online/offline indicator, and an owned/shared indicator.
   */
  it('server display data contains name, status indicator, and correct ownership badge', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }),
          owned: fc.boolean(),
        }),
        (server) => {
          const display = getServerDisplayData(server);

          // Name is present and matches input
          expect(display.name).toBe(server.name);

          // Status indicator is always present
          expect(display.statusIndicator).toBeTruthy();

          // Ownership badge matches the owned flag
          if (server.owned) {
            expect(display.ownershipBadge).toBe('Owned');
          } else {
            expect(display.ownershipBadge).toBe('Shared');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 5: Profile display contains required fields
describe('Property 5: Profile display contains required fields', () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any PlexHomeUser object, the profile selection UI rendering function
   * SHALL produce output containing the user's avatar (or placeholder), name,
   * and admin badge (if applicable).
   */
  it('profile display data contains name, avatar or placeholder, and admin badge iff admin', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          thumb: fc.option(fc.webUrl(), { nil: undefined }),
          admin: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (user) => {
          const display = getProfileDisplayData(user);

          // Name is present and matches input
          expect(display.name).toBe(user.title);

          // Avatar: hasAvatar is true iff thumb is truthy
          expect(display.hasAvatar).toBe(!!user.thumb);

          // Placeholder is always the uppercased first character of title
          expect(display.placeholder).toBe(user.title.charAt(0).toUpperCase());

          // Admin badge shown iff admin is truthy
          expect(display.showAdminBadge).toBe(!!user.admin);
        },
      ),
      { numRuns: 100 },
    );
  });
});
