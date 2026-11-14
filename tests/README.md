Voice composer verification
===========================

Run `npm test` for speech-frequency mapping and the existing unit suite.
Run `npx playwright install chromium` once, then `npm run test:voice` for the browser checks.
An existing Chromium binary can be selected with `CHROMIUM_PATH=/path/to/chrome npm run test:voice`.
The browser runner starts an isolated Vite server on port 4188 and stops it afterwards.
Screenshots go to the system temporary directory under `pulsar-composer-checks`.

The fixture mounts the real Assistant/Chat under React StrictMode. It supplies deterministic
speech events and real Web Audio tone sources through MediaStreams. Checks cover waveform
energy/silence, transcript revisions and final results, draft/attachment preservation, explicit
Send, repeated sessions, permission/service/device failures, canceled permission races,
close/unmount/tab cleanup, keyboard focus, reduced motion, and 320px/390px mobile layouts.
No physical microphone is opened and no browser transcription service is contacted.

Manual verification still required:
- In a supported browser, allow the real microphone prompt and speak at normal/quiet volumes.
- Check that syllables move the bars and room silence settles to the baseline.
- Pause mid-sentence; check the final words, editing focus, and preserved draft/attachment.
- Repeat start/pause; close the chat while listening and verify the browser mic indicator clears.
- Test the target phone's microphone, speech service, and onscreen keyboard.

The app has no independent transcription service. It uses browser SpeechRecognition;
Brave or other browsers whose speech service fails get an inline error and retain the draft.
