import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  canDirectPlay,
  canDirectStream,
  hasDolbyVision,
  decideStream,
  getQualityOptions,
  getSubtitleOptions,
  getAudioOptions,
  getExternalSubtitleUrl,
  type StreamDecisionInput,
} from '../../services/streamDecision';

// --- Arbitraries ---

/** Containers including mp4 to ensure we hit the direct-play path */
const arbContainer = fc.constantFrom('mp4', 'mkv', 'avi', 'webm', 'ts', 'mov', 'MP4', 'Mp4');

/** Video codecs including h264 to ensure we hit direct-play/stream paths */
const arbVideoCodec = fc.constantFrom('h264', 'hevc', 'vp9', 'av1', 'mpeg2', 'H264', 'H264', 'HEVC');

/** Video profiles that may or may not contain dolby vision */
const arbVideoProfile = fc.option(
  fc.constantFrom(
    'high', 'main', 'baseline',
    'dolby vision', 'Dolby Vision Profile 5', 'DOLBY VISION',
    'some dolby vision profile', 'hdr10',
  ),
  { nil: undefined },
);

/** Codec tags that may or may not contain dvhe/dvh1 */
const arbCodecTag = fc.option(
  fc.constantFrom(
    'avc1', 'hev1', 'vp09',
    'dvhe', 'dvh1', 'DVHE', 'DVH1', 'dvhe.05',
  ),
  { nil: undefined },
);

/** Random StreamDecisionInput */
const arbStreamInput: fc.Arbitrary<StreamDecisionInput> = fc.record({
  container: arbContainer,
  videoCodec: arbVideoCodec,
  videoProfile: arbVideoProfile,
  codecTag: arbCodecTag,
  width: fc.option(fc.integer({ min: 1, max: 7680 }), { nil: undefined }),
  height: fc.option(fc.integer({ min: 1, max: 4320 }), { nil: undefined }),
  bitrate: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: undefined }),
});

/** PlexStream-like object for a given streamType */
const arbPlexStream = (streamType: number) =>
  fc.record({
    id: fc.integer({ min: 1, max: 99999 }),
    streamType: fc.constant(streamType),
    codec: fc.option(fc.constantFrom('aac', 'ac3', 'eac3', 'srt', 'ass', 'subrip'), { nil: undefined }),
    language: fc.option(fc.constantFrom('eng', 'spa', 'fra', 'deu', 'jpn'), { nil: undefined }),
    title: fc.option(fc.constantFrom('English', 'Spanish', 'Commentary', 'SDH'), { nil: undefined }),
    displayTitle: fc.option(fc.constantFrom('English (SRT)', 'Spanish (AC3)', 'English SDH'), { nil: undefined }),
    channels: streamType === 2 ? fc.option(fc.integer({ min: 1, max: 8 }), { nil: undefined }) : fc.constant(undefined),
  });

/** Mixed array of audio + subtitle + video streams */
const arbPlexStreams = fc.array(
  fc.oneof(
    arbPlexStream(1), // video
    arbPlexStream(2), // audio
    arbPlexStream(3), // subtitle
  ),
  { minLength: 0, maxLength: 20 },
);

// Feature: tizen-parity-phase2, Property 3: Direct play requires MP4 container with H.264 codec
describe('Property 3: Direct play requires MP4 container with H.264 codec', () => {
  /**
   * Validates: Requirements 2.1
   */
  it('canDirectPlay returns true iff container is "mp4" and videoCodec is "h264"', () => {
    fc.assert(
      fc.property(arbStreamInput, (input) => {
        const result = canDirectPlay(input);
        const expected =
          input.container.toLowerCase() === 'mp4' &&
          input.videoCodec.toLowerCase() === 'h264';
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 4: Direct stream requires H.264 codec regardless of container
describe('Property 4: Direct stream requires H.264 codec regardless of container', () => {
  /**
   * Validates: Requirements 2.2
   */
  it('canDirectStream returns true iff videoCodec is "h264", regardless of container', () => {
    fc.assert(
      fc.property(arbStreamInput, (input) => {
        const result = canDirectStream(input);
        const expected = input.videoCodec.toLowerCase() === 'h264';
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 5: Dolby Vision detection matches profile and codec tag patterns
describe('Property 5: Dolby Vision detection matches profile and codec tag patterns', () => {
  /**
   * Validates: Requirements 2.3
   */
  it('hasDolbyVision returns true iff videoProfile contains "dolby vision" OR codecTag contains "dvhe"/"dvh1"', () => {
    fc.assert(
      fc.property(arbStreamInput, (input) => {
        const result = hasDolbyVision(input);
        const profile = (input.videoProfile ?? '').toLowerCase();
        const tag = (input.codecTag ?? '').toLowerCase();
        const expected =
          profile.includes('dolby vision') ||
          tag.includes('dvhe') ||
          tag.includes('dvh1');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 6: Stream decision follows quality setting rules
describe('Property 6: Stream decision follows quality setting rules', () => {
  /**
   * Validates: Requirements 2.4, 2.5
   */
  it('when quality is "original", strategy follows canDirectPlay > canDirectStream > transcode', () => {
    fc.assert(
      fc.property(arbStreamInput, (input) => {
        const result = decideStream(input, 'original');

        if (canDirectPlay(input)) {
          expect(result.strategy).toBe('direct-play');
        } else if (canDirectStream(input)) {
          expect(result.strategy).toBe('direct-stream');
        } else {
          expect(result.strategy).toBe('transcode');
        }
        // "original" should never set maxBitrate
        expect(result.maxBitrate).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('when quality is a specific bitrate string, strategy is always "transcode" with maxBitrate', () => {
    fc.assert(
      fc.property(
        arbStreamInput,
        fc.integer({ min: 1, max: 100000 }),
        (input, bitrate) => {
          const result = decideStream(input, String(bitrate));
          expect(result.strategy).toBe('transcode');
          expect(result.maxBitrate).toBe(bitrate);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 7: Quality options are filtered by source resolution
describe('Property 7: Quality options are filtered by source resolution', () => {
  /**
   * Validates: Requirements 2.6
   */
  it('all QualityOption items have implied resolution ≤ source height, and "Original" is always included', () => {
    const labelToMaxHeight: Record<string, number> = {
      '20 Mbps - 1080p': 1080,
      '12 Mbps - 1080p': 1080,
      '8 Mbps - 720p': 720,
      '4 Mbps - 720p': 720,
      '2 Mbps - 480p': 480,
      '1 Mbps - 360p': 360,
    };

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4320 }), (sourceHeight) => {
        const options = getQualityOptions(sourceHeight);

        // "Original" must always be present
        const hasOriginal = options.some((o) => o.label === 'Original');
        expect(hasOriginal).toBe(true);

        // Every non-Original option must have implied resolution ≤ sourceHeight
        for (const opt of options) {
          if (opt.label === 'Original') continue;
          const impliedHeight = labelToMaxHeight[opt.label];
          expect(impliedHeight).toBeDefined();
          expect(impliedHeight).toBeLessThanOrEqual(sourceHeight);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 8: Track extraction preserves stream count and maps fields correctly
describe('Property 8: Track extraction preserves stream count and maps fields correctly', () => {
  /**
   * Validates: Requirements 2.7
   */
  it('getSubtitleOptions returns exactly streamType===3 streams with correct field mapping', () => {
    fc.assert(
      fc.property(arbPlexStreams, (streams) => {
        const subtitles = getSubtitleOptions(streams as any);
        const subtitleSources = streams.filter((s) => s.streamType === 3);

        expect(subtitles).toHaveLength(subtitleSources.length);

        for (let i = 0; i < subtitles.length; i++) {
          expect(subtitles[i].id).toBe(subtitleSources[i].id);
          expect(subtitles[i].language).toBe(subtitleSources[i].language ?? '');
          expect(subtitles[i].codec).toBe(subtitleSources[i].codec ?? '');
          expect(subtitles[i].title).toBe(subtitleSources[i].title);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('getAudioOptions returns exactly streamType===2 streams with correct field mapping', () => {
    fc.assert(
      fc.property(arbPlexStreams, (streams) => {
        const audio = getAudioOptions(streams as any);
        const audioSources = streams.filter((s) => s.streamType === 2);

        expect(audio).toHaveLength(audioSources.length);

        for (let i = 0; i < audio.length; i++) {
          expect(audio[i].id).toBe(audioSources[i].id);
          expect(audio[i].language).toBe(audioSources[i].language ?? '');
          expect(audio[i].codec).toBe(audioSources[i].codec ?? '');
          expect(audio[i].channels).toBe(audioSources[i].channels);
          expect(audio[i].title).toBe(audioSources[i].title);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-parity-phase2, Property 9: External subtitle URL contains server, token, and key components
describe('Property 9: External subtitle URL contains server, token, and key components', () => {
  /**
   * Validates: Requirements 2.8
   */
  it('getExternalSubtitleUrl returns a string containing server, token, and key as substrings', () => {
    const arbUrlPart = fc.constantFrom(
      'http://192.168.1.1:32400', 'https://plex.example.com',
      'http://localhost:32400', 'https://my-server.tv',
    );
    const arbToken = fc.constantFrom(
      'abc123token', 'XyZ-789_tok', 'plextoken42', 'T0k3n',
    );
    const arbKey = fc.constantFrom(
      '/library/streams/12345', '/library/parts/99/streams/3',
      '/library/streams/1', '/library/parts/42/streams/7',
    );

    fc.assert(
      fc.property(arbUrlPart, arbToken, arbKey, (serverUrl, token, subtitleKey) => {
        const url = getExternalSubtitleUrl(serverUrl, token, subtitleKey);

        expect(url).toContain(serverUrl);
        expect(url).toContain(token);
        expect(url).toContain(subtitleKey);
      }),
      { numRuns: 100 },
    );
  });
});
