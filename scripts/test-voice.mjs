import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const url = 'http://127.0.0.1:4188'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4188', '--strictPort'], {
  cwd: root,
  stdio: 'pipe',
})
let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk
})
let browser
const artifacts = path.join(tmpdir(), 'pulsar-composer-checks')
try {
  await mkdir(artifacts, { recursive: true })
  const deadline = Date.now() + 15000
  while (true) {
    if (server.exitCode !== null) throw new Error(serverOutput)
    try {
      if ((await fetch(url)).ok) break
    } catch {
      /* Wait for Vite to bind. */
    }
    if (Date.now() > deadline) throw new Error(`Preview timed out: ${serverOutput}`)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1164, height: 953 }, reducedMotion: 'reduce' })
  await context.addInitScript(() => {
    const NativeAudioContext = window.AudioContext
    const test = (window.voiceTest = { mode: 'ok', contexts: [], streams: [], recognitions: [], pending: [], gains: [], finalText: '' })
    // Track the production graph. The test-only source bypasses this wrapper.
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args)
        test.contexts.push(this)
      }
    }
    function makeStream() {
      // Exercise a real MediaStreamAudioSourceNode and AnalyserNode with deterministic tones.
      const sourceContext = new NativeAudioContext()
      void sourceContext.resume()
      const destination = sourceContext.createMediaStreamDestination()
      const gain = sourceContext.createGain()
      gain.gain.value = 0
      gain.connect(destination)
      test.gains.push(gain)
      const oscillators = [170, 300, 600, 1100, 1800, 3200].map((frequency) => {
        const oscillator = sourceContext.createOscillator()
        oscillator.frequency.value = frequency
        oscillator.connect(gain)
        oscillator.start()
        return oscillator
      })
      const stream = destination.stream
      const track = stream.getAudioTracks()[0]
      const stop = track.stop.bind(track)
      track.stop = () => {
        stop()
        if (sourceContext.state !== 'closed') {
          oscillators.forEach((oscillator) => oscillator.stop())
          void sourceContext.close()
        }
      }
      test.streams.push(stream)
      return stream
    }
    navigator.mediaDevices.getUserMedia = async () => {
      if (test.mode === 'denied') throw new DOMException('Blocked', 'NotAllowedError')
      if (test.mode === 'busy') throw new DOMException('Busy', 'NotReadableError')
      if (test.mode === 'pending') return new Promise((resolve) => test.pending.push(() => resolve(makeStream())))
      return makeStream()
    }
    window.SpeechRecognition = class {
      constructor() {
        test.recognitions.push(this)
      }
      start() {
        if (test.mode !== 'never-starts') queueMicrotask(() => this.onstart?.())
      }
      stop() {
        this.stopped = true
        if (test.mode === 'never-ends') return
        queueMicrotask(() => {
          if (test.finalText) this.onresult?.({ results: [[{ transcript: test.finalText }]] })
          this.onend?.()
        })
      }
      abort() {
        this.aborted = true
      }
    }
    window.webkitSpeechRecognition = undefined
  })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.goto(`${url}/tests/voice.html`)
  const launcher = page.getByRole('button', { name: 'Ask Dr.Jarvis, the AI health assistant', exact: true })
  await launcher.click()
  const input = page.getByRole('textbox', { name: 'Your question' })
  const mic = page.getByRole('button', { name: 'Start dictation', exact: true })
  const pause = page.getByRole('button', { name: 'Pause dictation and edit text' })
  const composer = page.locator('.chat-composer')
  const stop = async () => {
    await pause.click()
    await mic.waitFor()
    assert.equal(await input.evaluate((element) => document.activeElement === element), true)
    assert.equal(await input.evaluate((element) => element.selectionStart === element.value.length), true)
  }
  const start = async () => {
    await mic.click()
    await pause.waitFor()
  }
  const result = async (text) =>
    page.evaluate((transcript) => window.voiceTest.recognitions.at(-1).onresult({ results: [[{ transcript }]] }), text)
  const released = async () => {
    await page.waitForFunction(() => window.voiceTest.contexts.every((context) => context.state === 'closed'))
    assert.equal(
      await page.evaluate(() =>
        window.voiceTest.streams.every((stream) => stream.getTracks().every((track) => track.readyState === 'ended')),
      ),
      true,
    )
  }
  const height = async () => (await composer.boundingBox()).height
  const attach = await page.getByRole('button', { name: 'Attach an image' }).boundingBox()
  const textBox = await input.boundingBox()
  assert.ok(attach.x < textBox.x, 'Attachment button must remain left of the input')
  await input.fill('About my sleep:  ')
  const idleHeight = await height()
  await start()
  assert.equal(await height(), idleHeight)
  assert.equal(await pause.evaluate((element) => document.activeElement === element), true)
  const canvas = page.locator('.voice-waveform')
  const pixels = () =>
    canvas.evaluate((canvas) => {
      const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
      let top = height
      let bottom = 0
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (data[(y * width + x) * 4 + 3] > 40) {
            top = Math.min(top, y)
            bottom = Math.max(bottom, y)
          }
      return bottom - top + 1
    })
  await page.waitForTimeout(120)
  const silentHeight = await pixels()
  await page.evaluate(() => {
    window.voiceTest.gains.at(-1).gain.value = 0.12
  })
  await page.waitForTimeout(200)
  assert.ok((await pixels()) > silentHeight + 10, 'Real analyser energy must grow the waveform')
  await page.locator('form').screenshot({ path: path.join(artifacts, 'desktop-listening.png') })
  await page.evaluate(() => {
    window.voiceTest.gains.at(-1).gain.value = 0
  })
  await page.waitForTimeout(400)
  assert.ok((await pixels()) <= silentHeight + 2, 'Silence must settle into a quiet baseline')
  await result('why am I')
  await result('why am I tired?')
  await page.evaluate(() => {
    window.voiceTest.finalText = 'why am I tired today?'
  })
  await stop()
  assert.equal(await height(), idleHeight)
  assert.equal(await input.inputValue(), 'About my sleep:  why am I tired today?')
  await released()
  await page.evaluate(() => {
    window.voiceTest.finalText = ''
  })
  console.log('PASS real audio graph: frequency energy, silence, stable height, final transcript, focus, original attachment position')

  for (let index = 0; index < 5; index++) {
    await start()
    await result(`session ${index}`)
    await stop()
    await released()
  }
  assert.match(await input.inputValue(), /session 0 session 1 session 2 session 3 session 4$/)
  await input.fill('Keep this draft')
  for (const mode of ['denied', 'busy']) {
    await page.evaluate((mode) => {
      window.voiceTest.mode = mode
    }, mode)
    await mic.click()
    await page.getByRole('alert').waitFor()
    assert.equal(await input.inputValue(), 'Keep this draft')
    await released()
  }
  await page.evaluate(() => {
    window.voiceTest.mode = 'ok'
  })
  for (const error of ['network', 'no-speech', 'service-not-allowed']) {
    await start()
    await result('partial words')
    await page.evaluate((error) => window.voiceTest.recognitions.at(-1).onerror({ error }), error)
    await mic.waitFor()
    assert.match(await page.getByRole('alert').innerText(), /.+/)
    assert.match(await input.inputValue(), /partial words$/)
    await released()
    await input.fill('Keep this draft')
  }
  console.log('PASS repeated sessions, permission/device/service failures, draft preservation')

  // Recognition finalization is bounded, so a missing onend cannot trap recording mode.
  await page.evaluate(() => {
    window.voiceTest.mode = 'never-ends'
  })
  await start()
  await result('last words')
  await stop()
  await released()
  assert.equal(await input.inputValue(), 'Keep this draft last words')
  await page.evaluate(() => {
    window.voiceTest.mode = 'ok'
  })
  // Cancel while permission is pending, then grant it after a new session starts.
  await page.evaluate(() => {
    window.voiceTest.mode = 'pending'
  })
  await mic.click()
  await page.getByRole('button', { name: 'Cancel microphone request' }).click()
  await page.evaluate(() => {
    window.voiceTest.mode = 'ok'
  })
  await start()
  await page.evaluate(() => window.voiceTest.pending.shift()())
  await page.waitForTimeout(50)
  assert.equal(await composer.getAttribute('data-voice-state'), 'listening')
  assert.equal(await page.evaluate(() => window.voiceTest.streams.at(-1).getTracks()[0].readyState), 'ended')
  await stop()
  await released()
  // A permission prompt can outlive a closed chat. Its late stream must be stopped.
  await page.evaluate(() => {
    window.voiceTest.mode = 'pending'
  })
  await mic.click()
  await page.getByRole('button', { name: 'Close Dr.Jarvis' }).click()
  await page.evaluate(() => window.voiceTest.pending.shift()())
  await released()
  await page.evaluate(() => {
    window.voiceTest.mode = 'ok'
  })
  await launcher.click()
  // Closing cancels both recognition and Web Audio, including late callbacks.
  await start()
  await result('saved on close')
  await page.evaluate(() => {
    window.staleResult = window.voiceTest.recognitions.at(-1).onresult
  })
  await page.getByRole('button', { name: 'Close Dr.Jarvis' }).click()
  await released()
  await page.evaluate(() => window.staleResult({ results: [[{ transcript: 'late result must be ignored' }]] }))
  await launcher.click()
  assert.match(await input.inputValue(), /saved on close$/)
  // Lost device and hidden tab stop live capture as well.
  await start()
  await page.evaluate(() => window.voiceTest.streams.at(-1).getAudioTracks()[0].onended())
  await mic.waitFor()
  await released()
  await start()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await mic.waitFor()
  await released()
  await page.evaluate(() => {
    delete document.hidden
  })
  console.log('PASS bounded finalization, late permission race, close/stale callbacks, lost device and tab cleanup')

  let sent = 0
  let payload = ''
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'reading.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'),
    })
  await start()
  await result('with an attachment')
  await stop()
  assert.equal(await page.getByText('reading.png', { exact: true }).isVisible(), true)
  await page.route('**/chat', async (route) => {
    sent++
    payload = route.request().postData()
    await route.fulfill({ json: { answer: 'Received your edited question.', sources: [] } })
  })
  await input.fill('My corrected question')
  assert.equal(sent, 0)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await page.getByText('Received your edited question.', { exact: true }).waitFor()
  assert.equal(sent, 1)
  assert.match(payload, /reading.png/)
  assert.match(payload, /My corrected question/)
  // Keyboard-only two-tap flow, including Enter on pause (never submits the form).
  await input.fill('Keyboard draft')
  await mic.focus()
  await page.keyboard.press('Enter')
  await pause.waitFor()
  await result('spoken words')
  await page.keyboard.press('Enter')
  await mic.waitFor()
  assert.equal(await input.inputValue(), 'Keyboard draft spoken words')
  assert.equal(sent, 1)
  assert.equal(await input.evaluate((element) => document.activeElement === element), true)
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 700 })
    const normal = await height()
    await start()
    assert.equal(await height(), normal)
    await page.evaluate(() => {
      window.voiceTest.gains.at(-1).gain.value = 0.12
    })
    await page.waitForTimeout(150)
    assert.ok((await canvas.boundingBox()).width > 160)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.locator('form').screenshot({ path: path.join(artifacts, `mobile-${width}-listening.png`) })
    await stop()
    assert.equal(await height(), normal)
    await page.locator('form').screenshot({ path: path.join(artifacts, `mobile-${width}-editing.png`) })
  }
  await page.evaluate(() => {
    window.savedRecognition = window.SpeechRecognition
    window.SpeechRecognition = undefined
  })
  const before = await input.inputValue()
  await mic.click()
  await page.getByRole('alert').waitFor()
  assert.equal(await input.inputValue(), before)
  await released()
  await page.evaluate(() => {
    window.SpeechRecognition = window.savedRecognition
  })
  await start()
  await page.evaluate(() => window.dispatchEvent(new Event('unmount-voice-test')))
  await released()
  assert.equal(await page.evaluate(() => window.voiceTest.recognitions.every((recognition) => recognition.aborted)), true)
  assert.deepEqual(runtimeErrors, [])
  console.log(`PASS explicit send, keyboard, mobile 390/320px, reduced motion, unsupported recognition. Screenshots: ${artifacts}`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
