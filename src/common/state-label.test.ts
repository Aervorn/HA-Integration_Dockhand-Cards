import { describe, it, expect } from 'vitest';
import { stateLabel } from './state-label';
import { makeHass, makeState } from './test-fixtures';
import type { HomeAssistant } from './ha-types';

const withLanguage = (language: string) => ({ ...makeHass({}), language, locale: { language } }) as unknown as HomeAssistant;

describe('stateLabel', () => {
  it("uses this repo's translation for a known value", () => {
    expect(stateLabel(withLanguage('de'), 'container_state', 'running')).toBe('Läuft');
    expect(stateLabel(withLanguage('en'), 'schedule_type', 'container_update')).toBe('Container update');
  });

  it("prefers Home Assistant's own translated state when the integration provides one", () => {
    const hass = { ...withLanguage('de'), formatEntityState: () => 'Ausstehend' } as unknown as HomeAssistant;
    const stateObj = makeState({ entity_id: 'sensor.core_git_sync', state: 'pending' });
    expect(stateLabel(hass, 'stack_status', 'pending', stateObj)).toBe('Ausstehend');
  });

  it('falls back to its own translation when Home Assistant returns the raw state unchanged', () => {
    const hass = { ...withLanguage('de'), formatEntityState: (s: { state: string }) => s.state } as unknown as HomeAssistant;
    const stateObj = makeState({ entity_id: 'sensor.web_state', state: 'exited' });
    expect(stateLabel(hass, 'container_state', 'exited', stateObj)).toBe('Beendet');
  });

  it('tidies up a value it has no translation for, rather than dropping it', () => {
    expect(stateLabel(withLanguage('fr'), 'container_state', 'brand_new-state')).toBe('Brand new state');
  });
});
