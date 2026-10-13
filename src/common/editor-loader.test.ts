import { describe, it, expect } from 'vitest';
import { editorUrl } from './editor-loader';

describe('editorUrl', () => {
  it("keeps HACS's version cache-buster, so an upgrade doesn't reuse a cached old editor", () => {
    expect(editorUrl('http://ha.local:8123/hacsfiles/ha-dockhand-cards/ha-dockhand-cards.js?hacstag=12345140')).toBe(
      'http://ha.local:8123/hacsfiles/ha-dockhand-cards/ha-dockhand-cards-editor.js?hacstag=12345140'
    );
  });

  it('works without a query string (a manual install)', () => {
    expect(editorUrl('http://ha.local:8123/local/ha-dockhand-cards.js')).toBe('http://ha.local:8123/local/ha-dockhand-cards-editor.js');
  });
});
