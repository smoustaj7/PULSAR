#!/usr/bin/env bash
# Share the MedGemma backend running on this computer with everyone using the deployed site,
# through a free Cloudflare tunnel (no Cloudflare plan or card needed).
#   1. Start the backend:            ./backendLLM/run-mac.sh
#   2. In a second terminal:         ./backendLLM/share.sh
# The site's assistant answers from this computer until you press Ctrl+C. The computer must
# stay on and awake; this script stops it from sleeping while it runs (closing the lid on
# battery still sleeps it).
# Needs cloudflared (brew install cloudflared) and Wrangler signed in (npx wrangler@4 login).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8000}"
# The KV store the site's /api/chat reads the tunnel's address from (see wrangler.jsonc).
NAMESPACE=$(sed -n 's/.*"binding": *"ASSISTANT", *"id": *"\([0-9a-f]*\)".*/\1/p' wrangler.jsonc)
kv() { npx --yes --prefer-offline wrangler@4 kv key "$@" --namespace-id "$NAMESPACE" --remote; }

command -v cloudflared >/dev/null || { echo "Needs cloudflared. Install it with:  brew install cloudflared" >&2; exit 1; }
[ -n "$NAMESPACE" ] || { echo "No ASSISTANT KV store in wrangler.jsonc." >&2; exit 1; }
# The backend answers a bare POST with 422 (no question): any HTTP answer means it's up.
if ! curl -s -o /dev/null -X POST "http://localhost:$PORT/chat"; then
  echo "Nothing is answering on http://localhost:$PORT. Start the backend first: ./backendLLM/run-mac.sh" >&2
  exit 1
fi

LOG=$(mktemp -t pulsar-tunnel)
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >"$LOG" 2>&1 &
TUNNEL=$!
stop() {
  trap - EXIT INT TERM
  echo
  echo "Stopping: the site's assistant goes offline."
  kill "$TUNNEL" 2>/dev/null || true
  kv delete url >/dev/null 2>&1 || echo "Couldn't clear the address; the site will still notice the tunnel is gone." >&2
  rm -f "$LOG"
}
trap stop EXIT INT TERM

# A free tunnel gets a new random address each time; cloudflared prints it once it's ready.
URL=""
for _ in $(seq 60); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  kill -0 "$TUNNEL" 2>/dev/null || break
  sleep 1
done
if [ -z "$URL" ]; then
  echo "The tunnel didn't start. cloudflared said:" >&2
  tail -20 "$LOG" >&2
  exit 1
fi

kv put url "$URL" >/dev/null
echo "Sharing the assistant at $URL"
echo "The deployed site now answers from this computer. Press Ctrl+C to stop."

# Keep the computer awake for as long as the tunnel runs.
caffeinate -i -w "$TUNNEL" &
wait "$TUNNEL"
echo "The tunnel stopped. cloudflared said:" >&2
tail -5 "$LOG" >&2
