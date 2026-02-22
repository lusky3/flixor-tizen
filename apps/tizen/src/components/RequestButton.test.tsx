import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestButton } from './RequestButton';

// Mock spatial navigation
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    ...opts,
  }),
}));

// Mock overseerr service
const mockGetStatus = vi.fn();
const mockRequestMedia = vi.fn();

vi.mock('../services/overseerr', () => ({
  getOverseerrMediaStatus: (...args: unknown[]) => mockGetStatus(...args),
  requestMedia: (...args: unknown[]) => mockRequestMedia(...args),
  getStatusDisplayText: (status: string) => {
    const texts: Record<string, string> = {
      not_requested: 'Request',
      pending: 'Pending',
      approved: 'Approved',
      available: 'Available',
      unknown: 'Unknown',
    };
    return texts[status] ?? status;
  },
}));

// Mock toast
const mockShowToast = vi.fn();
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RequestButton', () => {
  it('renders nothing when Overseerr is not configured (null status)', async () => {
    mockGetStatus.mockResolvedValue(null);
    const { container } = render(<RequestButton tmdbId={1} mediaType="movie" />);

    await waitFor(() => {
      expect(container.querySelector('.request-btn')).toBeNull();
    });
  });

  it('shows "Request" text for not_requested status', async () => {
    mockGetStatus.mockResolvedValue({ status: 'not_requested', canRequest: true });
    render(<RequestButton tmdbId={1} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByText('Request')).toBeInTheDocument();
    });
  });

  it('shows "Pending" text for pending status', async () => {
    mockGetStatus.mockResolvedValue({ status: 'pending', requestId: 42, canRequest: false });
    render(<RequestButton tmdbId={2} mediaType="tv" />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows "Available" text for available status', async () => {
    mockGetStatus.mockResolvedValue({ status: 'available', canRequest: false });
    render(<RequestButton tmdbId={3} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
    });
  });

  it('disables button when canRequest is false', async () => {
    mockGetStatus.mockResolvedValue({ status: 'pending', canRequest: false });
    render(<RequestButton tmdbId={1} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('submits request and shows success toast', async () => {
    mockGetStatus.mockResolvedValue({ status: 'not_requested', canRequest: true });
    mockRequestMedia.mockResolvedValue({ success: true, requestId: 99 });

    render(<RequestButton tmdbId={10} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByText('Request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockRequestMedia).toHaveBeenCalledWith(10, 'movie');
      expect(mockShowToast).toHaveBeenCalledWith('Request submitted', 'success');
    });
  });

  it('shows error toast when request fails', async () => {
    mockGetStatus.mockResolvedValue({ status: 'not_requested', canRequest: true });
    mockRequestMedia.mockResolvedValue({ success: false, error: 'Server error' });

    render(<RequestButton tmdbId={10} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByText('Request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Server error', 'error');
    });
  });

  it('calls onStatusChange after successful request', async () => {
    mockGetStatus.mockResolvedValue({ status: 'not_requested', canRequest: true });
    mockRequestMedia.mockResolvedValue({ success: true, requestId: 5 });
    const onStatusChange = vi.fn();

    render(<RequestButton tmdbId={10} mediaType="movie" onStatusChange={onStatusChange} />);

    await waitFor(() => {
      expect(screen.getByText('Request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('pending');
    });
  });

  it('has correct aria-label reflecting current status', async () => {
    mockGetStatus.mockResolvedValue({ status: 'approved', canRequest: false });
    render(<RequestButton tmdbId={1} mediaType="movie" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Overseerr: Approved');
    });
  });
});
