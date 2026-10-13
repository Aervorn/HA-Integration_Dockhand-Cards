# Contributing

## Development setup

```bash
npm ci                 # once, after cloning or pulling new dependencies — installs exactly
                        # what's pinned in package-lock.json (this is what CI runs; npm install
                        # is NOT the same command and can leave a stale node_modules/lockfile
                        # combination in place instead of correcting it)
npm run watch          # rebuilds dist/ha-dockhand-cards.js on every save while iterating
npm run verify         # typecheck + lint + test + build, in that order — run this before every commit
```

`verify` runs exactly what CI runs, and — as of this change — so does the install step before it:
CI uses `npm ci`, so local setup does too, rather than the superficially-similar `npm install`.
The difference matters here specifically because `npm install` won't necessarily pull in a newer
patched version of a transitive dependency that still satisfies the existing lockfile's pinned
range, so a security advisory fixed upstream can keep showing up locally even after repeated
`npm install` runs on an old clone. `npm ci` deletes `node_modules` first and installs strictly
from the lockfile — if `package-lock.json` is genuinely stale, `npm ci` fails loudly (package.json
and the lockfile disagree) instead of silently working around it, which is the correct behavior
here: surface the staleness rather than mask it.

Only reach for `npm install` when you're deliberately adding/removing/bumping a dependency in
`package.json` — it's the one command that's allowed to rewrite `package-lock.json`. If you
suspect the committed lockfile itself has drifted (e.g. `npm audit` reports something CI doesn't),
regenerate it deliberately with `rm -rf node_modules package-lock.json && npm install`, verify
`npm audit` is clean, then commit the regenerated `package-lock.json` — don't leave that as a
silent side effect of routine `npm install` runs.

`package-lock.json` **is** committed to this repo (not gitignored) — deliberately, since this is
an application with a build step, not a published npm package other projects `npm install` as a
dependency; a committed lockfile is what actually makes "clone this repo and run `npm ci`"
reproducible across machines and CI, rather than everyone resolving dependency ranges
independently at install time.

The individual `verify` steps (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`)
are also available on their own for faster iteration on just one of them.

There's no separate `scripts/` folder the way ha-dockhand has one — for a Python integration with
no build step, small shell/Python scripts are the natural place for repeatable tasks. Here,
`package.json`'s `"scripts"` block **is** that place; splitting `verify` out into a shell script
would just be an extra layer between you and `npm run verify`.

**Don't bump `typescript` past 6.x right now.** TypeScript 7.0 (a Go-native compiler rewrite,
GA'd July 2026) doesn't ship a stable programmatic API until 7.1 — `typescript-eslint` can't run
against it yet and currently hard-crashes rather than just warning (confirmed via live GitHub
issues, not a hypothetical). TypeScript 6.x itself is fine — verified by actually installing
6.0.3 and re-running `npm run verify` clean, not just checking the version number. The `^6.0.3`
range in `package.json` can't reach 7.x, since a caret range stops below the next major — that's
deliberate, not an oversight. Revisit once `typescript-eslint` adds TS7 support (tracked
upstream, expected around TS 7.1, ~October 2026).

## Before submitting a PR

Run `npm run verify` — see above. Read `docs/QUALITY.md` for the checklist this repo is held to,
and `docs/ARCHITECTURE.md` for how the pieces fit together before touching entity resolution,
editor components, CSS/container-query patterns, or anything about the card-picker preview.

## Testing against a real Home Assistant instance

`npm run watch` keeps `dist/ha-dockhand-cards.js` up to date on save. Point a Lovelace resource
at it directly — e.g. if you're running HA in a container with this repo bind-mounted, add a
resource pointing at wherever `dist/` ends up under `<config>/www/`; if not, copy
`dist/ha-dockhand-cards.js` into `<config>/www/` after each build (or symlink it once, so `watch`
keeps it current without re-copying). Either way, a hard browser refresh picks up each rebuild —
Home Assistant caches Lovelace resources aggressively.

## Regenerating README screenshots

See `tools/screenshot-harness/README.md`. It renders the real built card bundle against
fictional mock data in a headless browser — no real Home Assistant instance involved. Also
where to regenerate `icon-paths.json` after adding a new `mdi:` icon reference anywhere in the
cards, or the new icon renders blank in screenshots.

## Translations

Home Assistant's own translation system only covers backend-declared strings (integrations'
`strings.json`) — it has no channel for a Lovelace card's own UI text, so this repo bundles its
own per-locale dictionaries, looked up from `hass.language` at render time: `src/common/i18n-card.ts`
for everything a card renders and `src/common/i18n-editor.ts` for the editors. Same locale list as
ha-dockhand (de, es, fr, it, nb, nl, pl, pt, sv, zh-Hans), machine-translated the same way, using
ha-dockhand's own terms where it has one (e.g. its translated stack/container/schedule names).

- **No hard-coded user-visible English** in a card or editor: use `t(hass, key, { placeholders })`.
- **State words** (`running`, `healthy`, `synced`, schedule types, event actions…) go through
  `stateLabel()` in `src/common/state-label.ts`. Pass the entity when the word is its state, so
  Home Assistant's own translation from ha-dockhand is used when there is one.
- **Numbers, sizes, percentages and times** go through `src/common/format.ts` so they follow the
  user's language and number format.
- **Add a new string to every locale in the same pass** — no partially-translated locale files.
  `src/common/i18n.test.ts` fails on a missing or empty string, or a `{placeholder}` that doesn't
  match English.

## Accessibility

`tools/screenshot-harness/a11y.py` runs axe-core's WCAG 2.1 A/AA rules over every card and editor
in both themes (see the harness README). Run it after any change to a card's markup or colors;
it exits non-zero on any violation. Two habits it relies on:

- **Interactive things use `renderIcon()` or the `.row-target` pattern** so they get `tabindex`,
  `role="button"`, Enter/Space handling and a visible focus ring — and never put one clickable
  element inside another.
- **Use Home Assistant's theme colors unchanged.** Status and accent colors come from HA's
  theme (`--success-color`, `--primary-color`, …) and aren't adjusted for contrast, so the cards
  match the rest of HA; a user who needs more contrast chooses a theme for it. `a11y.py` excuses
  text in HA's default colors for that reason. Colored text uses the `--dockhand-*-text-color`
  properties so a theme can still tune words separately from icons.
- **Prefer HA's colors, keeping Dockhand's meaning.** Where Dockhand colors something by status
  or severity, map it onto HA's status colors (as the severities and event icons do) rather than
  copying Dockhand's palette. Dockhand colors with no HA equivalent (connection types, charts,
  disk usage, labels) keep Dockhand's defaults.
- **The repo's own colors must pass.** Text in a color that isn't HA's gets a readable version,
  mixed toward `--primary-text-color` (see `getLabelColors()`).
- **No color without a custom property.** Every color a card shows comes from a CSS custom
  property — HA's own where one fits, otherwise a `--dockhand-*` one with a default — set in CSS,
  never as a literal in a template or TypeScript, so a theme or card_mod can change it. List each
  new one in `docs/STYLING.md`.

## CHANGELOG discipline

Same discipline as ha-dockhand's own `CHANGELOG.md` — see the maintainer note at the top of that
file. Short version: entries describe net user-facing functionality, not the development
journey; a bug introduced and fixed within the same still-unreleased cycle doesn't get its own
entry, since there's nothing to disclose about something that never shipped broken.

Changes with no user-facing effect (dependency updates, test or build tooling, the screenshot
harness) still get a short entry under `### Internal`, saying what changed and why, so the
reasoning behind them is easy to find later.

## Versioning

This repo follows semver. The canonical policy lives in `ha-dockhand` (the primary repo this one
depends on) — see `docs/SEMVER.md` here for the pointer and the cards-specific notes that don't
belong in the shared doc. Decide the bump before working through the release flow below.

## Releasing

Same flow as ha-dockhand: bump `package.json`'s `version`, update `CHANGELOG.md`'s `[Unreleased]`
section into a dated one, commit, then push a `vX.Y.Z` tag. The release workflow verifies the tag
matches `package.json`, runs `npm run verify`, and creates a GitHub release with
`dist/ha-dockhand-cards.js` and `dist/ha-dockhand-cards-editor.js` attached as release assets (HACS
downloads every asset into the same folder, which is where the card loads the editor from) and the
matching CHANGELOG section as the release notes — `dist/` itself is gitignored and never committed, same as
`custom-cards/boilerplate-card` and most maintained HA cards (confirmed this is how HACS actually
resolves a plugin's file when it's not in the repo tree: it looks for a release asset matching
`hacs.json`'s `filename` first, falling back to the repo tree only if no matching asset exists).
`hacs.json`'s `filename` points HACS at that release asset.
