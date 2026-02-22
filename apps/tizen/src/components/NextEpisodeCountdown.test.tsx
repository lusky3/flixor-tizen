import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextEpisodeCountdown } from './NextEpisodeCountdown';
import type { PlexMediaItem } from '@flixor/core';

// Mock spatial navigation
const mockFocusSelf = vi.fn();
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focusKey: 'next-ep-focus-key',
    focusSelf: mockFocusSelf,
    focused: false,
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const episode: PlexMediaItem = {
  ratingKey: '100',
  key: '/library/metadata/100',
  type: 'episode',
  title: 'The Next Chapter',
  index: 5,
  parentIndex: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NextEpisodeCountdown', () => {
  it('renders episode title', () => {
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/The Next Chapter/)).toBeInTheDocument();
  });

  it('renders episode label with season and episode number', () => {
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/E5/)).toBeInTheDocument();
    expect(screen.getByText(/S2/)).toBeInTheDocument();
  });

  it('displays initial countdown value', () => {
    render(
      <NextEpisodeCountdown
        episode={episode}
        countdownSeconds={10}
        onPlayNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Playing in 10s')).toBeInTheDocument();
  });

  it('decrements countdown each second', () => {
    render(
      <NextEpisodeCountdown
        episode={episode}
        countdownSeconds={5}
        onPlayNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Playing in 4s')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Playing in 3s')).toBeInTheDocument();
  });

  it('calls onPlayNext when countdown reaches 0', () => {
    const onPlayNext = vi.fn();
    render(
      <NextEpisodeCountdown
        episode={episode}
        countdownSeconds={3}
        onPlayNext={onPlayNext}
        onCancel={vi.fn()}
      />,
    );
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onPlayNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPlayNext when "Play Now" button is clicked', () => {
    const onPlayNext = vi.fn();
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={onPlayNext}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Play next episode now'));
    expect(onPlayNext).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when "Cancel" button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByLabelText('Cancel auto-play'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders "Next Episode" label', () => {
    render(
      <NextEpisodeCountdown
        episode={episode}
        onPlayNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Next Episode')).toBeInTheDocument();
  });
});
