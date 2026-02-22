import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlexMediaItem } from '@flixor/core';
import { PosterCard } from './PosterCard';
import { LandscapeCard } from './LandscapeCard';
import { ContinueCard } from './ContinueCard';
import { MediaCard } from './MediaCard';

// Mock spatial navigation
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: () => ({ ref: { current: null }, focused: false }),
}));

// Mock flixor service
vi.mock('../services/flixor', () => ({
  flixor: {
    plexServer: {
      getImageUrl: vi.fn((thumb: string, _size: number) => `http://plex${thumb}`),
    },
  },
}));

// Mock SmartImage to simplify card tests
vi.mock('./SmartImage', () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="smart-image" />
  ),
}));

// Mock formatResumeLabel
vi.mock('../utils/media', () => ({
  formatResumeLabel: (viewOffset: number, duration: number) => {
    if (viewOffset <= 0 || duration <= 0 || viewOffset / duration >= 0.95) return null;
    const remaining = duration - viewOffset;
    const mins = Math.round(remaining / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
  },
}));

// IntersectionObserver stub (for any SmartImage leakage)
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
    observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
  })));
});

function makeItem(overrides: Partial<PlexMediaItem> = {}): PlexMediaItem {
  return {
    ratingKey: '1',
    key: '/library/metadata/1',
    type: 'movie',
    title: 'Test Movie',
    year: 2024,
    thumb: '/thumb.jpg',
    art: '/art.jpg',
    duration: 7200000, // 2 hours
    ...overrides,
  } as PlexMediaItem;
}

const noop = () => {};

// ============================================
// PosterCard
// ============================================

describe('PosterCard', () => {
  it('renders title and year', () => {
    render(<PosterCard item={makeItem()} onClick={noop} />);
    expect(screen.getByText('Test Movie (2024)')).toBeInTheDocument();
  });

  it('renders title without year when year is missing', () => {
    render(<PosterCard item={makeItem({ year: undefined })} onClick={noop} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('uses SmartImage for the poster', () => {
    render(<PosterCard item={makeItem()} onClick={noop} />);
    expect(screen.getByTestId('smart-image')).toBeInTheDocument();
  });
});

// ============================================
// LandscapeCard
// ============================================

describe('LandscapeCard', () => {
  it('renders title in overlay', () => {
    render(<LandscapeCard item={makeItem()} onClick={noop} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders metadata overlay with year and content rating', () => {
    render(<LandscapeCard item={makeItem({ contentRating: 'PG-13' })} onClick={noop} />);
    expect(screen.getByText('2024 · PG-13')).toBeInTheDocument();
  });

  it('renders metadata with only year when no content rating', () => {
    render(<LandscapeCard item={makeItem()} onClick={noop} />);
    expect(screen.getByText('2024')).toBeInTheDocument();
  });
});

// ============================================
// ContinueCard
// ============================================

describe('ContinueCard', () => {
  it('renders progress bar when viewOffset exists', () => {
    const item = makeItem({ viewOffset: 3600000, duration: 7200000 }); // 50%
    const { container } = render(<ContinueCard item={item} onClick={noop} />);
    const bar = container.querySelector('.progress-bar');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('renders resume label', () => {
    const item = makeItem({ viewOffset: 3600000, duration: 7200000 }); // 1h left
    render(<ContinueCard item={item} onClick={noop} />);
    expect(screen.getByText('1h 0m left')).toBeInTheDocument();
  });

  it('does not render progress bar when no viewOffset', () => {
    const item = makeItem({ viewOffset: undefined, duration: 7200000 });
    const { container } = render(<ContinueCard item={item} onClick={noop} />);
    expect(container.querySelector('.progress-bar')).toBeNull();
  });

  it('renders title', () => {
    render(<ContinueCard item={makeItem()} onClick={noop} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });
});

// ============================================
// MediaCard delegation
// ============================================

describe('MediaCard', () => {
  it('renders PosterCard for poster variant', () => {
    render(<MediaCard item={makeItem()} variant="poster" onClick={noop} />);
    // PosterCard renders title with year in label
    expect(screen.getByText('Test Movie (2024)')).toBeInTheDocument();
  });

  it('renders LandscapeCard by default', () => {
    render(<MediaCard item={makeItem()} onClick={noop} />);
    // LandscapeCard renders title in overlay span
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders ContinueCard for continue variant', () => {
    const item = makeItem({ viewOffset: 1800000, duration: 7200000 }); // 25%
    render(<MediaCard item={item} variant="continue" onClick={noop} />);
    expect(screen.getByText('1h 30m left')).toBeInTheDocument();
  });
});
