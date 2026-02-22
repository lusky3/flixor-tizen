export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl?: string;
}

/**
 * Compare two semver strings (major.minor.patch).
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSemver(a: string, b: string): number {
  const partsA = a.split('.').map((p) => parseInt(p, 10));
  const partsB = b.split('.').map((p) => parseInt(p, 10));

  const major = (partsA[0] ?? 0) - (partsB[0] ?? 0);
  if (major !== 0) return major;

  const minor = (partsA[1] ?? 0) - (partsB[1] ?? 0);
  if (minor !== 0) return minor;

  return (partsA[2] ?? 0) - (partsB[2] ?? 0);
}

/**
 * Check for an available update by fetching the version endpoint.
 * Expects JSON: `{ version: string, url?: string }`.
 * On error, returns no-update info gracefully.
 */
export async function checkForUpdate(
  currentVersion: string,
  endpoint: string,
): Promise<VersionInfo> {
  try {
    const res = await fetch(endpoint);
    const data: { version: string; url?: string } = await res.json();
    const latestVersion = data.version;
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseUrl: data.url,
    };
  } catch {
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
    };
  }
}
