import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrailerModal } from './TrailerModal';

// Mock spatial navigation
const mockFocusSelf = vi.fn();
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: () => ({
    ref: { current: null },
    focusKey: 'trailer-modal-focus-key',
    focusSelf: mockFocusSelf,
    focused: false,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrailerModal', () => {
  it('renders a YouTube iframe with the correct video key', () => {
    render(<TrailerModal videoKey="dQw4w9WgXcQ" onClose={vi.fn()} />);
    const iframe = screen.getByTitle('Trailer');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(iframe.getAttribute('src')).toContain('autoplay=1');
  });

  it('renders with default title "Trailer"', () => {
    render(<TrailerModal videoKey="abc123" onClose={vi.fn()} />);
    expect(screen.getByText('Trailer')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<TrailerModal videoKey="abc123" title="Official Trailer" onClose={vi.fn()} />);
    expect(screen.getByText('Official Trailer')).toBeInTheDocument();
  });

  it('calls onClose on Escape key (via Modal)', () => {
    const onClose = vi.fn();
    render(<TrailerModal videoKey="abc123" onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<TrailerModal videoKey="abc123" onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('iframe allows autoplay and encrypted-media', () => {
    render(<TrailerModal videoKey="xyz789" onClose={vi.fn()} />);
    const iframe = screen.getByTitle('Trailer');
    expect(iframe.getAttribute('allow')).toContain('autoplay');
    expect(iframe.getAttribute('allow')).toContain('encrypted-media');
  });
});
