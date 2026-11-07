# Vendored: emilkowalski/skills

UI design and animation skills by Emil Kowalski (Sonner, Vaul; previously Vercel and Linear): easing and duration
choices, animation reviews, frame-drop fixes, mobile web polish, and worst-case-data UI testing. Copied into this repo
so every teammate gets them without installing anything.

- Source: https://github.com/emilkowalski/skills
- Commit: `c8a7962` (2026-11-04)
- License: MIT (full text below)

## What was copied

15 of the 17 skills, unchanged, into `.claude/skills/`:

| Skill | What it does |
| ----- | ------------ |
| `emil-design-eng` | Main skill: animation and design taste |
| `animate` | Build an animation with the right curve, duration and properties |
| `choreograph` | Coordinate several elements that animate together |
| `review-animations` | Strict review of animations (only runs when you type `/review-animations`) |
| `improve-animations` | Audit every animation in the codebase, with plans to fix them |
| `find-animation-opportunities` | Where motion would help, and where it wouldn't |
| `remove-animations` | Remove motion the app doesn't need |
| `animation-performance` | Fix animations that drop frames |
| `animation-vocabulary` | The words for asking for a specific animation |
| `apple-design` | Apple's interface and fluid-motion principles, for the web |
| `mobile-native` | Make a web app feel native on a phone |
| `break-ui` | Try to break the UI with worst-case data |
| `pick-ui-library` | Pick a trusted library instead of hand-rolling one (only runs when you type `/pick-ui-library`) |
| `prototype` | Build several versions of a UI piece with a switcher (only runs when you type `/prototype`) |
| `ask-sonner` | Guide to the Sonner toast library |

Not copied: `write-swift` and `animate-expo` (Swift and React Native, which this project doesn't use), and the two
repo-level cheat sheets, which no skill links to. A few skills say "for React Native, that's `animate-expo`"; that
skill isn't installed here.

## Updating

```bash
git clone --depth 1 https://github.com/emilkowalski/skills.git /tmp/emil-skills
cd /tmp/emil-skills/skills && for d in */; do case "$d" in write-swift/|animate-expo/) ;; *) cp -R "$d" "$OLDPWD/.claude/skills/$d";; esac; done; cd -
# Review the diff, then update the commit hash in this file.
```

## License

MIT License

Copyright (c) 2026 Emil Kowalski

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
