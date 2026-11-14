import { afterEach, describe, expect, it, vi } from 'vitest'
import { relayChat, type RelayEnv } from './assistantRelay'

const TUNNEL = 'https://calm-river-example.trycloudflare.com'
const env = (url: string | null): RelayEnv => ({ ASSISTANT: { get: async () => url } })
const question = () => {
  const form = new FormData()
  form.append('question', 'How did I sleep?')
  return new Request('https://pulsar-health.pages.dev/api/chat', { method: 'POST', body: form })
}

describe('the assistant relay', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('says the shared assistant is offline when no tunnel is running', async () => {
    const response = await relayChat(question(), env(null))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ offline: true })
  })

  it('passes the question to the tunnel and the answer back', async () => {
    const upstream = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ answer: 'You slept well.' }))
    vi.stubGlobal('fetch', upstream)

    const response = await relayChat(question(), env(`${TUNNEL}/`))

    expect(await response.json()).toEqual({ answer: 'You slept well.' })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe(`${TUNNEL}/chat`)
    expect(new Headers(init.headers).get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toContain('How did I sleep?')
  })

  it('keeps the backend’s own errors, which explain what went wrong', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ detail: 'The MedGemma model is not loaded.' }, { status: 503 }))
    const response = await relayChat(question(), env(TUNNEL))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ detail: 'The MedGemma model is not loaded.' })
  })

  it('reports offline when the computer behind the tunnel has gone away', async () => {
    // Cloudflare answers for a stopped tunnel with an HTML error page (status 530).
    vi.stubGlobal('fetch', async () => new Response('<html>Error 1033</html>', { status: 530, headers: { 'content-type': 'text/html' } }))
    expect(await (await relayChat(question(), env(TUNNEL))).json()).toMatchObject({ offline: true })

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })
    expect(await (await relayChat(question(), env(TUNNEL))).json()).toMatchObject({ offline: true })
  })
})
