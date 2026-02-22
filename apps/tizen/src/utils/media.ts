export interface MediaMetadata {
  width?: number;
  height?: number;
  videoProfile?: string;
  audioProfile?: string;
  audioCodec?: string;
}

export interface Marker {
  startTimeOffset: number;
  endTimeOffset: number;
  type: string;
}

export interface CastMember {
  tag?: string;
  role?: string;
  thumb?: string;
}

export interface CastDisplay {
  name: string;
  role: string;
}

export function extractTechBadges(media: MediaMetadata): string[] {
  const badges: string[] = [];

  if ((media.width !== undefined && media.width >= 3800) ||
      (media.height !== undefined && media.height >= 2100)) {
    badges.push("4K");
  }

  const vp = media.videoProfile?.toLowerCase() ?? "";
  if (vp.includes("hdr") || vp.includes("hlg")) {
    badges.push("HDR");
  }
  if (vp.includes("dv")) {
    badges.push("Dolby Vision");
  }

  const ap = media.audioProfile?.toLowerCase() ?? "";
  const ac = media.audioCodec?.toLowerCase() ?? "";
  if (ap.includes("atmos") || ac.includes("truehd")) {
    badges.push("Atmos");
  }

  return badges;
}

export function formatResumeLabel(viewOffset: number, duration: number): string | null {
  if (viewOffset <= 0 || duration <= 0 || viewOffset / duration >= 0.95) {
    return null;
  }

  const remaining = duration - viewOffset;
  const remainingMin = Math.round(remaining / 60000);

  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60);
    const mins = remainingMin % 60;
    return `${hours}h ${mins}m left`;
  }

  return `${remainingMin}m left`;
}

export function detectMarkerAtTime(markers: Marker[], currentTimeMs: number): Marker | null {
  return markers.find(
    (m) => m.startTimeOffset <= currentTimeMs && currentTimeMs <= m.endTimeOffset
  ) ?? null;
}

export function formatCastDisplay(castMember: CastMember): CastDisplay {
  return {
    name: castMember.tag ?? "",
    role: castMember.role ?? "",
  };
}

export function formatResolution(height?: number): string {
  if (!height) return "SD";
  if (height >= 2100) return "4K";
  if (height >= 1000) return "1080p";
  if (height >= 700) return "720p";
  if (height >= 400) return "480p";
  return "SD";
}

export function formatBitrate(kbps?: number): string {
  if (!kbps) return "";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function formatAudioChannels(channels?: number): string {
  if (!channels) return "";
  if (channels <= 2) return "Stereo";
  if (channels <= 6) return "5.1";
  if (channels <= 8) return "7.1";
  return `${channels}ch`;
}
