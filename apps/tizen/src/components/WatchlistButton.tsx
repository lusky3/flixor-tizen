import { useState, useCallback } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { addToWatchlist, removeFromWatchlist, isAuthenticated } from '../services/trakt';
import type { WatchlistItem } from '../services/trakt';
import { useToast } from '../hooks/useToast';

export interface WatchlistButtonProps {
  item: WatchlistItem;
  isOnWatchlist: boolean;
  onToggle?: (nowOnWatchlist: boolean) => void;
}

export function WatchlistButton({ item, isOnWatchlist, onToggle }: WatchlistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [onList, setOnList] = useState(isOnWatchlist);
  const { showToast } = useToast();

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated() || loading) return;

    setLoading(true);
    const ok = onList
      ? await removeFromWatchlist(item)
      : await addToWatchlist(item);

    if (ok) {
      const next = !onList;
      setOnList(next);
      showToast(next ? 'Added to Trakt watchlist' : 'Removed from Trakt watchlist', 'success');
      onToggle?.(next);
    } else {
      showToast('Failed to update watchlist', 'error');
    }
    setLoading(false);
  }, [item, onList, loading, showToast, onToggle]);

  const { ref, focused } = useFocusable({ onEnterPress: handleToggle });

  if (!isAuthenticated()) return null;

  const label = loading ? '…' : onList ? '✓ Watchlist' : '+ Watchlist';

  return (
    <button
      ref={ref}
      className={`watchlist-btn${onList ? ' on-list' : ''}${focused ? ' spatial-focused' : ''}${loading ? ' loading' : ''}`}
      tabIndex={0}
      onClick={handleToggle}
      disabled={loading}
      aria-label={onList ? 'Remove from Trakt watchlist' : 'Add to Trakt watchlist'}
      aria-busy={loading}
    >
      {label}
    </button>
  );
}
