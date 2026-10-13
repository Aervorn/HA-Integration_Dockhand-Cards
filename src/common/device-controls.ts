import { html, nothing, type TemplateResult } from 'lit';
import { fireEvent } from 'custom-card-helpers';

import type { HassEntity } from 'home-assistant-js-websocket';

import type { HomeAssistant } from './ha-types';
import { findPrimaryEntityByDomain, resolveEntities } from './entity-resolver';
import { renderIcon } from './icon';
import { t } from './i18n-card';

declare global {
  interface HASSDomEvents {
    'hass-action': {
      config: {
        tap_action: {
          action: 'perform-action';
          perform_action: string;
          target: { entity_id: string };
          confirmation?: { text: string };
        };
      };
      action: 'tap';
    };
  }
}

const DEVICE_CONTROL_KEYS = {
  restart: 'restart',
  deploy: 'stack_deploy',
  gitDeploy: 'git_stack_deploy'
} as const;

export interface DeviceControls {
  running: { entityId: string; isOn: boolean };
  restartEntityId: string | null;
  /** A stack's redeploy (internal) or deploy / sync-from-git (git) button;
   * at most one exists per stack, none for a container or external stack. */
  deploy: { entityId: string; state: HassEntity; label: string | undefined } | null;
}

/** The start/stop/restart controls to render for a container or stack
 * device, or null for none. Keyed off the device's running switch:
 * ha-dockhand doesn't create one for a system container or a stack holding
 * one, so their absence is what hides the controls there. Restart is offered
 * only while running — on a stopped device it would just start it,
 * duplicating the start button. A stack's deploy button is offered in either
 * state: for a git stack that isn't deployed, it's the way to deploy it. */
export function resolveDeviceControls(hass: HomeAssistant, deviceId: string, showControls: boolean | undefined): DeviceControls | null {
  if (showControls === false) return null;
  const running = findPrimaryEntityByDomain(hass, deviceId, 'switch');
  if (!running) return null;
  const isOn = running.state.state === 'on';
  const { found } = resolveEntities(hass, deviceId, DEVICE_CONTROL_KEYS, ['restart', 'deploy', 'gitDeploy']);
  const deploy = found.deploy ?? found.gitDeploy;
  return {
    running: { entityId: running.entityId, isOn },
    restartEntityId: isOn ? (found.restart?.entityId ?? null) : null,
    deploy: deploy ? { entityId: deploy.entityId, state: deploy.state, label: deployLabel(hass, deviceId, deploy.state) } : null
  };
}

/** The deploy button's own name. ha-dockhand relabels the git one "Deploy"
 * or "Sync from Git" to match Dockhand, so the card shows whatever the
 * entity is called rather than a fixed string. Falls back to the friendly
 * name minus the device-name prefix HA builds it with. */
function deployLabel(hass: HomeAssistant, deviceId: string, state: HassEntity): string | undefined {
  const formatted = hass.formatEntityName?.(state, { type: 'entity' });
  if (formatted) return formatted;
  const friendly = state.attributes.friendly_name;
  const device = hass.devices?.[deviceId];
  const deviceName = device?.name_by_user || device?.name;
  if (typeof friendly !== 'string' || !friendly) return undefined;
  return deviceName && friendly.startsWith(`${deviceName} `) ? friendly.slice(deviceName.length + 1) : undefined;
}

/** Routed through HA's own action handler rather than hass.callService so
 * stop/restart get HA's native confirmation dialog, and a failure surfaces
 * as HA's standard error toast (with ha-dockhand's translated message). */
function performAction(host: HTMLElement, action: string, entityId: string, confirmText?: string): void {
  fireEvent(host, 'hass-action', {
    config: {
      tap_action: {
        action: 'perform-action',
        perform_action: action,
        target: { entity_id: entityId },
        ...(confirmText ? { confirmation: { text: confirmText } } : {})
      }
    },
    action: 'tap'
  });
}

/** A row of labeled buttons for `controls`, placed in the card body under
 * the status rather than in the header, which has no room for them beside
 * a long device name. Actions fire from `host` (the card). */
export function renderDeviceControls(host: HTMLElement, hass: HomeAssistant | undefined, controls: DeviceControls, name: string): TemplateResult {
  const { entityId, isOn } = controls.running;
  const restartEntityId = controls.restartEntityId;
  const button = (icon: string, label: string, onClick: () => void) => renderIcon({ baseClass: 'control-button', icon, text: label, title: label, onClick });
  return html`
    <div class="control-row">
      ${isOn
        ? button('mdi:stop', t(hass, 'control_stop'), () => performAction(host, 'switch.turn_off', entityId, t(hass, 'control_stop_confirm', { name })))
        : button('mdi:play', t(hass, 'control_start'), () => performAction(host, 'switch.turn_on', entityId))}
      ${restartEntityId
        ? button('mdi:restart', t(hass, 'control_restart'), () =>
            performAction(host, 'button.press', restartEntityId, t(hass, 'control_restart_confirm', { name }))
          )
        : nothing}
      ${controls.deploy ? renderDeploy(host, hass, controls.deploy, name) : nothing}
    </div>
  `;
}

/** Uses the entity's own icon (rocket or refresh for the git button) and
 * name, so the card stays in step with whatever the integration shows. */
function renderDeploy(host: HTMLElement, hass: HomeAssistant | undefined, deploy: NonNullable<DeviceControls['deploy']>, name: string): TemplateResult {
  const action = deploy.label ?? t(hass, 'control_deploy');
  return renderIcon({
    baseClass: 'control-button',
    hass,
    stateObj: deploy.state,
    text: action,
    title: action,
    onClick: () => performAction(host, 'button.press', deploy.entityId, t(hass, 'control_deploy_confirm', { name, action }))
  });
}
