# Echo Recorder and live transcription implementation plan

## Outcome

Echo provides one **Record meeting** action.

- Primary path: Echo Recorder Companion captures microphone and system audio with saved user preferences.
- Fallback path: the browser Studio recorder captures the meeting when the companion is unavailable.
- Completed audio batches are transcribed during the meeting.
- **Send to Notetaker** waits only for the last unfinished audio, joins the transcript in order, and creates the final minutes.
- Users see simple progress language. Recorder/provider details stay behind the scenes.

## Product decisions

- Keep one recording experience. Do not ask users to choose “in-person” or “online”.
- Prefer the desktop companion when installed and healthy.
- Fall back automatically to browser recording.
- Ask for browser screen/audio permission only on the fallback path.
- Keep the current local recording recovery and manual **Save recording** action.
- Treat background transcription as preparation. Generate final decisions, actions, summaries, and minutes only after the complete meeting is available.
- Do not lose recording audio when transcription fails.

## Current foundation

The repository already contains most building blocks:

- `frontend/src/hooks/useStudioRecorder.ts` captures microphone/system audio and emits MediaRecorder data.
- `frontend/src/lib/studioStorage.ts` stores raw chunks and session metadata in IndexedDB.
- `frontend/src/lib/audioPipeline.ts` implements the 10-layer processing pipeline, chunk cache, retry queue, concurrency control, and telemetry.
- `frontend/src/lib/api.ts` already exposes single-chunk transcription through `transcribeSingleChunk` and full-file processing through `processSource`.
- `frontend/src/components/StudioPanel.tsx` owns the recording controls and Notetaker handoff.
- `frontend/src/app/page.tsx` runs the current post-recording transcription and minutes flow.

The missing seam is a recording-session coordinator that connects Studio chunks to the existing transcription worker while recording.

## Target experience

### First use

1. User clicks **Record meeting**.
2. Echo checks for the Recorder Companion.
3. If available, Echo starts it with saved microphone/system-audio preferences.
4. If unavailable, Echo opens browser capture.
5. Echo shows one short status: **Recording**.

### During the meeting

- Audio saves locally every 10 seconds for recovery.
- Echo groups saved audio into 45–60 second transcription batches.
- One or two batches process in the background.
- UI shows compact status such as **Keeping notes ready**.
- Network or transcription failures never stop recording.
- Failed batches remain queued for retry.

### Send to Notetaker

1. User clicks **Send to Notetaker**.
2. Recorder stops and flushes the final audio.
3. Echo waits for incomplete and failed batches, with a bounded retry.
4. Echo joins transcripts by sequence number.
5. Echo removes repeated words at batch boundaries.
6. Echo runs the meeting-wide cleanup and minutes generation once.
7. Notetaker opens with the finished transcript and timestamped notes.

Expected result: a long meeting should require only the last batch plus final synthesis after Stop.

## Architecture

```text
Record meeting
    |
    v
Recorder selector
    |-- Companion healthy: native capture
    |-- Companion unavailable: browser capture
    |
    v
Raw 10-second recovery chunks
    |
    v
45–60 second transcription batches
    |
    v
Background transcription queue
    |-- complete transcript segment
    |-- retryable failure
    |-- waiting for network
    |
    v
Finalization barrier
    |
    v
Ordered transcript + meeting-wide synthesis
    |
    v
Notetaker
```

## Module boundaries

### Recorder adapter

Create `frontend/src/lib/recorder/types.ts`:

```ts
interface RecorderAdapter {
  kind: "companion" | "browser";
  health(): Promise<"ready" | "unavailable">;
  start(options: RecorderOptions): Promise<RecordingSession>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<RecordedAudio>;
}
```

Implement:

- `companionRecorder.ts`: local companion health check and commands.
- `browserRecorder.ts`: wraps the current `useStudioRecorder` behavior.
- `selectRecorder.ts`: companion-first selection with browser fallback.

The UI must not branch on recorder type beyond a small fallback notice.

### Recording session coordinator

Create `frontend/src/lib/recording-session/coordinator.ts`.

Responsibilities:

- Accept saved 10-second chunks.
- Keep raw chunks intact for recovery/export.
- Combine raw chunks into transcription batches.
- Assign stable session id, batch index, start time, and end time.
- Queue eligible batches without blocking recording.
- Track state through one public session snapshot.
- Flush and finalize on Stop/Send.

Suggested batch state:

```ts
type BatchStatus =
  | "collecting"
  | "queued"
  | "transcribing"
  | "complete"
  | "retrying"
  | "failed";
```

### Background transcription queue

Reuse the retry/cache logic in `audioPipeline.ts`; do not build a second retry system.

Add a public batch-oriented interface:

```ts
transcribeRecordingBatch({
  sessionId,
  batchIndex,
  audio,
  startedAtMs,
  endedAtMs,
  signal,
}): Promise<TranscriptSegment>
```

Requirements:

- Stable idempotency key: `${sessionId}:transcript:${batchIndex}`.
- Maximum concurrency: 1 by default, configurable to 2.
- Retry transient network/server failures with bounded backoff.
- Never retry invalid/unsupported audio indefinitely.
- Cache successful transcripts.
- Return segment timestamps and usage telemetry.
- Do not send the same successful batch twice.

### Session storage

Extend IndexedDB rather than replacing it.

Add stores or versioned records for:

- transcription batch metadata
- partial transcript segments
- retry state
- last acknowledged batch
- finalization state

Keep raw audio until one of these occurs:

- user discards the recording
- Notetaker handoff succeeds and retention policy permits cleanup
- user explicitly removes a recovered session

Never delete raw chunks merely because their transcript completed.

### Finalization service

Create one service responsible for the final barrier:

```ts
finalizeRecordingSession(sessionId): Promise<FinalizedMeetingInput>
```

It must:

- stop accepting new chunks
- flush the final partial batch
- wait for active work
- retry recoverable failures
- process any remaining audio
- join segments strictly by batch index
- remove overlap duplication
- mark gaps instead of inventing missing speech
- return transcript, notes, telemetry, and warnings

Then call the existing meeting-wide metadata/minutes generation flow once.

## Chunk strategy

Use two chunk sizes for different jobs:

- **10-second raw chunks:** local crash recovery. Keep current behavior.
- **45–60 second transcription batches:** network/model processing.

Do not submit every 10-second chunk. That increases request count, cost, boundary errors, and rate-limit pressure.

Each transcription batch should overlap the previous batch by about 1–2 seconds or retain a short text tail for deduplication. The final joiner removes repeated boundary words.

Flush early when:

- user pauses
- user stops
- source changes
- buffered audio reaches an upload-size limit
- browser moves to background and recovery rules require it

## Failure behavior

### Companion unavailable before recording

Use browser recorder automatically. Show:

> Using browser recording this time.

### Companion disconnects during recording

- Preserve all acknowledged companion chunks.
- Ask the companion to finalize its local file.
- Continue with browser microphone only if the browser already has permission.
- Otherwise keep the session recoverable and explain the next action.
- Do not silently claim continuous coverage when a gap exists.

### Network unavailable

- Continue recording and saving chunks.
- Mark transcription batches as waiting.
- Resume the queue when connectivity returns.
- Send to Notetaker waits for a bounded time, then offers:
  - **Keep working in background**
  - **Use available transcript**
  - **Save recording**

### One batch repeatedly fails

- Keep the raw audio.
- Mark the transcript gap with its timestamp.
- Retry during finalization.
- Never fabricate the missing text.

### Browser refresh or crash

- Recover raw chunks, completed transcript segments, notes, and queue state.
- Resume only missing batches.
- Never retranscribe completed cached batches.

## Simple UI

### Studio panel

Keep:

- Record
- Pause/Resume
- Stop
- Save recording
- Send to Notetaker
- Discard

Add one small processing line:

- **Recording**
- **Keeping notes ready**
- **Finishing the last part**
- **Ready for Notetaker**
- **Some audio still needs attention**

Avoid:

- queue terminology
- chunk counts
- model/provider names
- 10-layer pipeline language
- percentages that are not based on completed work

### Send to Notetaker progress

Use four real steps:

1. **Finishing the recording**
2. **Checking the transcript**
3. **Preparing your meeting notes**
4. **Opening Notetaker**

Completed steps receive a check. Current step shows activity. Failed steps show one plain recovery action.

## Recorder Companion

The companion is a separate Windows application. Recommended implementation:

- Tauri or a small .NET Windows app.
- Windows Graphics Capture for display capture.
- WASAPI loopback for system audio.
- Standard microphone capture.
- Local loopback connection to Echo with an authenticated one-time pairing secret.
- Local encrypted settings for preferred monitors and audio devices.
- Local recording spool so closing the browser does not lose audio.

Companion endpoints/messages should support:

- health/version
- pair/unpair
- device list
- saved preferences
- start/pause/resume/stop
- chunk ready
- session status
- export recording
- cleanup after confirmed handoff

Do not expose the local companion on a network interface. Bind only to localhost and authenticate every command.

## API and server requirements

Background transcription should use authenticated server routes. Do not put provider keys in the browser or companion.

Suggested routes:

- `POST /api/recordings/sessions`
- `POST /api/recordings/[sessionId]/batches`
- `GET /api/recordings/[sessionId]/status`
- `POST /api/recordings/[sessionId]/finalize`
- `DELETE /api/recordings/[sessionId]`

Server rules:

- session belongs to authenticated Echo user
- bounded batch size and duration
- idempotent batch upload
- rate and concurrency limits
- short retention for uploaded audio
- no cross-user access
- explicit finalization and cleanup states
- privacy-safe usage logs

## Delivery phases

### Phase 1 — Live transcription seam

- Extract a public single-batch transcription function from the current pipeline.
- Add stable batch ids, status, retries, and cached transcript segments.
- Keep full-file transcription unchanged as fallback.
- Add deterministic tests for ordering, retry, idempotency, and transcript joining.

Acceptance:

- Completed batches transcribe while recording continues.
- Failed batches do not stop recording.
- Recovered sessions do not retranscribe successful batches.

### Phase 2 — Browser Studio integration

- Connect the recorder's 10-second flushes to the session coordinator.
- Build 45–60 second transcription batches.
- Add simple live status.
- Make Send to Notetaker use the finalization barrier.
- Preserve Save recording, Discard, and recovery.

Acceptance:

- Five-minute browser recording has partial transcript ready before Stop.
- Send waits only for remaining work.
- Save and Discard still work.
- Full recording remains recoverable after refresh.

### Phase 3 — Server session persistence

- Add authenticated recording-session and batch routes.
- Persist processing state outside the tab.
- Enforce idempotency, ownership, rate limits, and retention.
- Allow queue recovery after browser restart.

Acceptance:

- Refresh resumes missing work.
- Duplicate upload returns the original batch result.
- One user cannot access another user's recording session.

### Phase 4 — Recorder Companion prototype

- Build Windows capture spike.
- Prove microphone plus system audio.
- Prove one or two monitor preference handling.
- Prove local chunk delivery and full local recovery.
- Measure CPU, memory, audio drift, and hour-long stability.

Acceptance:

- One-click start after initial pairing.
- Recording continues when browser tab changes.
- One-hour session remains synchronized and recoverable.

### Phase 5 — Companion-first rollout

- Add health-based recorder selection.
- Use companion as primary.
- Use browser as automatic fallback.
- Add one-time pairing/setup UI.
- Add version compatibility checks and safe upgrade messaging.

Acceptance:

- Installed healthy companion starts from one Record click.
- Missing companion falls back without losing the user's intent.
- UI controls and Notetaker handoff behave the same for both paths.

### Phase 6 — Production hardening

- Add recording/transcription evaluation fixtures.
- Test long meetings, silence, device changes, network loss, refresh, duplicate batches, and companion interruption.
- Add privacy-safe telemetry for time-to-ready, failed batches, fallback rate, and finalization time.
- Tune batch duration and concurrency from measured results.

Acceptance:

- No lost raw recording in tested interruption cases.
- Transcript order is deterministic.
- Median post-stop wait is materially lower than full post-recording transcription.
- Rollback can return to the existing full-file pipeline.

## Rollout and rollback

Use feature flags:

- `LIVE_TRANSCRIPTION_ENABLED`
- `COMPANION_RECORDER_ENABLED`
- `COMPANION_PRIMARY_ENABLED`

Roll out in this order:

1. Internal browser sessions with live transcription.
2. Small user group.
3. Companion opt-in.
4. Companion primary for paired users.
5. Broader rollout after stability targets pass.

Rollback:

- Disable live transcription and send the completed full recording through the current `processSource` path.
- Disable companion primary and use browser Studio.
- Keep session audio and cached transcript data readable across rollback.

## Verification plan

Unit:

- batch formation
- stable ids
- ordered transcript join
- overlap deduplication
- retry classification
- state transitions
- user ownership checks

Integration:

- recorder flush to transcription queue
- pause/stop final batch
- offline queue recovery
- duplicate upload
- Send to Notetaker finalization
- browser fallback when companion health fails

End-to-end:

- in-person microphone meeting
- online meeting with system audio
- one-hour meeting
- browser refresh
- network loss and recovery
- companion disconnect
- Save recording and Discard
- restricted user/session access

Performance targets to measure:

- background batch completion lag
- post-stop wait time
- transcription request count
- cost per meeting hour
- CPU/memory during capture
- failed/retried batch rate
- companion-to-browser fallback rate

## Stop conditions

Initial implementation is complete when:

- browser Studio transcribes completed batches during recording
- raw audio remains recoverable
- Send to Notetaker finalizes ordered transcript and minutes
- failed batches retry without stopping recording
- full-file processing remains available as fallback
- tests cover ordering, recovery, idempotency, and access

Companion work starts only after browser live transcription proves stable. This prevents recorder transport work from masking transcription-state bugs.

