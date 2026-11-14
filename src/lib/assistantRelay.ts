/**
 * The deployed site's /api/chat (functions/api/chat.ts): it forwards questions to the
 * MedGemma backend on a team member's computer, through the Cloudflare tunnel that
 * backendLLM/share.sh opens. A free tunnel gets a new address on every start, so the script
 * saves it in Cloudflare KV and this relay looks it up; the site's own address never changes.
 */

/** The KV key holding the tunnel's current address, or nothing while no one is sharing. */
export const TUNNEL_KEY = 'url'

export type RelayEnv = { ASSISTANT: { get(key: string): Promise<string | null> } }

/** The app reads `offline` as "try a backend on this computer instead". */
const offline = () => Response.json({ detail: 'The shared assistant is offline.', offline: true }, { status: 503 })

export async function relayChat(request: Request, env: RelayEnv): Promise<Response> {
  const tunnel = await env.ASSISTANT.get(TUNNEL_KEY)
  if (!tunnel) return offline()

  let upstream: Response
  try {
    upstream = await fetch(`${tunnel.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      // Keeps the multipart boundary, so the backend can read the question and any image.
      headers: { 'content-type': request.headers.get('content-type') ?? '' },
      body: await request.arrayBuffer(),
    })
  } catch {
    return offline()
  }
  // The backend always answers in JSON, its errors included. Anything else is Cloudflare
  // reporting that the tunnel is gone: the computer slept or the script stopped uncleanly.
  if (!upstream.headers.get('content-type')?.includes('application/json')) return offline()
  return new Response(upstream.body, { status: upstream.status, headers: { 'content-type': 'application/json' } })
}
