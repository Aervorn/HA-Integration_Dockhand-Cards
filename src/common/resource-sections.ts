import { html, nothing, type TemplateResult } from 'lit';
import type { ResolvedEntity } from './entity-resolver';
import type { HomeAssistant } from './ha-types';
import { barColorClass, bytesState, formatBytes, formatPercent, memoryParts, numericState } from './format';
import { renderFitParts } from './fit-parts';
import { renderIcon, onKeydownActivate } from './icon';
import { t } from './i18n-card';

/** The eight resource-stat entities ha-dockhand creates for a container
 * and, as totals, for a stack — same keys on both, so the Container and
 * Stack cards render them through one implementation. */
export type ResourceKey = 'cpuPercent' | 'memoryUsage' | 'memoryPercent' | 'memoryLimit' | 'networkRx' | 'networkTx' | 'blockRead' | 'blockWrite';

export const RESOURCE_KEYS: ResourceKey[] = ['cpuPercent', 'memoryUsage', 'memoryPercent', 'memoryLimit', 'networkRx', 'networkTx', 'blockRead', 'blockWrite'];

/** A stack has every one except memoryPercent: Dockhand reports no memory
 * percentage for a stack, so its bar is worked out from usage and limit. */
export const STACK_RESOURCE_KEYS = RESOURCE_KEYS.filter((k): k is Exclude<ResourceKey, 'memoryPercent'> => k !== 'memoryPercent');

type ResourceEntities = Partial<Record<ResourceKey, ResolvedEntity<string>>>;
type MoreInfo = (entityId: string | undefined) => void;

/** CPU and memory bars. Nothing when neither has a value (stats turned
 * off, or nothing running). Without a memory percentage entity (a stack's
 * totals), the bar is usage over limit and opens the usage entity. */
export function renderResourceMetrics(hass: HomeAssistant | undefined, s: ResourceEntities, moreInfo: MoreInfo): TemplateResult | typeof nothing {
  const cpu = numericState(s.cpuPercent?.state.state);
  const memUsed = bytesState(s.memoryUsage?.state);
  const memLimit = bytesState(s.memoryLimit?.state);
  const memEntity = s.memoryPercent ?? s.memoryUsage;
  const mem = s.memoryPercent ? numericState(s.memoryPercent.state.state) : memUsed !== undefined && memLimit ? (memUsed / memLimit) * 100 : undefined;
  if (cpu === undefined && mem === undefined) return nothing;

  return html`
    <div class="section">
      ${cpu !== undefined
        ? html`
            <div class="stacked-pair">
              <div
                class="row clickable"
                tabindex="0"
                role="button"
                @click=${() => moreInfo(s.cpuPercent?.entityId)}
                @keydown=${onKeydownActivate(() => moreInfo(s.cpuPercent?.entityId))}
              >
                ${renderIcon({ baseClass: 'row-icon', hass, stateObj: s.cpuPercent!.state, text: t(hass, 'label_cpu'), static: true })}
                <span class="row-right">${formatPercent(cpu, hass)}</span>
              </div>
              <div class="bar-track"><div class="bar-fill ${barColorClass(cpu)}" style="width:${Math.min(cpu, 100)}%"></div></div>
            </div>
          `
        : nothing}
      ${mem !== undefined
        ? html`
            <div class="stacked-pair">
              <div
                class="row clickable"
                tabindex="0"
                role="button"
                @click=${() => moreInfo(memEntity?.entityId)}
                @keydown=${onKeydownActivate(() => moreInfo(memEntity?.entityId))}
              >
                ${renderIcon({ baseClass: 'row-icon', hass, stateObj: memEntity!.state, text: t(hass, 'label_memory'), static: true })}
                ${renderFitParts(
                  s.memoryPercent
                    ? memoryParts(mem!, memUsed, memLimit, hass)
                    : // Like Dockhand's Stacks page: usage over limit, no percentage.
                      [formatBytes(memUsed!, hass), ...(memLimit ? [`/ ${formatBytes(memLimit, hass)}`] : [])]
                )}
              </div>
              <div class="bar-track"><div class="bar-fill ${barColorClass(mem)}" style="width:${Math.min(mem, 100)}%"></div></div>
            </div>
          `
        : nothing}
    </div>
  `;
}

/** Network and disk totals in a two-column grid. Nothing when none of
 * them has a value. */
export function renderResourceIo(hass: HomeAssistant | undefined, s: ResourceEntities, moreInfo: MoreInfo): TemplateResult | typeof nothing {
  const items = [
    { icon: 'mdi:download-network', label: t(hass, 'label_network_rx'), entry: s.networkRx },
    { icon: 'mdi:upload-network', label: t(hass, 'label_network_tx'), entry: s.networkTx },
    { icon: 'mdi:database-arrow-down', label: t(hass, 'label_block_read'), entry: s.blockRead },
    { icon: 'mdi:database-arrow-up', label: t(hass, 'label_block_write'), entry: s.blockWrite }
  ];
  const available = items.flatMap((i) => {
    const bytes = bytesState(i.entry?.state);
    return i.entry && bytes !== undefined ? [{ ...i, bytes }] : [];
  });
  if (available.length === 0) return nothing;

  return html`
    <div class="grid-2">
      ${available.map(
        (item) => html`
          <div
            class="row clickable"
            tabindex="0"
            role="button"
            @click=${() => moreInfo(item.entry?.entityId)}
            @keydown=${onKeydownActivate(() => moreInfo(item.entry?.entityId))}
          >
            ${renderIcon({ baseClass: 'row-icon', icon: item.icon, text: item.label, static: true })}
            <span class="row-right">${formatBytes(item.bytes, hass)}</span>
          </div>
        `
      )}
    </div>
  `;
}
