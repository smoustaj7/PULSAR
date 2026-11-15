---
version: alpha
name: PULSAR
description: Spaceflight health telemetry in deep teal with mission-control typography.
colors:
  background: '#061d24'
  surface: '#0b3541'
  raised: '#0f4c5c'
  primary: '#a8dadc'
  foreground: '#f7fffd'
  voice-surface: '#0e313c'
  voice-border: '#36636d'
typography:
  sans:
    fontFamily: 'Inter Variable, sans-serif'
  display:
    fontFamily: 'Space Grotesk Variable, sans-serif'
  mono:
    fontFamily: 'JetBrains Mono Variable, monospace'
rounded:
  control: '0.75rem'
  voice-pause: '999px'
spacing:
  chat-padding: '12px'
  panel-padding: '16px'
components:
  button: {}
  field: {}
  assistant: {}
---

## Overview

PULSAR is an English-language astronaut health dashboard (README.md). Its product UI uses the visual language of illuminated spacecraft instruments. Existing runtime CSS is canonical (Model B); this document records it without generating tokens or changing the broader dashboard identity. The chat composer follows the updated user reference: one horizontal strip, a circular pause button on the left, and thin, rounded, tightly spaced bars driven only by live microphone energy.

## Colors

`src/index.css :root` owns the palette. Existing colors pass through `@theme inline` to Tailwind utilities and shared `.btn`/`.field` styles. Voice tokens map directly to the corresponding `--voice-*` properties consumed by `.assistant-window`; `.voice-pause` and the waveform consume the existing `--accent` and `--ink-950` palette. Compare these values with the frontmatter whenever changing them. High-contrast mode retains the existing global text overrides.

## Typography

Inter is the reading/input face, Space Grotesk labels the assistant, with the existing JetBrains Mono reserved for dashboard telemetry. Keep medical information readable; do not shrink transcript text to fit. Existing font loading and fallback stacks remain in `src/index.css`.

## Layout

The assistant is a persistent, non-modal corner panel on desktop and fills the phone viewport. Its header and composer stay visible while the middle scrolls. Dictation replaces only the composer row. Attachment stays left of the input, followed by microphone and Send. Editing and listening rows are both 44px tall. Long messages wrap; long drafts scroll inside the textarea without changing the composer height. Safe-area spacing follows the existing composer.

## Elevation & Depth

Use dark teal tonal surfaces, fine borders, and the existing floating assistant shadow. The waveform has no glow, looping motion, or decorative effects. Avoid adding elevation to unrelated surfaces.

## Shapes

The pause action is a 40px circle. Waveform bars are 2px wide with round ends and approximately 2.5px gaps. Other composer controls reuse the existing shared button and field styles. Stroke icons stay in `Icon.tsx`.

## Components

`chat.tsx` owns messages, attachments, the question field, and explicit submission. `useVoiceDictation.ts` owns microphone lifecycle, errors, final transcript updates, and the Web Audio graph. `VoiceWaveform.tsx` reads its AnalyserNode on animation frames; `voiceSpectrum.ts` maps logarithmic 100–6000 Hz bands to energy-driven bar heights. Analyser smoothing is 0.4; silence settles at a 3px baseline. Existing `.btn`, `.field`, global focus ring, and scrollbar baseline remain canonical.

Dictation begins only from a user gesture; browser speech services may process the audio. Dictated text remains an editable draft and is sent through the existing chat backend only on Send. No audio is stored by this feature. Permission, device, network, and unsupported-browser failures appear inline and preserve the draft. Close, unmount, profile switch, and hiding the tab cancel dictation. Pause stops audio tracks and closes the audio context immediately, allows at most 800ms for the final recognition result, then restores editing focus. Late permission/results cannot revive a canceled session. There is no demo. The live waveform remains measured feedback under reduced motion, with no added animation. Closing the persistent panel makes its contents inert.

## Do's and Don'ts

Keep enabled controls visibly interactive with keyboard focus, hover, and pressed states. Disable Send while recognition finishes. Preserve image attachments. Do not synthesize animation or random heights. No transcription backend exists; browser recognition remains required and service failures (including Brave) show a brief inline recovery message. Real microphone/browser-service verification is separate from automated audio-graph and recognition-event tests.
