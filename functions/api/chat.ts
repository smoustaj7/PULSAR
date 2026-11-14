// Cloudflare Pages Function: POST /api/chat on the deployed site. See src/lib/assistantRelay.ts.
import { relayChat, type RelayEnv } from '../../src/lib/assistantRelay'

export const onRequestPost = ({ request, env }: { request: Request; env: RelayEnv }) => relayChat(request, env)
