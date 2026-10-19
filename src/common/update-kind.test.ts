import { describe, it, expect } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { updateKindIcon, updateStatus } from './update-kind';

function entity(state: string, attributes: Record<string, unknown>): HassEntity {
  return { entity_id: 'update.x', state, attributes, context: { id: '', parent_id: null, user_id: null }, last_changed: '', last_updated: '' } as HassEntity;
}
const hass = { language: 'en' } as Parameters<typeof updateKindIcon>[0];

describe('updateStatus', () => {
  it('is undefined with no entity, or an off one', () => {
    expect(updateStatus(undefined)).toBeUndefined();
    expect(updateStatus(entity('off', {}))).toBeUndefined();
  });

  it('tells the four kinds apart', () => {
    expect(updateStatus(entity('on', { latest_version: 'update-pending' }))?.kind).toBe('installable');
    expect(updateStatus(entity('on', { latest_version: '17', newer_version: '17' }))?.kind).toBe('tag');
    expect(updateStatus(entity('on', { latest_version: 'update-pending', pinned_digest_moved: true }))?.kind).toBe('pinned');
    expect(updateStatus(entity('on', { latest_version: 'update-pending', update_held_hours: 4 }))).toMatchObject({ kind: 'held', heldHours: 4 });
    expect(updateStatus(entity('on', { latest_version: 'update-pending', update_held_hours: 0 }))).toMatchObject({ kind: 'held', heldHours: 0 });
  });

  it('keeps the newer tag alongside an installable update or a pinned digest', () => {
    expect(updateStatus(entity('on', { latest_version: 'update-pending', newer_version: '18' }))?.newerVersion?.tag).toBe('18');
    expect(updateStatus(entity('on', { latest_version: 'abc', pinned_digest_moved: true, newer_version: '18' }))?.newerVersion?.tag).toBe('18');
  });
});

describe('updateKindIcon', () => {
  it('uses the update color for what wants attention and grey for what does not', () => {
    expect(updateKindIcon(hass, { kind: 'installable' })).toMatchObject({ icon: 'mdi:arrow-up-circle', color: 'var(--dockhand-status-warn-color)' });
    expect(updateKindIcon(hass, { kind: 'pinned' })).toMatchObject({ icon: 'mdi:pin-outline', color: 'var(--dockhand-status-warn-color)' });
    expect(updateKindIcon(hass, { kind: 'held', heldHours: 2 })).toMatchObject({ icon: 'mdi:clock-outline', color: 'var(--secondary-text-color)' });
    expect(updateKindIcon(hass, { kind: 'tag' })).toMatchObject({ icon: 'mdi:tag-arrow-up-outline', title: 'Update available' });
  });
});
