# Vendored: DietrichGebert/ponytail

"Lazy senior dev" skills for Claude Code: the smallest change that fully solves the task, with one small test for
risky logic, and a closing line on what was skipped. Copied into this repo so every teammate gets them without installing
a plugin.

- Source: https://github.com/DietrichGebert/ponytail
- Version: 5.3.3, commit `96608e0` (2026-10-29)
- License: MIT (full text below)

## What was copied

`skills/ponytail*` → `.claude/skills/`, unchanged: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`,
`ponytail-gain`, `ponytail-help`.

## What was left out, on purpose

The Claude Code plugin also runs Node.js hooks. They are not wired here, because a repo should not change things on
teammates' machines:

- A session-start hook that injects the rules into every session and writes a mode flag into `~/.claude/`.
- A status-line script that gets copied into `~/.claude/`, plus a prompt to edit your global `settings.json`.
- The "band" above the prompt and the task board, which log each task's cost and tokens to `~/.config/ponytail/` and can
  POST them to a webhook.

So in this repo, Ponytail turns on when a coding task matches the skill or when you type `/ponytail`
(`/ponytail lite|full|ultra`). It stays on for that conversation, not across sessions. `/ponytail band` and the config
file that `/ponytail-help` mentions need the full plugin. To get those, install it for yourself:
`/plugin marketplace add DietrichGebert/ponytail`, then `/plugin install ponytail@ponytail`.

## Updating

```bash
git clone --depth 1 https://github.com/DietrichGebert/ponytail.git /tmp/ponytail
cp -R /tmp/ponytail/skills/ponytail* .claude/skills/
# Review the diff, then update the version and commit hash in this file.
```

## License

MIT License

Copyright (c) 2026 DietrichGebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
