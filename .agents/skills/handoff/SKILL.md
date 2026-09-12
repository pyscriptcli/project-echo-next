---
name: handoff
description: Update the repository handoff.md with current project context and keep a rolling record of the two latest explicit handoffs.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Update the repository root's `handoff.md`. This is the working file and canonical handoff location for this project. Do not create a separate temporary handoff file.

Keep the permanent project guide in place. Add or replace only the `Recent handoffs` section. That section must contain exactly the two newest explicit handoff entries, newest first. Prepend each new entry. Remove the oldest entry only when a third entry would exist. A handoff tomorrow must not erase today's entry unless two newer handoffs have been recorded.

Create a new entry only when the user explicitly asks for a handoff. Do not update the rolling entries after every ordinary coding session.

Include a `Suggested skills` line in each dated entry. Use `caveman` for the compressed entry style. Use `ponytail` only if that skill is installed and available; if unavailable, record `ponytail unavailable` and continue with `caveman`. Never invent a missing skill.

Each dated entry should include: date and focus; current state and decisions; relevant files; verification status; commit/branch status when known; blockers or risks; next actions; and `Suggested skills`.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
