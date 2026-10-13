import type { HassEntity } from 'home-assistant-js-websocket';

import type { HomeAssistant } from './ha-types';
import { tMaybe } from './i18n-card';

/** Which family of raw values a word belongs to — the prefix of its
 * `<kind>_<value>` key in i18n-card.ts. */
export type StateKind = 'container_state' | 'health' | 'stack_status' | 'stack_type' | 'git_sync_status' | 'schedule_status' | 'schedule_type' | 'event';

function humanize(raw: string): string {
  const s = raw.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A raw state/value word (`running`, `healthy`, `container_update`, …) as
 * text for the current language.
 *
 * When the word is an entity's own state and that entity is passed in,
 * Home Assistant's own formatted state is preferred if it differs from the
 * raw value — that means the integration provides a translation for it,
 * which is then the same wording HA shows everywhere else. Otherwise this
 * repo's own translation, then the raw value tidied up (an unrecognised
 * value Dockhand adds later still reads sensibly rather than disappearing).
 */
export function stateLabel(hass: HomeAssistant | undefined, kind: StateKind, raw: string, stateObj?: HassEntity): string {
  if (stateObj && hass?.formatEntityState && stateObj.state === raw) {
    const formatted = hass.formatEntityState(stateObj);
    if (formatted && formatted !== raw) return formatted;
  }
  return tMaybe(hass, `${kind}_${raw.toLowerCase().replace(/[\s-]+/g, '_')}`) ?? humanize(raw);
}
