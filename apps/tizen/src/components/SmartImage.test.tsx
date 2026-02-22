import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SmartImage } from './SmartImage';

// Mock the tmdb service
vi.mock('../services/tmdb', () => ({
  buildImageUrl: vi.fn((path: string | null, kind?: string) => {
    if (!path) return '';
    const sizes: Record<string, string> = { poster: 'w500', backdrop: 'w1280', profile: 'w185', logo: 'w500' };
    return `https://image.tmdb.org/t/p/${sizes[kind ?? 'poster']}${path}`;
  }),
}));

// IntersectionObserver mock
let observerCallback: IntersectionObserverCallback;
const observerInstance = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };

class MockIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    observerCallback = cb;
  }
  observe = observerInstance.observe;
  disconnect = observerInstance.disconnect;
  unobserve = observerInstance.unobserve;
}

beforeEach(() => {
  observerInstance.observe.mockClear();
  observerInstance.disconnect.mockClear();
  observerInstance.unobserve.mockClear();
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

function simulateIntersection(isIntersecting: boolean) {
  act(() => {
    observerCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

describe('SmartImage', () => {
  it('renders placeholder div initially without img', () => {
    render(<SmartImage src="https://example.com/img.jpg" alt="test" />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders img when element comes into view', () => {
    render(<SmartImage src="https://example.com/img.jpg" alt="test image" />);
    simulateIntersection(true);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    expect(img).toHaveAttribute('alt', 'test image');
  });

  it('does not render img when not intersecting', () => {
    render(<SmartImage src="https://example.com/img.jpg" alt="test" />);
    simulateIntersection(false);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('builds TMDB URL when useTmdb is true', () => {
    render(<SmartImage src="/abc.jpg" alt="tmdb" useTmdb />);
    simulateIntersection(true);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('builds TMDB backdrop URL for backdrop kind', () => {
    render(<SmartImage src="/bg.jpg" alt="backdrop" useTmdb kind="backdrop" />);
    simulateIntersection(true);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w1280/bg.jpg');
  });

  it('handles null src gracefully — no img rendered even when in view', () => {
    render(<SmartImage src={null as unknown as string} alt="empty" />);
    simulateIntersection(true);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('handles empty string src — no img rendered', () => {
    render(<SmartImage src="" alt="empty" />);
    simulateIntersection(true);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('disconnects observer after intersection', () => {
    render(<SmartImage src="https://example.com/img.jpg" alt="test" />);
    simulateIntersection(true);
    expect(observerInstance.disconnect).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(<SmartImage src="/img.jpg" alt="test" className="custom" />);
    expect(container.firstChild).toHaveClass('smart-image', 'custom');
  });
});
