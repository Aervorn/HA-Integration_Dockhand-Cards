import { html, type TemplateResult } from 'lit';

/**
 * A value made of pieces that drops pieces from the end, whole, when its
 * line is too narrow, instead of clipping mid-word: the pieces wrap, and the
 * one-line-high box (.fit-parts in shared-styles.ts) hides everything past
 * the first line. No width threshold, so it adapts to the actual values,
 * language and font size. The first piece always shows. The tooltip has the
 * whole value; screen readers read all of it either way.
 */
export function renderFitParts(parts: string[], className = 'row-right'): TemplateResult {
  return html`<span class="${className} fit-parts" title=${parts.join(' ')}>${parts.map((p) => html`<span>${p}</span>`)}</span>`;
}
