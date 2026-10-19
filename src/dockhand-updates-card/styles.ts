import { css } from 'lit';
import { sharedStyles } from '../common/shared-styles';

export const cardStyles = css`
  ${sharedStyles}

  .update-row .update-icon {
    color: var(--dockhand-status-warn-color);
  }
  /* Nothing to install and nothing to do yet: a newer tag needs the
   * container's image tag changed; a held update is waiting out Dockhand's
   * minimum image age. A moved digest on a pinned image keeps the update
   * color, as in Dockhand: it wants attention, just not from Install. */
  .update-row .update-icon.tag,
  .update-row .update-icon.held {
    color: var(--secondary-text-color);
  }
`;
