"""Rewrites upstream's README.md for this fork. Run after every sync.

Idempotent: starts from whatever README.md is checked out (upstream's, since
the sync drops the previous generated commit first), prepends the fork header
and points the HACS button and badges to this fork. Patterns that no longer
match upstream's README are reported as warnings, never as failures, so a
README rewrite upstream can't block a release.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
HEADER = pathlib.Path(__file__).with_name("README-header.md").read_text().rstrip() + "\n\n"
FORK = "Aervorn/HA-Integration_Dockhand-Cards"
OWNER, REPO = FORK.split("/")

RULES = [
    ("HACS button",
     r"(my\.home-assistant\.io/redirect/hacs_repository/\?owner=)[^&]+(&repository=)[^&)]+",
     rf"\g<1>{OWNER}\g<2>{REPO}"),
    ("Release badge",
     r"\[!\[Release\]\(https://img\.shields\.io/github/v/release/[^/]+/[^?)]+(\?[^)]*)?\)\]\(https://github\.com/[^)]+/releases\)",
     rf"[![Release](https://img.shields.io/github/v/release/{FORK}\g<1>)](https://github.com/{FORK}/releases)"),
    ("Validation badge",
     r"\[!\[Validation\]\(https://img\.shields\.io/github/actions/workflow/status/[^)]+\)\]\([^)]+\)",
     f"[![Upstream sync](https://img.shields.io/github/actions/workflow/status/{FORK}/sync-upstream.yml"
     f"?label=upstream%20sync&style=for-the-badge)](https://github.com/{FORK}/actions/workflows/sync-upstream.yml)"),
]

text = README.read_text()
if text.startswith(HEADER.splitlines()[0]):
    sys.exit("README.md already carries the fork header: run this on upstream's README only")
for label, pattern, repl in RULES:
    text, n = re.subn(pattern, repl, text)
    print(f"{label}: {n} replacement(s)" if n else f"::warning::{label} not found in upstream README")
README.write_text(HEADER + text)
