# Vendored: pbakaus/impeccable

Frontend design skill by Paul Bakaus: one `/impeccable` skill with 24 sub-commands (`shape`, `critique`, `audit`,
`polish`, `layout`, `typeset`, `colorize`, `animate`, `harden`, `live`, …) and a detector for common AI-design
anti-patterns. Copied into this repo so every teammate gets it without installing a plugin.

- Source: https://github.com/pbakaus/impeccable
- Version: 4.8.0 (engine 0.1.18), commit `687bc38` (2026-11-06)
- License: Apache 2.0, in `.claude/skills/impeccable/LICENSE` and `NOTICE.md`

## What was copied

| Upstream path                  | Here                           |
| ------------------------------ | ------------------------------ |
| `plugin/skills/impeccable/`    | `.claude/skills/impeccable/`, unchanged, plus `LICENSE` and `NOTICE.md` |
| `plugin/agents/impeccable-*.md`| `.claude/agents/`: asset producer, documenter, finish reviewer, manual-edit applier |

## The engine binary

The skill's commands call `.claude/skills/impeccable/scripts/impeccable`, a small shell launcher. On first use it
downloads a precompiled engine for your OS from the project's GitHub releases
(`github.com/pbakaus/impeccable/releases/download/engine-v0.1.18/…`), checks its SHA-256 against
`scripts/engine-checksums.txt`, refuses it on mismatch, and caches it in `~/.impeccable/`. Nothing is committed:
`scripts/bin/` is git-ignored. If the download is refused or offline, the skill falls back to reading `PRODUCT.md` and
`DESIGN.md` directly.

## What was left out

- The plugin's hooks, which run the engine after every Edit/Write and when each turn ends. To turn on the design
  detector for this project anyway, run `/impeccable hooks on` (and `/impeccable hooks off` to remove it).
- The adapters for other agents, the CLI, browser extension, VS Code extension, Rust engine sources, demos and tests.

## Files it may create

`PRODUCT.md` (via `/impeccable init`), `DESIGN.md` (via `/impeccable document`), and surface briefs and config under
`.impeccable/`. Commit them if they're useful to the team.

## Updating

```bash
git clone --depth 1 https://github.com/pbakaus/impeccable.git /tmp/impeccable
rm -rf .claude/skills/impeccable && cp -R /tmp/impeccable/plugin/skills/impeccable .claude/skills/impeccable
cp /tmp/impeccable/LICENSE /tmp/impeccable/NOTICE.md .claude/skills/impeccable/
cp /tmp/impeccable/plugin/agents/*.md .claude/agents/
# Review the diff (especially scripts/engine-checksums.txt), then update the version and commit hash in this file.
```
