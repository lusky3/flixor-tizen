import { loadSettings } from "./settings";
import { cacheService } from "./cache";

// Cache TTL (ms)
const TTL = {
  STATUS: 5 * 60 * 1000, // 5 min
} as const;

export type OverseerrStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "declined"
  | "processing"
  | "partially_available"
  | "available"
  | "unknown";

export interface OverseerrMediaStatus {
  status: OverseerrStatus;
  requestId?: number;
  canRequest: boolean;
}

export interface OverseerrRequestResult {
  success: boolean;
  requestId?: number;
  status?: OverseerrStatus;
  error?: string;
}

const MediaRequestStatus = { PENDING: 1, APPROVED: 2, DECLINED: 3 };
const MediaInfoStatus = {
  UNKNOWN: 1, PENDING: 2, PROCESSING: 3,
  PARTIALLY_AVAILABLE: 4, AVAILABLE: 5,
};

/** Helper to build cache keys */
function key(...parts: (string | number)[]): string {
  return `overseerr:${parts.join(":")}`;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

/**
 * Overseerr uses a direct fetch because @flixor/core does not expose
 * an Overseerr API wrapper. Overseerr is a self-hosted media request
 * manager with its own REST API that requires user-provided server URL
 * and API key, which is specific to the Tizen/web integration.
 */
async function fetchOverseerr(
  url: string, apiKey: string, endpoint: string, options: RequestInit = {},
): Promise<Response> {
  const baseUrl = normalizeUrl(url);
  return fetch(`${baseUrl}/api/v1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      ...(options.headers || {}),
    },
  });
}

function determineStatus(mediaInfo: any): OverseerrMediaStatus {
  const mediaStatus = mediaInfo?.mediaInfo?.status;
  const requests = mediaInfo?.mediaInfo?.requests || [];

  if (mediaStatus === MediaInfoStatus.AVAILABLE)
    return { status: "available", canRequest: false };
  if (mediaStatus === MediaInfoStatus.PARTIALLY_AVAILABLE)
    return { status: "partially_available", canRequest: true };
  if (mediaStatus === MediaInfoStatus.PROCESSING)
    return { status: "processing", canRequest: false };

  const pending = requests.find((r: any) => r.status === MediaRequestStatus.PENDING);
  if (pending) return { status: "pending", requestId: pending.id, canRequest: false };

  const approved = requests.find((r: any) => r.status === MediaRequestStatus.APPROVED);
  if (approved) return { status: "approved", requestId: approved.id, canRequest: false };

  const declined = requests.find((r: any) => r.status === MediaRequestStatus.DECLINED);
  if (declined) return { status: "declined", requestId: declined.id, canRequest: true };

  return { status: "not_requested", canRequest: true };
}

export async function getOverseerrMediaStatus(
  tmdbId: number, mediaType: "movie" | "tv",
): Promise<OverseerrMediaStatus | null> {
  const settings = loadSettings();
  if (!settings.overseerrEnabled || !settings.overseerrUrl || !settings.overseerrApiKey)
    return null;

  const cacheKey = key("status", mediaType, tmdbId);
  const cached = cacheService.get<OverseerrMediaStatus>(cacheKey);
  if (cached !== null) return cached;

  try {
    const endpoint = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const response = await fetchOverseerr(
      settings.overseerrUrl, settings.overseerrApiKey, endpoint,
    );

    if (!response.ok) {
      if (response.status === 404) {
        const status: OverseerrMediaStatus = { status: "not_requested", canRequest: true };
        cacheService.set(cacheKey, status, TTL.STATUS);
        return status;
      }
      return null;
    }

    const data = await response.json();
    const status = determineStatus(data);
    cacheService.set(cacheKey, status, TTL.STATUS);
    return status;
  } catch {
    return null;
  }
}

export async function requestMedia(
  tmdbId: number, mediaType: "movie" | "tv",
): Promise<OverseerrRequestResult> {
  const settings = loadSettings();
  if (!settings.overseerrEnabled || !settings.overseerrUrl || !settings.overseerrApiKey)
    return { success: false, error: "Overseerr not configured" };

  try {
    let seasons: number[] | undefined;
    if (mediaType === "tv") {
      try {
        const tvResp = await fetchOverseerr(
          settings.overseerrUrl, settings.overseerrApiKey, `/tv/${tmdbId}`,
        );
        if (tvResp.ok) {
          const tvData = await tvResp.json();
          seasons = (tvData.seasons || [])
            .filter((s: any) => s.seasonNumber > 0)
            .map((s: any) => s.seasonNumber);
        }
      } catch { /* ignore */ }
    }

    const body: any = { mediaType, mediaId: tmdbId };
    if (seasons?.length) body.seasons = seasons;

    const response = await fetchOverseerr(
      settings.overseerrUrl, settings.overseerrApiKey, "/request",
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.message || `Request failed: ${response.status}` };
    }

    const data = await response.json();
    // Invalidate cached status after a successful request
    cacheService.invalidate(key("status", mediaType, tmdbId));
    return { success: true, requestId: data.id, status: "pending" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function getStatusDisplayText(status: OverseerrStatus): string {
  const texts: Record<OverseerrStatus, string> = {
    not_requested: "Request", pending: "Pending", approved: "Approved",
    declined: "Declined", processing: "Processing",
    partially_available: "Partial", available: "Available", unknown: "Unknown",
  };
  return texts[status];
}
