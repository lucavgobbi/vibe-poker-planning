# Vibe Poker Planning

Realtime planning poker built with React, TypeScript, Vite, and a Cloudflare Durable Object backend for room state and WebSocket updates.

## Stack

- Frontend: React 19 + Vite
- Backend: Cloudflare Workers + Durable Objects
- Hosting: Vercel for the frontend, Cloudflare for the realtime worker
- Project provisioning: Stripe Projects CLI

## Prerequisites

- Node.js 20+
- `pnpm`
- Wrangler CLI access through the project dependencies
- Stripe CLI with the `projects` plugin if you want to use the repo's managed provider workflow

## Get Started

1. Install dependencies:

```bash
pnpm install
```

2. If you are using Stripe Projects-managed credentials, inspect the current project and pull local env files:

```bash
stripe projects status
stripe projects env --pull
```

3. Start the Cloudflare worker locally:

```bash
pnpm dev:worker
```

4. In a second terminal, start the frontend:

```bash
pnpm dev
```

5. Open the Vite URL shown in the terminal.

Local development works without setting `VITE_WS_BASE_URL` as long as the frontend runs on `localhost` or `127.0.0.1`. In that case the app defaults to `ws://127.0.0.1:8787`.

## Environment Variables

The frontend reads these variables at build time:

- `VITE_WS_BASE_URL`: Required for deployed frontend builds. This should point at the Cloudflare Worker WebSocket base URL, for example `wss://your-worker.your-subdomain.workers.dev`.
- `POSTHOG_ANALYTICS_API_KEY`: Optional. Enables PostHog analytics.
- `POSTHOG_ANALYTICS_HOST`: Optional. Override the PostHog API host if needed.
- `VITE_POSTHOG_KEY`: Optional legacy fallback for PostHog analytics.
- `VITE_POSTHOG_HOST`: Optional legacy fallback for the PostHog API host.

## Quality Checks

Run both before deploying:

```bash
pnpm typecheck
pnpm build
```

## Deploy

This project deploys in two parts:

1. Deploy the Cloudflare Worker backend.
2. Deploy the Vercel frontend with `VITE_WS_BASE_URL` pointing at that worker.

### Stripe Projects Setup

This repository is already initialized for Stripe Projects. To inspect linked providers and managed services:

```bash
stripe projects status
```

This project is expected to use these providers:

- Cloudflare
- Vercel

If credentials are missing or stale, use:

```bash
stripe projects env --pull
```

Do not hand-edit `.projects` or generated `.env` files.

### Deploy The Worker

Deploy the backend with Wrangler:

```bash
pnpm deploy:worker
```

After deploy, note the worker URL. That URL becomes the value for `VITE_WS_BASE_URL` in the frontend deployment.

For local testing against the deployed backend, you can also run the frontend with:

```bash
VITE_WS_BASE_URL=wss://your-worker.your-subdomain.workers.dev pnpm dev
```

### Deploy The Frontend

Builds are configured for Vercel through `vercel.json`.

Before deploying the frontend, make sure the Vercel project has:

- `VITE_WS_BASE_URL` set to the deployed worker URL
- `POSTHOG_ANALYTICS_API_KEY` set if analytics should be enabled
- `POSTHOG_ANALYTICS_HOST` set if you use a non-default PostHog host

Typical Vercel deployment flow:

```bash
pnpm build
vercel deploy --prod
```

If you are managing the Vercel project through Stripe Projects, use `stripe projects status` and `stripe projects env --pull` first so local state and provider credentials are current.

## Useful Commands

```bash
pnpm dev
pnpm dev:worker
pnpm build
pnpm typecheck
pnpm preview
stripe projects status
stripe projects env --pull
```

## Troubleshooting

- If the app shows a realtime backend configuration error, set `VITE_WS_BASE_URL` for that environment.
- If Vercel loads but rooms do not connect, verify the frontend is using the correct `wss://` worker URL.
- If PostHog shows no events, verify `POSTHOG_ANALYTICS_API_KEY` is present in the frontend build environment. If your PostHog project is not in the US region, also set `POSTHOG_ANALYTICS_HOST` explicitly, for example `https://eu.i.posthog.com`.
- If provider auth has expired, re-run `stripe projects status` and use `stripe projects link <provider>` if needed.
