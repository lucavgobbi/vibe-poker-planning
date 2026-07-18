# Vibe Poker Planning

Realtime planning poker — no accounts, no sign-up, just a URL.

Built with React 19 + Vite and a Cloudflare Durable Object backend for realtime WebSocket state.

## Features

- **Room URLs** — any path is a room. Share the link, everyone lands together.
- **Anonymous voting** — votes stay hidden until the team reveals together.
- **Multiple decks** — Fibonacci (0–89), Base 2 (0–128), Regular (1–12).
- **Average score** — automatically calculated after reveal (spectators excluded).
- **Unanimous vote detection** — confetti celebration when everyone agrees.
- **Spectator mode** — join to watch without voting.
- **Emoji throwing** — toss emojis at other participants mid-session.
- **Dark mode** — full light and dark palettes with toggle.
- **Realtime** — WebSockets via Cloudflare Durable Objects.
- **No accounts** — just pick a name and go.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Cloudflare Workers + Durable Objects |
| Frontend host | Vercel |
| Worker host | Cloudflare |
| Analytics | PostHog (optional) |
| Provisioning | Stripe Projects CLI |

## Prerequisites

- Node.js 20+
- `pnpm`
- Stripe CLI with the `projects` plugin (for managed credentials)

## Local Development

```bash
# Install dependencies
pnpm install

# Pull provider credentials (first time / when stale)
stripe projects env --pull

# Terminal 1 — start the worker
pnpm dev:worker

# Terminal 2 — start the frontend
pnpm dev
```

The frontend auto-connects to `ws://127.0.0.1:8787` when running on localhost.

## Deploy

### 1. Deploy the Worker

```bash
pnpm deploy:worker
```

Note the deployed URL (e.g. `https://vibe-poker-planning.your-subdomain.workers.dev`).

### 2. Deploy the Frontend

Set the worker URL and any optional env vars in the Vercel project:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WS_BASE_URL` | Yes | `wss://your-worker.your-subdomain.workers.dev` |
| `POSTHOG_ANALYTICS_API_KEY` | No | PostHog project API key |
| `POSTHOG_ANALYTICS_HOST` | No | PostHog API host (defaults to US region) |

Then deploy:

```bash
pnpm deploy:frontend
```

This runs a production build and deploys to Vercel with `vercel deploy --prod -y`. Make sure `VERCEL_TOKEN` is available in the environment.

### Stripe Projects

This repo uses Stripe Projects for provider credential management. To refresh credentials:

```bash
stripe projects status
stripe projects env --pull
```

Do not hand-edit `.projects` or `.env` files.

## Quality Checks

```bash
pnpm typecheck
pnpm build
```

## Troubleshooting

- **Frontend loads but rooms don't connect** — verify `VITE_WS_BASE_URL` points at the deployed worker with `wss://`.
- **PostHog shows no events** — check `POSTHOG_ANALYTICS_API_KEY` is set. If using EU region, set `POSTHOG_ANALYTICS_HOST` to `https://eu.i.posthog.com`.
- **Provider auth expired** — run `stripe projects status && stripe projects env --pull`.
