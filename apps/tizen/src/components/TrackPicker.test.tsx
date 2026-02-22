import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackPicker } from './TrackPicker';
import type { PlexStream } from '@flixor/core';

// Mock spatial navigation
const mockFocusSelf = vi.fn();
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focusKey: 'track-picker-focus-key',
    focusSelf: mockFocusSelf,
    focused: false,
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const audioTracks: PlexStream[] = [
  { id: 1, streamType: 2, language: 'English', codec: 'aac', displayTitle: 'English (AAC Stereo)' },
  { id: 2, streamType: 2, language: 'Spanish', codec: 'ac3', displayTitle: 'Spanish (AC3 5.1)' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrackPicker', () => {
  it('renders the title', () => {
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('renders all tracks', () => {
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Spanish')).toBeInTheDocument();
  });

  it('marks the selected track as active with a checkmark', () => {
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    // First button (English, id=1) should be active
    expect(buttons[0].className).toContain('active');
    expect(buttons[0].textContent).toContain('✓');
    // Second button (Spanish, id=2) should not be active
    expect(buttons[1].className).not.toContain('active');
  });

  it('calls onSelect with track id when a track is clicked', () => {
    const onSelect = vi.fn();
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Spanish'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('shows "Off" option when showOff is true', () => {
    render(
      <TrackPicker
        title="Subtitles"
        tracks={audioTracks}
        selectedId={null}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        showOff
      />,
    );
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('calls onSelect with null when "Off" is clicked', () => {
    const onSelect = vi.fn();
    render(
      <TrackPicker
        title="Subtitles"
        tracks={audioTracks}
        selectedId={1}
        onSelect={onSelect}
        onClose={vi.fn()}
        showOff
      />,
    );
    fireEvent.click(screen.getByText('Off'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Tizen Back key (keyCode 10009)', () => {
    const onClose = vi.fn();
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { keyCode: 10009 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(container.querySelector('.track-picker-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays codec detail for tracks', () => {
    render(
      <TrackPicker
        title="Audio"
        tracks={audioTracks}
        selectedId={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // codec is uppercased, displayTitle is shown when different from language
    expect(screen.getByText(/AAC/)).toBeInTheDocument();
  });

  it('shows "Unknown" for tracks without language', () => {
    const tracks: PlexStream[] = [
      { id: 10, streamType: 2, codec: 'aac' },
    ];
    render(
      <TrackPicker
        title="Audio"
        tracks={tracks}
        selectedId={null}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
