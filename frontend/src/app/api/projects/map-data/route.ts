import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { clearClickUpCalendarCache, clickUpCalendarFetch } from '@/lib/clickupCalendarApi';

export const dynamic = 'force-dynamic';
const GEOJSON_LIST_ID = '901412841984';
const START = '<!-- PROJECT_ECHO_GEOJSON_V1_START -->';
const END = '<!-- PROJECT_ECHO_GEOJSON_V1_END -->';
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const MAX_GEOJSON_BYTES = 450_000;
type GeoFeature = { type: 'Feature'; id?: string | number; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> };
type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[]; [key: string]: unknown };
type MapList = { markdown_content?: string; content?: string; folder?: { id?: string | number } | null };

const writeQueues = new Map<string, Promise<void>>();
const appliedChanges = new Map<string, { revision: string; updatedAt: string }>();

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function validCoordinates(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) || !value.length) return false;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
  }
  return value.every((part) => validCoordinates(part, depth + 1));
}

function validCollection(value: unknown): value is FeatureCollection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const collection = value as Record<string, unknown>;
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length > 10_000) return false;
  const size = new TextEncoder().encode(JSON.stringify(collection)).length;
  if (size > MAX_GEOJSON_BYTES) return false;
  const ids = new Set<string>();
  return collection.features.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const feature = item as Record<string, unknown>;
    const geometry = feature.geometry as Record<string, unknown> | null;
    if (feature.id !== undefined) {
      if ((typeof feature.id !== 'string' && typeof feature.id !== 'number') || (typeof feature.id === 'string' && (!feature.id || feature.id.length > 256)) || (typeof feature.id === 'number' && !Number.isSafeInteger(feature.id))) return false;
      const id = String(feature.id);
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return feature.type === 'Feature' && Boolean(geometry) && ['Point', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(String(geometry?.type))
      && validCoordinates(geometry?.coordinates)
      && (feature.properties == null || (typeof feature.properties === 'object' && !Array.isArray(feature.properties)));
  });
}

function parseCollection(content: string): FeatureCollection {
  const start = content.indexOf(START);
  const end = content.indexOf(END, start + START.length);
  if (start < 0 && end < 0) return EMPTY;
  if (start < 0 || end < 0) throw Object.assign(new Error('The GeoJSON block in the ClickUp list description is incomplete.'), { status: 422 });
  const block = content.slice(start + START.length, end).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const data: unknown = JSON.parse(block);
    if (!validCollection(data)) throw new Error('Stored GeoJSON did not pass validation.');
    return data;
  } catch {
    throw Object.assign(new Error('The GeoJSON stored in the ClickUp list is invalid; it was not overwritten.'), { status: 422 });
  }
}

function replaceCollection(content: string, collection: FeatureCollection) {
  const block = `${START}\n\n\`\`\`json\n${JSON.stringify(collection)}\n\`\`\`\n\n${END}`;
  const start = content.indexOf(START);
  const end = content.indexOf(END, start + START.length);
  if (start >= 0 && end >= 0) return `${content.slice(0, start)}${block}${content.slice(end + END.length)}`.trim();
  return [content.trim(), block].filter(Boolean).join('\n\n');
}

async function getList(token: string, fresh = false) {
  const url = `https://api.clickup.com/api/v2/list/${GEOJSON_LIST_ID}`;
  if (fresh) clearClickUpCalendarCache(token, [`/list/${GEOJSON_LIST_ID}`]);
  const response = await clickUpCalendarFetch(token, url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.err || body.error || 'ClickUp could not read the project map list.'), { status: response.status });
  return { list: body as MapList, content: String((body as MapList).markdown_content || (body as MapList).content || '') };
}

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : 502;
  const message = error instanceof Error ? error.message : 'ClickUp map data could not be saved.';
  return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 502 });
}

async function serializeWrite<T>(work: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(GEOJSON_LIST_ID) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  writeQueues.set(GEOJSON_LIST_ID, tail);
  await previous;
  try { return await work(); }
  finally { release(); if (writeQueues.get(GEOJSON_LIST_ID) === tail) writeQueues.delete(GEOJSON_LIST_ID); }
}

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: 'Sign in with ClickUp to open the project map.' }, { status: 401 });
  try {
    const { content } = await getList(token, true);
    const data = parseCollection(content);
    return NextResponse.json({ data, revision: digest(data), listId: GEOJSON_LIST_ID }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: 'Sign in with ClickUp to save map edits.' }, { status: 401 });
  let body: { data?: unknown; baseRevision?: unknown; changeId?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid map update payload.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid map update payload.' }, { status: 400 });
  const changeId = String(body.changeId || '');
  if (!/^[\w-]{8,160}$/.test(changeId) || typeof body.baseRevision !== 'string' || !validCollection(body.data)) {
    return NextResponse.json({ error: 'Map update is invalid or exceeds the supported GeoJSON size.' }, { status: 400 });
  }
  try {
    const result = await serializeWrite(async () => {
      const repeated = appliedChanges.get(changeId);
      if (repeated) return { saved: true, revision: repeated.revision, updatedAt: repeated.updatedAt };
      const { content } = await getList(token, true);
      const current = parseCollection(content);
      const revision = digest(current);
      if (revision !== body.baseRevision) return { conflict: true as const, data: current, revision };
      const markdown_content = replaceCollection(content, body.data as FeatureCollection);
      const response = await clickUpCalendarFetch(token, `https://api.clickup.com/api/v2/list/${GEOJSON_LIST_ID}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdown_content }),
      }, [`/list/${GEOJSON_LIST_ID}`]);
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(responseBody.err || responseBody.error || 'ClickUp could not save the project map.'), { status: response.status });
      const updatedAt = new Date().toISOString();
      const nextRevision = digest(body.data);
      appliedChanges.set(changeId, { revision: nextRevision, updatedAt });
      if (appliedChanges.size > 500) appliedChanges.delete(appliedChanges.keys().next().value || '');
      return { saved: true as const, revision: nextRevision, updatedAt };
    });
    if ('conflict' in result) return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}
