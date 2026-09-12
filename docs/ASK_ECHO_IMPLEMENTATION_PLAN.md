# Ask Echo implementation plan

## Outcome

Ask Echo becomes a trustworthy, read-only meeting intelligence assistant. It answers questions across the meeting archive, supports follow-up questions during the current session, and shows the meeting evidence behind every factual answer.

The experience uses the PRIME Philippines visual system and is governed from a dedicated AI tab in System Administration, where authorized administrators can select approved models, inspect measured token usage, and configure budgets and rate limits.

## Product boundaries

- Ask Echo searches meeting archives only in the first release.
- It does not edit minutes, create tasks, or modify records.
- Conversation history lasts for the current browser session only.
- Users can only retrieve meetings they are authorized to view.
- Administrators may receive organization-wide archive access when the server confirms that role.
- The server, never the language model, enforces access control.
- If the archive does not support an answer, Echo says so explicitly.
- Provider credentials remain server-side environment secrets and are never displayed or saved in browser-accessible configuration.
- Model selection is limited to a server-defined catalog of supported models.
- “Tokens remaining” means the remaining Project Echo budget calculated from measured usage. Provider account balance is shown only when a provider exposes a reliable billing API.

## Target request flow

1. The signed-in user submits a question and recent conversation turns.
2. The server validates authentication, request size, and conversation shape.
3. The server determines the user's archive access scope.
4. A retrieval module selects a small set of relevant meetings and meeting items.
5. The model receives the question, bounded conversation history, and selected evidence as clearly separated data.
6. The model returns a validated structured answer containing claims and source references.
7. The API resolves source references to safe meeting metadata and returns them to the client.
8. The drawer renders the answer and evidence cards. No source means no unsupported factual claim.
9. The server records token usage and applies the configured user and organization limits.

## Proposed response contract

```ts
interface AskEchoResponse {
  answer: string;
  sources: Array<{
    meetingId: string;
    meetingTitle: string;
    meetingDate: string;
    itemId?: string;
    topic?: string;
    excerpt: string;
  }>;
  confidence: "supported" | "partial" | "insufficient";
  followUps: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

## Approved user experience

### Ask Echo drawer

- Keep the global right-side drawer for quick questions.
- Add an Expand action that opens a dedicated full-page conversation workspace.
- Begin with a concise personalized greeting, four useful suggestions, and compact date-range and meeting-type filters.
- Collapse suggested questions after the conversation begins.
- Use a growing multiline composer with Send, Stop, and New conversation actions.
- Show the active scope beside the composer, for example `ALL MEETINGS · LAST 90 DAYS`.
- Render the answer first, followed by evidence cards showing meeting title, date, topic, and a source excerpt.
- Open the corresponding meeting when a source card is selected.
- Keep conversation history for the current browser session only.

### PRIME Philippines treatment

- Use PRIME Blue `#003366` and PRIME Warm White `#FFFCFB` as the only content surfaces.
- Use PRIME Gold `#C9A84C` for thin rules, selected states, and restrained premium accents, never as a large fill.
- Use the official white PRIME logo on Blue and the official blue logo on Warm White.
- Use Cormorant Garamond for the Ask Echo title, Montserrat Regular for messages and controls, and Montserrat Medium uppercase with wide tracking for UI labels.
- Keep every card, input, button, badge, and drawer edge square.
- Use PRIME Gray `#181D1E` only for body text, never as a background.
- Distinguish partial or insufficient evidence with copy and icons rather than using PRIME Gold as a warning color.

## AI administration tab

Add an `AI` tab to the existing System Administration page. It is visible only to the protected Owner and authorized administrators; sensitive configuration changes can be restricted to the Owner if required.

### Overview

- Current operational status and selected model.
- Requests, input tokens, output tokens, and total tokens for today and the current month.
- Remaining daily and monthly Project Echo token budgets.
- Recent rate-limit rejections and provider failures.
- Provider account balance or quota only when a supported provider exposes that information; otherwise label it as unavailable rather than estimating it.

### Model configuration

- Select a default Ask Echo model from a server-maintained catalog.
- Show provider, model identifier, context-window metadata, capability notes, and estimated cost class.
- Configure a fallback model from the same approved catalog.
- Test the selected model with a small server-side health check before saving.
- Never accept or render unrestricted model identifiers from ordinary users.
- Never display full API keys. The page may show only whether each server-side credential is configured and an optional masked suffix.

### Limits and rate limiting

- Maximum requests per user per minute.
- Maximum concurrent Ask Echo requests per user.
- Maximum input characters and bounded conversation turns per request.
- Maximum retrieved sources and evidence characters per request.
- Maximum output tokens per response.
- Daily token allowance per user.
- Monthly token allowance for the organization.
- Configurable behavior when a limit is reached: reject with a retry time; never silently switch to an unapproved provider.
- Owner bypass is explicit and configurable rather than implicit.

### Usage ledger

- Record timestamp, authenticated user ID, selected model, request status, latency, input tokens, output tokens, and total tokens.
- Do not store full prompts, answers, transcripts, provider keys, or source excerpts in usage records.
- Aggregate server-side for daily and monthly views.
- Mark estimated token counts distinctly when a provider does not return authoritative usage.
- Define a retention period for detailed usage events and retain only aggregates beyond it.

### Configuration storage

- Store non-secret AI policy in protected server-side configuration.
- Store provider credentials only in deployment environment secrets.
- Validate all model and limit settings on the server before saving.
- Maintain safe defaults when configuration is missing or unavailable.
- Record who changed AI policy and when.

## Delivery phases

### Phase 1: Stabilize the existing assistant

- Split archive Q&A from minutes-editing behavior.
- Replace the mismatched `feedback_message` client handling with one typed `answer` contract.
- Add schema validation for requests and model responses.
- Add authentication, request-size limits, timeout handling, and safe user-facing errors.
- Stop accepting browser-supplied provider credentials for the archive assistant; use server configuration.
- Introduce the server-side AI configuration schema and approved model catalog.

Acceptance criteria:

- A successful API response always appears in the drawer.
- Unauthenticated requests are rejected.
- Invalid or oversized requests return controlled errors.
- Existing minutes-editing workflows continue using their current behavior independently.

### Phase 2: Build the evidence and retrieval layer

- Normalize archived meetings into searchable meeting and item records with stable IDs.
- Create a server-owned repository interface for authorized meeting retrieval.
- Start with deterministic keyword/date/person filtering and ranked scoring.
- Add semantic retrieval only if the evaluation set shows a meaningful accuracy gap.
- Limit the evidence sent to the model by count and character budget.
- Treat meeting text as untrusted source data and isolate it from system instructions.

Acceptance criteria:

- The model receives only authorized, relevant records.
- Large archives do not cause the entire archive to be serialized into a prompt.
- Each returned source resolves to a real meeting or meeting item.
- Source excerpts are copied from stored records rather than generated by the model.

### Phase 3: Grounded answers and session conversation

- Send a bounded window of recent conversation turns with each question.
- Require the model to reference source IDs for factual claims.
- Return `supported`, `partial`, or `insufficient` confidence based on resolved evidence.
- Generate a small set of contextual follow-up suggestions.
- Add a New conversation action that clears session history.

Acceptance criteria:

- Follow-up questions resolve references from recent turns.
- Questions without supporting archive evidence receive an insufficient-evidence response.
- Every supported factual answer displays at least one valid source.
- Closing and reopening the drawer during the same browser session preserves the conversation; a new browser session does not.

### Phase 4: Production safeguards and evaluation

- Add per-user rate limiting and concurrent-request protection.
- Add request cancellation from the UI.
- Record privacy-safe telemetry: latency, retrieval count, response status, source resolution, and model usage.
- Create a versioned evaluation set covering decisions, action owners, deadlines, comparisons, missing evidence, ambiguous names, and access boundaries.
- Run evaluations when retrieval, prompts, response schemas, or models change.
- Persist privacy-safe usage events and enforce configured per-user and organization budgets.
- Add the administrator AI tab for model selection, operational status, usage, and limit configuration.

Acceptance criteria:

- A repeated evaluation run produces measurable groundedness and retrieval results.
- Prompt or model changes cannot be released without detecting regressions in the core question set.
- Logs contain no provider keys or full meeting transcripts.
- Usage totals reconcile with provider-returned token counts when those counts are available.
- Exceeding a configured rate or token limit produces a clear response with the correct retry/reset time.

### Phase 5: PRIME-branded interface

- Apply the approved drawer, full-page workspace, evidence-card, scope-filter, and multiline-composer design.
- Apply official PRIME logos, colors, typography, spacing, and square geometry.
- Build the AI administration tab using the same visual hierarchy.
- Verify keyboard navigation, focus states, responsive behavior, readable contrast, loading states, and reduced-motion behavior.

Acceptance criteria:

- The drawer and expanded workspace feel like one continuous experience.
- Evidence remains visible and usable on mobile and desktop.
- The UI uses only approved PRIME content surfaces and official logo artwork.
- All chatbot and AI administration controls are keyboard accessible.

## Suggested module boundaries

- `src/app/api/ask-echo/route.ts`: transport, authentication, validation, and response mapping only.
- `src/lib/ask-echo/repository.ts`: authorized meeting access.
- `src/lib/ask-echo/retrieval.ts`: query parsing, filtering, ranking, and context budgeting.
- `src/lib/ask-echo/prompt.ts`: stable model instructions and evidence formatting.
- `src/lib/ask-echo/schema.ts`: request, model-output, and API-response types and validation.
- `src/lib/ask-echo/service.ts`: orchestration across repository, retrieval, model, and source resolution.
- `src/lib/ask-echo/config.ts`: validated non-secret model, budget, and rate-limit policy.
- `src/lib/ask-echo/models.ts`: server-maintained approved model catalog and provider adapters.
- `src/lib/ask-echo/limits.ts`: atomic user and organization limit enforcement.
- `src/lib/ask-echo/usage.ts`: privacy-safe usage recording and aggregation.
- `src/components/UniversalEchoDrawer.tsx`: conversation presentation and interaction only.
- `src/components/ask-echo/`: shared conversation, evidence, composer, filter, and status components.
- `src/components/forms/FormsPortal.tsx`: AI tab shell only; delegate AI settings to focused components.

## Verification strategy

- Unit tests for retrieval ranking, context limits, schema validation, and source resolution.
- Route tests for authentication, authorization, malformed input, provider failure, and timeouts.
- Policy tests for model allowlisting, budget boundaries, concurrent requests, reset windows, and owner bypass.
- Component tests for send, retry, cancel, source expansion, follow-ups, and session reset.
- Admin component tests for model health checks, safe secret status, usage periods, validation, and limit editing.
- Integration tests using a fixed archive fixture and deterministic model stub.
- Security tests proving one user cannot retrieve a meeting outside their authorized scope.

## Deferred work

- Searching Tasks, Forms, Demands, or Notebook records.
- Persistent conversation history.
- Editing minutes or creating ClickUp tasks from chat.
- Autonomous actions or multi-step agents.
- Semantic/vector infrastructure unless deterministic retrieval proves insufficient.

## UI decisions to settle

- Whether the full-page workspace is a dedicated navigation item or opens only from the drawer.
- Whether only the Owner may change model and budget policy while other administrators receive read-only usage access.
- The default daily per-user and monthly organization token budgets.
- The detailed usage-event retention period.
