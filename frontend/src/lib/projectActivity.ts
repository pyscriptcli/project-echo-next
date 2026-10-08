import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export type ProjectActivityInput = {
  folderId: string;
  listId: string;
  listName: string;
  taskId?: string | null;
  taskName?: string | null;
  eventType: string;
  summary: string;
  taskUrl?: string | null;
  details?: Record<string, unknown>;
};

export type ProjectActivityItem = ProjectActivityInput & {
  id: string;
  actorId: string | null;
  actorName: string;
  createdAt: string;
};

let client: SupabaseClient | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  if (!url || !key) throw new Error('Project activity storage is not configured in Supabase.');
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

export async function recordProjectActivity(request: NextRequest, event: ProjectActivityInput) {
  try {
    const user = getUserFromRequest(request);
    const { error } = await getClient().from('project_activity').insert({
      folder_id: event.folderId,
      list_id: event.listId,
      list_name: event.listName,
      task_id: event.taskId || null,
      task_name: event.taskName || null,
      event_type: event.eventType,
      summary: event.summary,
      actor_id: user?.id ? String(user.id) : null,
      actor_name: user?.username || user?.email || 'Project member',
      task_url: event.taskUrl || null,
      details: event.details || {},
    });
    if (error) console.error('[Project activity] Could not record event:', error.message);
  } catch (error) {
    console.error('[Project activity] Could not record event:', error);
  }
}

export async function readProjectActivity(folderId: string, listId?: string) {
  let query = getClient().from('project_activity')
    .select('id, folder_id, list_id, list_name, task_id, task_name, event_type, summary, actor_id, actor_name, task_url, details, created_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (listId) query = query.eq('list_id', listId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: String(row.id), folderId: String(row.folder_id), listId: String(row.list_id), listName: String(row.list_name),
    taskId: row.task_id ? String(row.task_id) : null, taskName: row.task_name ? String(row.task_name) : null,
    eventType: String(row.event_type), summary: String(row.summary), actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: String(row.actor_name || 'Project member'), taskUrl: row.task_url ? String(row.task_url) : null,
    details: row.details && typeof row.details === 'object' ? row.details as Record<string, unknown> : {}, createdAt: String(row.created_at),
  })) as ProjectActivityItem[];
}
