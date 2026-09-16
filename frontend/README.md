This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Echo.ai meeting bot

Add `MEETSTREAM_API_KEY` as a Vercel environment variable for Production, Preview, and Development, then redeploy the project. Keep it server-only; do not prefix it with `NEXT_PUBLIC_`.

Echo automatically sends MeetStream callbacks to `/api/meetstream/webhook` on the deployed app. If callbacks must use a different public deployment, optionally set `MEETSTREAM_WEBHOOK_BASE_URL` to its HTTPS origin, for example `https://project-echo-next.vercel.app`.

### Botless transcription

Set `GROQ_API_KEY` for free-tier-first Whisper transcription and `OPENROUTER_API_KEY` for paid fallback. Echo uses `whisper-large-v3-turbo` on Groq and `openai/whisper-large-v3` on OpenRouter by default. Optional overrides are `GROQ_WHISPER_MODEL`, `GROQ_WHISPER_PROMPT`, and `OPENROUTER_STT_MODEL`.

**Multi-Key Free Tier Scaling & Round-Robin Pooling**:
To multiply free-tier capacity and prevent rate-limiting during simultaneous meetings or batch uploads, configure multiple Groq API keys from separate accounts using either method:
- **Comma-separated**: `GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3,gsk_key4,gsk_key5`
- **Indexed variables**: `GROQ_API_KEY=gsk_key1`, `GROQ_API_KEY_2=gsk_key2`, `GROQ_API_KEY_3=gsk_key3`, etc. (up to `GROQ_API_KEY_20`)

The router automatically round-robins across all active Groq keys to distribute load evenly. If any key returns a `429 (Rate Limit)` response with `Retry-After`, the router places that individual key in cooldown and immediately fails over to the next available Groq key in the pool with 0 delay. Only if all configured Groq keys are exhausted or in cooldown will Echo fall back to OpenRouter. Audio transcription uses only these two Whisper paths; Gemini is not an audio fallback. Document/PDF handling may still use its separately configured provider.

## Forms Portal configuration

The Forms Portal is available from Echo's sidebar after signing in with ClickUp. Run `supabase/forms_rbac.sql` in the project Supabase database, then provide `SUPABASE_SERVICE_ROLE_KEY` to persist the protected Owner/Admin configuration. Dave's ClickUp email (`dave.policarpio@primephilippines.com`) is the protected Owner. Without the Supabase table, Admin configuration remains available in local browser storage for local review.

## Strategic Alliance Partnership form

The public referral form is available at `/strategic-alliance-partnership`. It creates
tasks in the hard-coded ClickUp list `901421067114`; it does not use a database.

Set `CLICKUP_API_TOKEN` in Vercel for Production, Preview, and Development. Keep the
token server-only and do not use a `NEXT_PUBLIC_` prefix. The browser submits to the
app's `/api/strategic-alliance-partnership` route so the credential is never exposed
to form visitors.
