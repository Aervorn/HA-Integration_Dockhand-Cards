import { describe, it, expect } from 'vitest';
import { isVersionTagOnly, newerVersionTag, versionTagTooltip } from './version-tag';
import { makeState } from './test-fixtures';

const update = (attributes: Record<string, unknown>) => makeState({ entity_id: 'update.a', state: 'on', attributes });

describe('newerVersionTag', () => {
  it('reads ha-dockhand’s newer_version attributes', () => {
    expect(newerVersionTag(update({ newer_version: '17.0', newer_version_bump: 'major', newer_versions_count: 3 }))).toEqual({ tag: '17.0', bump: 'major', count: 3 });
  });

  it('defaults the count to 1 and leaves bump out when they are missing', () => {
    expect(newerVersionTag(update({ newer_version: '17.0' }))).toEqual({ tag: '17.0', bump: undefined, count: 1 });
  });

  it('is undefined when the attribute is missing, empty or not a string', () => {
    expect(newerVersionTag(undefined)).toBeUndefined();
    expect(newerVersionTag(update({}))).toBeUndefined();
    expect(newerVersionTag(update({ newer_version: '' }))).toBeUndefined();
    expect(newerVersionTag(update({ newer_version: 17 }))).toBeUndefined();
  });
});

describe('isVersionTagOnly', () => {
  const newer = { tag: '17.0', count: 1 };
  it('is true only when the newer tag is also the latest version', () => {
    expect(isVersionTagOnly('17.0', newer)).toBe(true);
    expect(isVersionTagOnly('update-pending', newer)).toBe(false);
    expect(isVersionTagOnly('17.0', undefined)).toBe(false);
    expect(isVersionTagOnly(undefined, undefined)).toBe(false);
  });
});

describe('versionTagTooltip', () => {
  it('matches the lines of Dockhand’s own badge tooltip', () => {
    expect(versionTagTooltip(undefined, { tag: '17.6', bump: 'minor', count: 3 }).split('\n')).toEqual([
      'Newer version available',
      'Move to 17.6 (minor)',
      '3 versions ahead of the tag you run.',
      "Change the container's image tag to move to it."
    ]);
  });

  it('leaves out the bump when unknown and the count line for a single version', () => {
    expect(versionTagTooltip(undefined, { tag: '17.6', count: 1 }).split('\n')).toEqual([
      'Newer version available',
      'Move to 17.6',
      "Change the container's image tag to move to it."
    ]);
  });
});
