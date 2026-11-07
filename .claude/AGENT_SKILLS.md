# Vendored: addyosmani/agent-skills

Engineering-workflow skills for Claude Code, copied into this repo so every teammate gets them without installing a plugin.

- Source: https://github.com/addyosmani/agent-skills
- Version: 0.6.15, commit `301b02b` (2026-11-01)
- License: MIT (full text below)

## What was copied

| Upstream path        | Here                  | Notes |
| -------------------- | --------------------- | ----- |
| `skills/*`           | `.claude/skills/*`    | 25 skills, unchanged |
| `references/*.md`    | `.claude/references/` | Checklists; the skills' `../../references/` links resolve here |
| `agents/*.md`        | `.claude/agents/`     | `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` |
| `.claude/commands/*` | `.claude/commands/`   | See changes below |

## Local changes

- The plugin prefix `agent-skills:` was removed from the commands, because the skills are installed as project
  skills here, not as a plugin.
- `/review` was renamed to `/review-code` and `/plan` to `/plan-tasks`, because Claude Code has built-in commands with
  those names. Skill text that mentions `/review` or `/plan` means these.
- Not copied: the hooks (upstream says not to wire its session-start router on hosts that route skills natively, like
  Claude Code), the Gemini, Codex and Antigravity adapters, the evals, and the contributor scripts.

## Updating

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
cp -R /tmp/agent-skills/skills/* .claude/skills/
cp /tmp/agent-skills/references/*.md .claude/references/
cp /tmp/agent-skills/agents/*.md .claude/agents/
# Re-apply the command changes above, review the diff, then update the commit hash in this file.
```

## License

MIT License

Copyright (c) 2025 Addy Osmani

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
