# Project Echo — AI agent handoff

This file is the working handoff for the next engineer or AI agent. Read it before changing the Echo chatbot, authentication, ClickUp data access, or the admin AI settings.

## Product identity

Project Echo is a PRIME-branded work assistant. The user-facing assistant is called **Echo** or **Ask Echo**. ClickUp is an implementation detail and data connection, not Echo's identity. Do not describe Echo in the UI as a “ClickUp assistant”, “ClickUp chatbot”, or “ClickUp AI”. Backend logs, route names, and source-page labels may still mention ClickUp where technically useful.

Echo should feel casual, conversational, and useful. Avoid provider language, “intelligence repository”, and corporate jargon. Answers should be grounded in the signed-in user's permitted work and should show sources when factual claims are made.

## Current repository state

- Repository: `https://github.com/pyscriptcli/project-echo-next.git`
- Active branch: `main`
- Current deployed source commit: `fb39895` (`fix: refine Echo answer presentation`)
- `main` and `origin/main` were clean and aligned when this handoff was written.
- The Next.js app lives in `frontend/`; the repository root does not contain a `package.json`.
- Use `frontend/` as the working directory for npm commands.

## Handoff workflow

`handoff.md` is a working file, not a one-time report. Keep the permanent guide above this section current. Keep exactly two dated entries under `Recent handoffs`, newest first.

When the user explicitly requests a handoff:

1. Add one compressed entry at the top of `Recent handoffs`.
2. Keep the previous entry.
3. Delete the oldest entry only when a third entry would exist.
4. Update the entry with current focus, decisions, files, verification, commit/branch state, risks, blockers, and next actions.
5. Use Caveman style for the dated entry. Use `ponytail` only if installed; current repository has no `ponytail` skill, so write `ponytail unavailable` in `Suggested skills` and continue with Caveman.

This preserves today's handoff through tomorrow. It is replaced only after two newer handoffs exist.

## Recent handoffs

### 2026-09-12 — Rolling handoff workflow

- Focus: make `handoff.md` reusable, rolling, and agent-readable.
- State: permanent guide retained; exactly two recent entries required; newest first.
- Files: `handoff.md`; `.agents/skills/handoff/SKILL.md`.
- Verification: pending after documentation update.
- Commit: pending.
- Risk: `ponytail` skill unavailable; Caveman remains available.
- Next: preserve two-entry rotation on every explicit handoff; update changelog when behavior changes.
- Suggested skills: `caveman`; `ponytail unavailable`.

### 2026-09-12 — Project Echo baseline

- Focus: hand off Echo product, auth, retrieval, UI, admin AI, and recent commits.
- State: per-user OAuth; page-gated retrieval; identity matching; clickable citations; collapsed sources; read-only Echo.
- Files: `handoff.md`; `docs/ASK_ECHO_IMPLEMENTATION_PLAN.md`; `frontend/src/lib/ask-echo/`; `frontend/src/components/UniversalEchoDrawer.tsx`.
- Verification: 17 tests passed; production build passed before documentation update.
- Commit: `8454715` created repository handoff guide.
- Risk: mapped workspace sources only; no persistent chat; no write actions.
- Next: test two users with different ClickUp permissions; apply Supabase schema; preserve Echo-first copy.
- Suggested skills: `caveman`; `prime-philippines-brand`; `tdd` for behavior changes; `ponytail unavailable`.

## What is implemented

### Authentication and user connections

- Echo signs users in through ClickUp OAuth.
- Each user gets their own OAuth access token in the `echo_clickup_token` HTTP-only cookie and a cached profile in `echo_user_profile`.
- The OAuth callback fetches the ClickUp user profile and workspace name, checks the configured allowed email domains, then establishes the session.
- A shared `CLICKUP_API_TOKEN` fallback was intentionally removed from the normal login route. Do not reintroduce it: a shared token could bypass an individual user's ClickUp permissions.
- `/api/auth/me` returns the signed-in profile and refreshes the cached profile when needed.
- Ask Echo requires an authenticated profile with an email address.

Required deployment variables:

```text
CLICKUP_CLIENT_ID
CLICKUP_CLIENT_SECRET
CLICKUP_REDIRECT_URI   # optional; otherwise /api/auth/callback on the current origin
DEEPSEEK_API_KEY       # server-side model credential used by Ask Echo
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY (or the configured Supabase service key)
```

ClickUp OAuth redirect settings must point to the deployed `/api/auth/callback` URL. OAuth consent is per user; the personal ClickUp MCP connection installed in Codex is unrelated to deployed Echo users.

### Ask Echo request flow

1. `frontend/src/app/api/ask-echo/route.ts` authenticates the request from cookies and passes the user's id, name, email, OAuth token, and selected task list to the service.
2. `frontend/src/lib/ask-echo/service.ts` validates the request, loads the AI policy, checks usage/rate/concurrency limits, resolves allowed Echo pages, and loads only permitted evidence.
3. `frontend/src/lib/ask-echo/access.ts` resolves page permissions. Owner/admin users can receive broader access when configured; ordinary users receive their configured/default pages. Restricted pages are not sent to retrieval or the model.
4. `frontend/src/lib/ask-echo/clickup.ts` reads mapped ClickUp lists using the current user's OAuth token.
5. `frontend/src/lib/ask-echo/retrieval.ts` ranks meeting and task evidence. When the question contains “me”, “my”, “mine”, or “I”, records matching the user's id, name, or email receive a strong ranking boost.
6. `frontend/src/lib/ask-echo/provider.ts` sends the bounded question, conversation, user identity, and selected evidence to the configured model. Evidence is explicitly treated as untrusted data, never instructions.
7. The service resolves returned source ids against real evidence, filters invalid citations, records usage, and returns the typed response.

Ask Echo is currently read-only. It does not create tasks, edit records, edit minutes, or perform autonomous actions.

### Ask Echo response shape

Defined in `frontend/src/lib/ask-echo/schema.ts`:

```ts
interface AskEchoResponse {
  answer: string;
  sources: EvidenceSource[];
  citations?: Array<{ marker: string; sourceId: string }>;
  confidence: "supported" | "partial" | "insufficient";
  followUps: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

The model is asked to put inline markers such as `[1]` and return a citation mapping. The service only returns citations that resolve to retrieved sources. The client also falls back to the source order for a marker when a model omits an explicit mapping, so visible `[1]` markers remain clickable when possible.

### Current chatbot UI

`frontend/src/components/UniversalEchoDrawer.tsx` is the main UI.

- Right-side drawer with PRIME Blue `#003366`, Warm White `#FFFCFB`, and Gold `#C9A84C` accents.
- Expand button opens the same conversation at full width.
- No conversation-history sidebar. Current messages are kept in `sessionStorage` for the current browser session.
- New conversation, stop response, close, and follow-up buttons are present.
- Greeting uses the signed-in profile name from `/api/auth/me`.
- Suggested prompts include personal work, attention, changes, and daily brief questions.
- User-facing copy is Echo-first and should not expose ClickUp as the assistant identity.
- Sources are collapsed by default behind `Sources · N`.
- Inline `[n]` footnotes are buttons that open the matching source through `onOpenSource`.
- Expanded sources show numbered source cards, page/date/topic, excerpt, and external/open behavior.
- Answer rendering gives blank lines, bullet styling, and highlighted section headings without introducing a full markdown dependency.
- The current UI intentionally avoids a large evidence/match summary strip; keep answers visually focused on the answer itself and compact source access.

The parent page wires source navigation in `frontend/src/app/page.tsx`: meeting/task pages are opened in Echo's existing views and external URLs may open in a new tab.

## Admin AI configuration

`frontend/src/components/forms/FormsPortal.tsx` includes the `AI` tab. It exposes the approved model catalog, fallback model, output/source limits, RPM, concurrency, daily user tokens, and monthly organization tokens. The server validates policy through `frontend/src/lib/ask-echo/limits.ts` and `frontend/src/app/api/forms/config/route.ts`.

`frontend/src/app/api/admin/ai/route.ts` exposes protected usage/policy status. Usage records are written through `frontend/src/lib/ask-echo/store.ts` to `echo_ai_usage`.

Run `supabase/forms_rbac.sql` against the project Supabase database before relying on persistent AI usage/rate limits. The SQL creates the config and usage tables and enables RLS. Do not mention Supabase in ordinary frontend copy; technical details belong in logs/admin documentation.

## Important source/list mappings

The current fixed mappings are in `frontend/src/lib/ask-echo/clickup.ts`:

- Notebook: `901418075633`
- Demands: `901420989525`
- Market Insights: `901420987429`
- Tasks: the selected `echo_clickup_list_id` cookie
- Forms: list ids configured in the admin mappings
- Meetings: the configured archive/repository path, gated by page access

This is not yet a general workspace-wide ClickUp Docs/comments/MCP search. The deferred boundary is documented below.

## Key files

- `frontend/src/components/UniversalEchoDrawer.tsx` — drawer, expanded view, messages, citations, sources, composer.
- `frontend/src/components/UniversalEchoDrawer.test.tsx` — UI send/source behavior.
- `frontend/src/lib/api.ts` — client request helper (`askEcho`).
- `frontend/src/app/api/ask-echo/route.ts` — transport/auth/error handling.
- `frontend/src/lib/ask-echo/schema.ts` — request/response types and validation.
- `frontend/src/lib/ask-echo/service.ts` — orchestration, permissions, retrieval, model, usage.
- `frontend/src/lib/ask-echo/access.ts` — page access resolution.
- `frontend/src/lib/ask-echo/clickup.ts` — per-user ClickUp list retrieval and source normalization.
- `frontend/src/lib/ask-echo/retrieval.ts` — deterministic matching/ranking and evidence limits.
- `frontend/src/lib/ask-echo/provider.ts` — model prompt and server-side provider call.
- `frontend/src/lib/ask-echo/store.ts` — config, meetings, usage, and Supabase access.
- `frontend/src/lib/ask-echo/limits.ts` — approved models and AI policy limits.
- `frontend/src/app/api/auth/login/route.ts` — starts per-user OAuth; do not add shared-token fallback.
- `frontend/src/app/api/auth/callback/route.ts` — exchanges OAuth code and sets session cookies.
- `frontend/src/lib/auth.ts` — cookie names, profile types, allowed-domain check, session helpers.
- `frontend/src/components/forms/FormsPortal.tsx` — admin settings and AI tab.
- `supabase/forms_rbac.sql` — config, usage ledger, and RLS schema.
- `docs/ASK_ECHO_IMPLEMENTATION_PLAN.md` — original implementation plan and product boundaries.

## Changelog

### `fb39895` — refine Echo answer presentation

- Made answer bodies visually clearer with spacing, bullet markers, and highlighted section headings.
- Made inline source markers reliably resolve by explicit citation mapping or source order.
- Removed invalid nested paragraph markup that caused hydration warnings.

### `0a3a059` — add inline Echo citations and visual evidence

- Added optional citation mappings to the Ask Echo response contract.
- Updated the model prompt to emit `[n]` citations tied to evidence ids.
- Server filters citations to real retrieved sources.
- Sources collapsed by default and expandable as numbered source cards.
- Added compact evidence/match cards at the time; these were removed in `fb39895` after UI feedback.

### `ff7845d` — make Echo personal and conversational

- Added identity context (id/name/email) to retrieval and model prompts.
- Added user matching for “me/my/mine” queries using assignee ids, names, and emails.
- Added personalized greeting and Echo-first conversational copy.
- Added suggested prompts for attention, open tasks, weekly changes, and daily brief.
- Updated source normalization with owner ids.

### `2c0aec6` — require per-user ClickUp OAuth

- Removed the shared `CLICKUP_API_TOKEN` sign-in fallback.
- Login now requires configured ClickUp OAuth rather than silently signing users in as a workspace account.
- Updated auth status and login copy to explain individual connections.

### `50629e2` — gate Ask Echo context by page access

- Added page access resolution and page-to-source mapping.
- Retrieval fetches only enabled pages/lists.
- Restricted pages are excluded before the model sees evidence.

### `0436df2` — rebuild Ask Echo with grounded conversations

- Replaced meeting-only client behavior with a typed, authenticated Ask Echo service.
- Added bounded conversation turns, source ids, confidence, follow-ups, request cancellation, session storage, and server usage/rate controls.
- Added ClickUp context retrieval and AI admin configuration/usage ledger.
- Added initial unit, route, and component tests.

### Earlier product/UI commits

- `778656f` — hide PRIME logo when sidebar is collapsed.
- `a95f819` — refine sidebar branding and typography.
- `03de9ae` — support multiple allowed ClickUp sign-in domains.
- `2296d05` — add configurable allowed ClickUp sign-in domains.

## Verification

Run from `frontend/`:

```powershell
npm test
npm run build
npm run lint
```

The latest verified test result was 17 passing tests across 7 files. The latest production build completed successfully. If Vitest reports an access-denied error while loading `vitest.config.mjs`, rerun with the required filesystem permission; that has been a local sandbox issue, not an application failure.

Before committing:

```powershell
git diff --check
git status --short
git log --oneline -5
```

The user preference for this repository is to commit and push directly to `main` when explicitly requested. Confirm the remote before pushing and avoid destructive git commands.

## Security and privacy rules

- Never expose provider API keys or OAuth tokens to the browser, model output, logs, or usage records.
- Never use a shared workspace token for ordinary user Ask Echo requests.
- Always enforce page access on the server before retrieval and prompting.
- Do not trust model-provided source text or source ids without resolving them against retrieved evidence.
- Do not store full prompts, full answers, transcripts, or source excerpts in the usage ledger.
- Do not let records act as instructions to the model.
- Keep frontend copy provider-neutral and Echo-first.
- Preserve the allowed sign-in-domain policy and per-user OAuth behavior.

## Known limitations and deferred work

- ClickUp data currently comes from mapped REST API lists and the existing meeting archive path; Echo does not yet search every workspace Doc, comment, or arbitrary list.
- The Codex ClickUp MCP installation is personal to the Codex user and is not used by deployed Echo.
- Conversation history is session-only; persistent history is intentionally deferred.
- Echo is read-only; task creation, record edits, and autonomous actions are deferred.
- Inline citation rendering is intentionally lightweight. If richer markdown is added, preserve clickable citations and sanitize untrusted content.
- Daily brief is currently a suggested prompt, not a proactive notification or scheduled job.
- Deterministic keyword ranking is used. Semantic/vector retrieval should only be added if a fixed evaluation set demonstrates a real accuracy gap.
- The original implementation plan still contains some proposal language; this handoff and the current source code are the source of truth for shipped behavior.

## Recommended next steps

1. Validate the deployed OAuth callback and allowed-domain policy with two test users whose ClickUp permissions differ.
2. Run the Supabase schema migration if it has not been applied in the deployment environment.
3. Add fixture-based tests for citation mapping, restricted pages, and “my tasks” matching across multiple assignees.
4. Improve structured answer cards only after agreeing on stable response data (tasks, deadlines, decisions, changes).
5. Add workspace-wide sources only with an explicit permission model that preserves ClickUp visibility per user.
6. If direct official ClickUp MCP support is desired, treat it as a separate adapter: each Echo user still needs OAuth, and MCP must not bypass the current page-access checks.

## Handoff checklist

- Read this file and `docs/ASK_ECHO_IMPLEMENTATION_PLAN.md`.
- Check `git status` and current branch before editing.
- Work in `frontend/` for npm commands.
- Inspect existing seams before changing auth, retrieval, or response contracts.
- Keep Echo as the visible product identity.
- Run tests/build/lint proportional to the change.
- Update this file's changelog when behavior or architecture changes materially.
- Commit and push to `main` only when the user explicitly asks for it.
