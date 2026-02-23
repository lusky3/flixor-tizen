import { useState, useEffect, useCallback } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import {
  getOverseerrMediaStatus,
  requestMedia,
  getStatusDisplayText,
} from '../services/overseerr';
import type { OverseerrStatus, OverseerrMediaStatus } from '../services/overseerr';
import { useToast } from '../hooks/useToast';

export interface RequestButtonProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  onStatusChange?: (status: OverseerrStatus) => void;
}

export function RequestButton({ tmdbId, mediaType, onStatusChange }: RequestButtonProps) {
  const [status, setStatus] = useState<OverseerrMediaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { showToast } = useToast();

  // Reset loading state when deps change (avoids synchronous setState in effect)
  const [prevKey, setPrevKey] = useState(`${tmdbId}-${mediaType}`);
  const currentKey = `${tmdbId}-${mediaType}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setLoading(true);
    setStatus(null);
  }

  useEffect(() => {
    let cancelled = false;
    getOverseerrMediaStatus(tmdbId, mediaType).then((result) => {
      if (cancelled) return;
      setStatus(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tmdbId, mediaType]);

  const handleRequest = useCallback(async () => {
    if (!status?.canRequest || requesting) return;

    setRequesting(true);
    const result = await requestMedia(tmdbId, mediaType);

    if (result.success) {
      const newStatus: OverseerrMediaStatus = {
        status: 'pending',
        requestId: result.requestId,
        canRequest: false,
      };
      setStatus(newStatus);
      showToast('Request submitted', 'success');
      onStatusChange?.('pending');
    } else {
      showToast(result.error ?? 'Request failed', 'error');
    }
    setRequesting(false);
  }, [tmdbId, mediaType, status, requesting, showToast, onStatusChange]);

  const { ref, focused } = useFocusable({ onEnterPress: handleRequest });

  // Don't render if Overseerr is not configured (null status after load)
  if (!loading && status === null) return null;

  const displayText = loading
    ? '…'
    : requesting
      ? '…'
      : getStatusDisplayText(status?.status ?? 'unknown');

  const canInteract = status?.canRequest && !requesting && !loading;

  return (
    <button
      ref={ref}
      className={`request-btn status-${status?.status ?? 'loading'}${focused ? ' spatial-focused' : ''}${!canInteract ? ' disabled' : ''}`}
      tabIndex={0}
      onClick={canInteract ? handleRequest : undefined}
      disabled={!canInteract}
      aria-label={`Overseerr: ${displayText}`}
      aria-busy={loading || requesting}
    >
      {displayText}
    </button>
  );
}
