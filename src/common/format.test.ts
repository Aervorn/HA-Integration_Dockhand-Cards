import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatBytes, barColorClass, formatRelativeTime, getInstanceLabel, numericState, bytesState, memoryParts, formatPercent } from './format';

describe('numericState', () => {
  it('parses a numeric state, including zero and negatives', () => {
    expect(numericState('4.2')).toBe(4.2);
    expect(numericState('0')).toBe(0);
    expect(numericState('-1')).toBe(-1);
  });

  it("returns undefined for HA's no-value states rather than NaN", () => {
    expect(numericState('unavailable')).toBeUndefined();
    expect(numericState('unknown')).toBeUndefined();
  });

  it('returns undefined for a missing, empty, or non-finite state', () => {
    expect(numericState(undefined)).toBeUndefined();
    expect(numericState('')).toBeUndefined();
    expect(numericState('Infinity')).toBeUndefined();
  });
});

describe('bytesState', () => {
  const st = (state: string, unit?: string) => ({ state, attributes: unit === undefined ? {} : { unit_of_measurement: unit } });

  it("converts HA's suggested MiB display unit back to bytes", () => {
    expect(bytesState(st('343.27734375', 'MiB'))).toBe(343.27734375 * 1024 ** 2);
  });

  it('honours a display unit the user picked instead', () => {
    expect(bytesState(st('15.6', 'GiB'))).toBeCloseTo(15.6 * 1024 ** 3);
    expect(bytesState(st('2', 'GB'))).toBe(2e9);
    expect(bytesState(st('8', 'bit'))).toBe(1);
  });

  it('treats a state with no unit as bytes', () => {
    expect(bytesState(st('512'))).toBe(512);
  });

  it('returns undefined for an unrecognised unit or a non-numeric state', () => {
    expect(bytesState(st('5', 'furlongs'))).toBeUndefined();
    expect(bytesState(st('unavailable', 'MiB'))).toBeUndefined();
    expect(bytesState(undefined)).toBeUndefined();
  });
});

describe('memoryParts', () => {
  it('splits percent, used and total, each separator with the piece after it', () => {
    expect(memoryParts(8.1, 343 * 1024 ** 2, 15.6 * 1024 ** 3)).toEqual(['8.1%', '· 343.0 MB', '/ 15.6 GB']);
  });

  it('has no total piece when there is no total', () => {
    expect(memoryParts(8.1, 2048, undefined)).toEqual(['8.1%', '· 2.0 KB']);
  });

  it('is the percentage alone with no used figure', () => {
    expect(memoryParts(8.1, undefined, 1024)).toEqual(['8.1%']);
  });
});

describe('formatBytes', () => {
  it('handles null/undefined/NaN as a dash', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
  });

  it('formats zero explicitly', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('picks the right unit and rounds to one decimal above bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});

describe('barColorClass', () => {
  it('matches Dockhand thresholds: >=90 red, >=70 amber, else green', () => {
    expect(barColorClass(0)).toBe('ok');
    expect(barColorClass(69.9)).toBe('ok');
    expect(barColorClass(70)).toBe('warn');
    expect(barColorClass(89.9)).toBe('warn');
    expect(barColorClass(90)).toBe('error');
    expect(barColorClass(100)).toBe('error');
  });
});

describe('getInstanceLabel', () => {
  it('returns null for null/undefined/malformed input', () => {
    expect(getInstanceLabel(null)).toBeNull();
    expect(getInstanceLabel(undefined)).toBeNull();
    expect(getInstanceLabel('not a url')).toBeNull();
    expect(getInstanceLabel('')).toBeNull();
  });

  it('returns the host (hostname:port) of a configuration_url, dropping scheme and path', () => {
    expect(getInstanceLabel('http://192.168.1.50:3000/schedules')).toBe('192.168.1.50:3000');
    expect(getInstanceLabel('https://dockhand.example.com/settings')).toBe('dockhand.example.com');
  });

  it('differs for two instances on the same host but different ports — the common self-hosted case', () => {
    expect(getInstanceLabel('http://192.168.1.50:3000/schedules')).not.toBe(getInstanceLabel('http://192.168.1.50:3001/schedules'));
  });

  it('is stable across different pages on the same Dockhand instance', () => {
    expect(getInstanceLabel('http://dockhand.local:3000/schedules')).toBe(getInstanceLabel('http://dockhand.local:3000/settings'));
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-01-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for missing/invalid input', () => {
    expect(formatRelativeTime(null)).toBeNull();
    expect(formatRelativeTime(undefined)).toBeNull();
    expect(formatRelativeTime('not-a-date')).toBeNull();
  });

  it('formats future timestamps as "in Nx"', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 30_000).toISOString())).toBe('now');
    expect(formatRelativeTime(new Date(NOW.getTime() + 4 * 60_000).toISOString())).toBe('in 4m');
    expect(formatRelativeTime(new Date(NOW.getTime() + 3 * 3_600_000).toISOString())).toBe('in 3h');
    expect(formatRelativeTime(new Date(NOW.getTime() + 2 * 86_400_000).toISOString())).toBe('in 2d');
  });

  it('formats past timestamps as "Nx ago"', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 45_000).toISOString())).toBe('now');
    expect(formatRelativeTime(new Date(NOW.getTime() - 10 * 60_000).toISOString())).toBe('10m ago');
    expect(formatRelativeTime(new Date(NOW.getTime() - 2 * 3_600_000).toISOString())).toBe('2h ago');
    expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 86_400_000).toISOString())).toBe('5d ago');
  });

  it('uses the Home Assistant language', () => {
    const de = { language: 'de', locale: { language: 'de', number_format: 'language' } } as never;
    expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), de)).toBe('vor 3 Std.');
    expect(formatRelativeTime(new Date(NOW.getTime() + 2 * 3_600_000).toISOString(), { language: 'fr' } as never)).toMatch(/^dans 2\sh$/);
  });
});

describe('locale-aware numbers', () => {
  it("follow the user's Home Assistant number format", () => {
    const de = { locale: { language: 'de', number_format: 'language' } } as never;
    expect(formatPercent(4.21, de)).toBe('4,2%');
    expect(formatBytes(1536, de)).toBe('1,5 KB');
    expect(formatPercent(4.21, undefined)).toBe('4.2%');
  });
});
