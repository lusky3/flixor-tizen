import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WatchlistButton } from './WatchlistButton';
import type { WatchlistItem } from '../services/trakt';

// Mock spatial navigation
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    ...opts,
  }),
}));

// Mock trakt service
const mockAddToWatchlist = vi.fn();
const mockRemoveFromWatchlist = vi.fn();
const mockIsAuthenticated = vi.fn();

vi.mock('../services/trakt', () => ({
  addToWatchlist: (...args: unknown[]) => mockAddToWatchlist(...args),
  removeFromWatchlist: (...args: unknown[]) => mockRemoveFromWatchlist(...args),
  isAuthenticated: () => mockIsAuthenticated(),
}));

// Mock toast
const mockShowToast = vi.fn();
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const item: WatchlistItem = { type: 'movie', ids: { tmdb: 123 } };

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated.mockReturnValue(true);
  mockAddToWatchlist.mockResolvedValue(true);
  mockRemoveFromWatchlist.mockResolvedValue(true);
});

describe('WatchlistButton', () => {
  it('renders nothing when Trakt is not authenticated', () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { container } = render(
      <WatchlistButton item={item} isOnWatchlist={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "+ Watchlist" when item is not on watchlist', () => {
    render(<WatchlistButton item={item} isOnWatchlist={false} />);
    expect(screen.getByText('+ Watchlist')).toBeInTheDocument();
  });

  it('shows "✓ Watchlist" when item is on watchlist', () => {
    render(<WatchlistButton item={item} isOnWatchlist={true} />);
    expect(screen.getByText('✓ Watchlist')).toBeInTheDocument();
  });

  it('calls addToWatchlist and shows success toast on add', async () => {
    render(<WatchlistButton item={item} isOnWatchlist={false} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockAddToWatchlist).toHaveBeenCalledWith(item);
      expect(mockShowToast).toHaveBeenCalledWith('Added to Trakt watchlist', 'success');
    });
  });

  it('calls removeFromWatchlist and shows success toast on remove', async () => {
    render(<WatchlistButton item={item} isOnWatchlist={true} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockRemoveFromWatchlist).toHaveBeenCalledWith(item);
      expect(mockShowToast).toHaveBeenCalledWith('Removed from Trakt watchlist', 'success');
    });
  });

  it('shows error toast when add fails', async () => {
    mockAddToWatchlist.mockResolvedValue(false);
    render(<WatchlistButton item={item} isOnWatchlist={false} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to update watchlist', 'error');
    });
  });

  it('calls onToggle callback after successful toggle', async () => {
    const onToggle = vi.fn();
    render(<WatchlistButton item={item} isOnWatchlist={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  it('has aria-label "Add to Trakt watchlist" when not on list', () => {
    render(<WatchlistButton item={item} isOnWatchlist={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Add to Trakt watchlist');
  });

  it('has aria-label "Remove from Trakt watchlist" when on list', () => {
    render(<WatchlistButton item={item} isOnWatchlist={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Remove from Trakt watchlist');
  });
});
