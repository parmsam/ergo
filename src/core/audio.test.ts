import { describe, expect, it } from 'vitest';
import { sessionTypeFor } from './audio';

describe('silent-switch audio session', () => {
  const chime = 1_000_000;
  it('holds "playback" from just before a chime until just after', () => {
    expect(sessionTypeFor([chime], chime - 3000)).toBe('auto');
    expect(sessionTypeFor([chime], chime - 2000)).toBe('playback');
    expect(sessionTypeFor([chime], chime + 2000)).toBe('playback');
    expect(sessionTypeFor([chime], chime + 3000)).toBe('auto');
  });
  it('is "auto" with nothing queued', () => {
    expect(sessionTypeFor([], chime)).toBe('auto');
  });
});
