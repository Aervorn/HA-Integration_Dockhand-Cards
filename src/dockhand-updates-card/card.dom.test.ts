// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { DockhandUpdatesCard } from './card';
import { makeDevice, makeEntity, makeHass, makeState } from '../common/test-fixtures';
import type { HomeAssistant } from '../common/ha-types';

type UpdatesCardElement = HTMLElement & {
  hass: HomeAssistant;
  setConfig(config: Record<string, unknown>): void;
  updateComplete: Promise<boolean>;
};

/** A hass whose callService stays pending until the test resolves it, so
 * the card can be inspected mid-request. */
type NodeProcess = { on(event: string, listener: (...args: unknown[]) => void): void; off(event: string, listener: (...args: unknown[]) => void): void };
const nodeProcess = (globalThis as unknown as { process: NodeProcess }).process;

function setup() {
  const env = makeDevice({ id: 'env-device', identifiers: [['dockhand', 'entry_env_1']], name: 'Nebula' });
  const hass = makeHass({
    devices: [env],
    entities: [
      makeEntity({ entity_id: 'button.nebula_check_updates', device_id: 'env-device', translation_key: 'check_updates' }),
      makeEntity({ entity_id: 'button.nebula_update_all', device_id: 'env-device', translation_key: 'env_bulk_update' })
    ],
    states: [
      makeState({ entity_id: 'button.nebula_check_updates', state: 'unknown' }),
      makeState({ entity_id: 'button.nebula_update_all', state: 'unknown' })
    ]
  });
  const pending: (() => void)[] = [];
  const callService = vi.fn(() => new Promise<void>((resolve) => pending.push(resolve)));
  (hass as unknown as { callService: typeof callService }).callService = callService;
  return { hass, callService, finish: () => pending.splice(0).forEach((resolve) => resolve()) };
}

const TAG = 'dockhand-updates-card-under-test';
if (!customElements.get(TAG)) customElements.define(TAG, DockhandUpdatesCard);

async function mount(hass: HomeAssistant): Promise<UpdatesCardElement> {
  const card = document.createElement(TAG) as UpdatesCardElement;
  card.setConfig({ type: 'custom:dockhand-updates-card' });
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
}

function headerButton(card: UpdatesCardElement, title: RegExp): HTMLElement {
  const buttons = [...card.shadowRoot!.querySelectorAll<HTMLElement>('.header-right .header-icon')];
  const match = buttons.find((b) => title.test(b.getAttribute('title') ?? ''));
  if (!match) throw new Error(`no header button titled ${title}`);
  return match;
}

describe.each([
  { label: 'Check for updates', idle: /^Check for updates$/, busy: /^Checking…$/, entity: 'button.nebula_check_updates' },
  { label: 'Update all', idle: /^Update all$/, busy: /^Updating…$/, entity: 'button.nebula_update_all' }
])('Updates card "$label" button while its request is in flight', ({ idle, busy, entity }) => {
  it('shows a spinner and is disabled, then returns to normal once the request settles', async () => {
    const { hass, callService, finish } = setup();
    const card = await mount(hass);

    const button = headerButton(card, idle);
    expect(button.className).toContain('clickable');
    expect(button.getAttribute('tabindex')).toBe('0');
    expect(button.querySelector('.spinner')).toBeNull();

    button.click();
    await card.updateComplete;

    const busyButton = headerButton(card, busy);
    expect(callService).toHaveBeenCalledWith('button', 'press', {}, { entity_id: [entity] });
    expect(busyButton.className).toContain('link-unavailable');
    expect(busyButton.className).not.toContain('clickable');
    expect(busyButton.getAttribute('tabindex')).toBeNull();
    expect(busyButton.getAttribute('aria-busy')).toBe('true');
    expect(busyButton.querySelector('.spinner')).not.toBeNull();

    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const restored = headerButton(card, idle);
    expect(restored.className).toContain('clickable');
    expect(restored.getAttribute('tabindex')).toBe('0');
    expect(restored.querySelector('.spinner')).toBeNull();
    card.remove();
  });

  it('ignores a second click while the first request is still running', async () => {
    const { hass, callService, finish } = setup();
    const card = await mount(hass);

    headerButton(card, idle).click();
    await card.updateComplete;
    headerButton(card, busy).click();
    await card.updateComplete;

    expect(callService).toHaveBeenCalledTimes(1);
    finish();
    card.remove();
  });

  it('returns to normal without an unhandled rejection when the request fails', async () => {
    const { hass } = setup();
    (hass as unknown as { callService: () => Promise<never> }).callService = () => Promise.reject(new Error('action_failed'));
    const card = await mount(hass);
    const unhandled = vi.fn();
    nodeProcess.on('unhandledRejection', unhandled);

    headerButton(card, idle).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(headerButton(card, idle).getAttribute('tabindex')).toBe('0');
    expect(unhandled).not.toHaveBeenCalled();
    nodeProcess.off('unhandledRejection', unhandled);
    card.remove();
  });
});
