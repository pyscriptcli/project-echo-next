import type { EchoSourcePage } from "./access";
import type { EvidenceSource } from "./retrieval";

const PAGE_LISTS: Partial<Record<EchoSourcePage, string>> = {
  notebook: "901418075633",
  demands: "901420989525",
  "market-insights": "901420987429",
};

type Fetcher = typeof fetch;

function taskSource(task: any, page: EchoSourcePage): EvidenceSource {
  const description = String(task.text_content || task.markdown_description || task.description || "").slice(0, 5000);
  return {
    sourceId: `clickup:${page}:${task.id}`,
    meetingId: String(task.id),
    meetingTitle: String(task.name || "ClickUp item"),
    meetingDate: task.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : task.date_updated ? new Date(Number(task.date_updated)).toISOString().slice(0, 10) : "",
    topic: String(task.status?.status || ""),
    excerpt: description || `Status: ${task.status?.status || "Not set"}`,
    person: (task.assignees || []).map((person: any) => person.username || person.email).filter(Boolean).join(", "),
    due: task.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : "",
    page,
    url: task.url || "",
  };
}

async function fetchList(token: string, listId: string, page: EchoSourcePage, fetcher: Fetcher) {
  const response = await fetcher(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task?include_closed=true&subtasks=true&include_markdown_description=true&page=0`, { headers: { Authorization: token }, cache: "no-store" });
  if (!response.ok) return [];
  const body = await response.json();
  return (body.tasks || []).map((task: any) => taskSource(task, page));
}

export async function loadClickUpContext(args: { token: string; pages: EchoSourcePage[]; taskListId: string; formListIds: string[]; fetcher?: Fetcher }): Promise<EvidenceSource[]> {
  if (!args.token) return [];
  const fetcher = args.fetcher || fetch;
  const requests: Array<Promise<EvidenceSource[]>> = [];
  const seen = new Set<string>();
  const add = (page: EchoSourcePage, listId?: string) => { if (!listId || seen.has(`${page}:${listId}`)) return; seen.add(`${page}:${listId}`); requests.push(fetchList(args.token, listId, page, fetcher)); };
  for (const page of args.pages) {
    if (page === "tasks") add(page, args.taskListId);
    else if (page === "forms") args.formListIds.forEach((listId) => add(page, listId));
    else add(page, PAGE_LISTS[page]);
  }
  return (await Promise.all(requests)).flat();
}
