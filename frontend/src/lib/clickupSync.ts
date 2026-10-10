import { clickUpCalendarFetch } from "@/lib/clickupCalendarApi";
import { claimClickUpSyncJobs, completeClickUpSyncJob, decryptClickUpToken, failClickUpSyncJob, isClickUpSyncStorageReady, persistClickUpConnection, registerClickUpWebhook, clickUpScope, revokeClickUpSyncConnection } from "@/lib/clickupReadStore";

export async function registerClickUpListWebhook(token: string, userId: string, listId: string) {
  const endpoint = process.env.CLICKUP_WEBHOOK_URL || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/integrations/clickup/webhooks` : "");
  if (!endpoint || !await isClickUpSyncStorageReady()) return;
  const scope = clickUpScope(token);
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing } = await client.from("echo_clickup_webhooks").select("webhook_id").eq("scope_key", scope).eq("list_id", listId).eq("active", true).maybeSingle();
  if (existing) return;
  if (!await persistClickUpConnection(token, userId)) return;
  const teamsResponse = await clickUpCalendarFetch(token, "https://api.clickup.com/api/v2/team");
  if (!teamsResponse.ok) return;
  const teams = await teamsResponse.json().catch(() => ({})) as { teams?: Array<{ id?: string | number }> };
  const teamId = String(teams.teams?.[0]?.id || "");
  if (!teamId) return;
  const response = await clickUpCalendarFetch(token, `https://api.clickup.com/api/v2/team/${encodeURIComponent(teamId)}/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, events: ["taskCreated", "taskUpdated", "taskDeleted", "taskMoved"], list_id: Number(listId) }) });
  if (!response.ok) return;
  const payload = await response.json().catch(() => ({})) as { id?: string | number; secret?: string };
  if (payload.id && payload.secret) await registerClickUpWebhook({ webhookId: String(payload.id), scope, listId, secret: payload.secret });
}

export async function processClickUpSyncQueue(limit = 2) {
  const jobs = await claimClickUpSyncJobs(limit);
  return Promise.all(jobs.map(async (job) => {
    try {
      const token = decryptClickUpToken(job.encrypted_token);
      const tasks: unknown[] = [];
      for (let page = 0; page < 30; page += 1) {
        const response = await clickUpCalendarFetch(token, `https://api.clickup.com/api/v2/list/${encodeURIComponent(job.list_id)}/task?include_closed=true&subtasks=true&include_markdown_description=true&page=${page}`);
        if (response.status === 401) {
          await revokeClickUpSyncConnection(job.scope_key);
          return { synced: false, listId: job.list_id, reason: "connection-expired" };
        }
        if (!response.ok) throw new Error(`ClickUp returned ${response.status}.`);
        const payload = await response.json() as { tasks?: unknown[] };
        const batch = Array.isArray(payload.tasks) ? payload.tasks : [];
        tasks.push(...batch);
        if (batch.length < 100) {
          await completeClickUpSyncJob(job.id, job.scope_key, job.list_id, tasks);
          return { synced: true, listId: job.list_id, records: tasks.length };
        }
      }
      throw new Error("The list exceeds the 3,000-record sync limit; no partial snapshot was published.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      await failClickUpSyncJob(job.id, message);
      return { synced: false, listId: job.list_id };
    }
  }));
}
