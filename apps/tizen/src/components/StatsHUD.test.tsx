import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsHUD } from './StatsHUD';
import type { PlexMediaItem } from '@flixor/core';
import { createRef } from 'react';

vi.mock('../utils/playback-stats', () => ({
  extractPlaybackStats: vi.fn(() => ({
    videoCodec: 'hevc',
    videoResolution: '3840x2160',
    videoBitrate: 25000,
    audioCodec: 'eac3',
    audioChannels: 8,
    bufferHealth: 12.5,
    currentTime: 300,
    duration: 7200,
  })),
}));

const mockItem: PlexMediaItem = {
  ratingKey: '1',
  key: '/library/metadata/1',
  type: 'movie',
  title: 'Test',
};

describe('StatsHUD', () => {
  it('renders nothing when not visible', () => {
    const ref = createRef<HTMLVideoElement>();
    const { container } = render(
      <StatsHUD videoRef={ref} item={mockItem} visible={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders stats when visible', () => {
    const ref = createRef<HTMLVideoElement>();
    render(<StatsHUD videoRef={ref} item={mockItem} visible={true} />);

    expect(screen.getByText('Playback Stats')).toBeInTheDocument();
    expect(screen.getByText('HEVC')).toBeInTheDocument();
    expect(screen.getByText('3840x2160')).toBeInTheDocument();
    expect(screen.getByText('25.0 Mbps')).toBeInTheDocument();
    expect(screen.getByText('EAC3')).toBeInTheDocument();
    expect(screen.getByText('8ch')).toBeInTheDocument();
    expect(screen.getByText('12.5s')).toBeInTheDocument();
  });

  it('displays formatted playback position', () => {
    const ref = createRef<HTMLVideoElement>();
    render(<StatsHUD videoRef={ref} item={mockItem} visible={true} />);
    // 300s = 5:00, 7200s = 2:00:00
    expect(screen.getByText('5:00 / 2:00:00')).toBeInTheDocument();
  });
});
