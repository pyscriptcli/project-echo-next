import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getWorkspaceApiToken } from "@/lib/auth";

const MARKET_INSIGHTS_LIST_ID = "901420987429";
type Sector = "industrial" | "retail";

type Article = { sector: Sector; date: string; company: string; event: string; implications: string; source: string };

function tokenFor(req: NextRequest) {
  return getTokenFromRequest(req) || getWorkspaceApiToken();
}

function normalise(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function articleFrom(value: unknown): Article | null {
  const source = value && typeof value === "object" ? value as Partial<Article> : {};
  const sector = normalise(source.sector).toLowerCase();
  if ((sector !== "industrial" && sector !== "retail") || !normalise(source.date) || !normalise(source.company) || !normalise(source.event)) return null;
  return { sector, date: normalise(source.date), company: normalise(source.company), event: normalise(source.event), implications: normalise(source.implications), source: normalise(source.source) } as Article;
}

function descriptionFor(article: Article) {
  return JSON.stringify({ echoMarketInsight: article }, null, 2);
}

function parseTask(task: any) {
  const text = task.text_content || task.description || "";
  try {
    const parsed = JSON.parse(text);
    const article = articleFrom(parsed?.echoMarketInsight);
    if (article) return { id: String(task.id), url: task.url || "", ...article };
  } catch {}
  return null;
}

async function listTasks(token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/list/${MARKET_INSIGHTS_LIST_ID}/task?include_closed=true&page=0`, { headers: { Authorization: token }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to read the Market Insights archive from ClickUp.");
  const body = await response.json();
  return (body.tasks || []).map(parseTask).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const token = tokenFor(req);
  if (!token) return NextResponse.json({ error: "ClickUp authentication required." }, { status: 401 });
  try { return NextResponse.json({ listId: MARKET_INSIGHTS_LIST_ID, articles: await listTasks(token) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Market Insights." }, { status: 502 }); }
}

export async function POST(req: NextRequest) {
  const token = tokenFor(req);
  if (!token) return NextResponse.json({ error: "ClickUp authentication required." }, { status: 401 });
  try {
    const article = articleFrom(await req.json());
    if (!article) return NextResponse.json({ error: "Sector, date, company, and event are required." }, { status: 400 });
    const response = await fetch(`https://api.clickup.com/api/v2/list/${MARKET_INSIGHTS_LIST_ID}/task`, { method: "POST", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify({ name: `${article.date} · ${article.company}`, description: descriptionFor(article), tags: ["market-insight", article.sector] }) });
    if (!response.ok) throw new Error("ClickUp could not create this market insight.");
    return NextResponse.json({ success: true, article: parseTask(await response.json()) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Market Insight." }, { status: 502 }); }
}

export async function PATCH(req: NextRequest) {
  const token = tokenFor(req);
  if (!token) return NextResponse.json({ error: "ClickUp authentication required." }, { status: 401 });
  try {
    const body = await req.json(); const article = articleFrom(body); if (!body.id || !article) return NextResponse.json({ error: "A complete article record is required." }, { status: 400 });
    const response = await fetch(`https://api.clickup.com/api/v2/task/${body.id}`, { method: "PUT", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify({ name: `${article.date} · ${article.company}`, description: descriptionFor(article) }) });
    if (!response.ok) throw new Error("ClickUp could not update this market insight.");
    return NextResponse.json({ success: true, article: parseTask(await response.json()) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update Market Insight." }, { status: 502 }); }
}
