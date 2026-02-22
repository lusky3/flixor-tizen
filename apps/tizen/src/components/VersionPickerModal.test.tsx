import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionPickerModal } from './VersionPickerModal';
import type { PlexMedia } from '@flixor/core';

// Mock spatial navigation
const mockFocusSelf = vi.fn();
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focusKey: 'version-picker-focus-key',
    focusSelf: mockFocusSelf,
    focused: false,
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const versions: PlexMedia[] = [
  {
    id: 1,
    duration: 7200000,
    width: 3840,
    height: 2160,
    videoCodec: 'hevc',
    audioCodec: 'truehd',
    audioChannels: 8,
    bitrate: 40000,
    container: 'mkv',
  },
  {
    id: 2,
    duration: 7200000,
    width: 1920,
    height: 1080,
    videoCodec: 'h264',
    audioCodec: 'aac',
    audioChannels: 2,
    bitrate: 8000,
    container: 'mp4',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VersionPickerModal', () => {
  it('renders "Select Version" title', () => {
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Select Version')).toBeInTheDocument();
  });

  it('renders all version items', () => {
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('displays resolution labels (4K for width >= 3800)', () => {
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/4K/)).toBeInTheDocument();
    expect(screen.getByText(/1080p/)).toBeInTheDocument();
  });

  it('marks the selected version as active with checkmark', () => {
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].className).toContain('active');
    expect(buttons[0].textContent).toContain('✓');
    expect(buttons[1].className).not.toContain('active');
  });

  it('calls onSelect with the version index when clicked', () => {
    const onSelect = vi.fn();
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('displays codec and audio detail info', () => {
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/HEVC/)).toBeInTheDocument();
    expect(screen.getByText(/Atmos/)).toBeInTheDocument();
    expect(screen.getByText(/MKV/)).toBeInTheDocument();
  });

  it('calls onClose on Escape key (via Modal)', () => {
    const onClose = vi.fn();
    render(
      <VersionPickerModal
        versions={versions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays editionTitle when available', () => {
    const editionVersions: PlexMedia[] = [
      {
        id: 3,
        duration: 7200000,
        width: 1920,
        height: 1080,
        videoCodec: 'h264',
        editionTitle: "Director's Cut",
      },
    ];
    render(
      <VersionPickerModal
        versions={editionVersions}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Director's Cut/)).toBeInTheDocument();
  });
});
