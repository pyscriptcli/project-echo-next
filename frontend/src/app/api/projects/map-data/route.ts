import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const GEOJSON_FILE_ID = 'mi-trs-901414174663';
const GEOJSON_BUCKET = 'echo-project-geojson';
const GEOJSON_OBJECT = `projects/${GEOJSON_FILE_ID}.geojson`;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const MAX_GEOJSON_BYTES = 450_000;
type GeoFeature = { type: 'Feature'; id?: string | number; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> };
type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[]; [key: string]: unknown };

const writeQueues = new Map<string, Promise<void>>();
const appliedChanges = new Map<string, { revision: string; updatedAt: string }>();
let storageClient: SupabaseClient | null = null;

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function getStorageClient() {
  if (storageClient) return storageClient;
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw Object.assign(new Error('Supabase Storage is not configured on the server.'), { status: 503 });
  storageClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  return storageClient;
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

async function getStoredCollection(): Promise<FeatureCollection | null> {
  const { data, error } = await getStorageClient().storage.from(GEOJSON_BUCKET).download(GEOJSON_OBJECT);
  if (error) {
    if (error.statusCode === '404' || /object not found/i.test(error.message)) return null;
    throw Object.assign(new Error(`Supabase Storage could not read the project GeoJSON: ${error.message}`), { status: Number(error.statusCode) || 502 });
  }
  try {
    const value: unknown = JSON.parse(await data.text());
    if (!validCollection(value)) throw new Error('Stored GeoJSON did not pass validation.');
    return value;
  } catch {
    throw Object.assign(new Error('The GeoJSON file in Supabase Storage is invalid; it was not overwritten.'), { status: 422 });
  }
}

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : 502;
  const message = error instanceof Error ? error.message : 'Project map data could not be saved.';
  return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 502 });
}

async function serializeWrite<T>(work: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(GEOJSON_FILE_ID) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  writeQueues.set(GEOJSON_FILE_ID, tail);
  await previous;
  try { return await work(); }
  finally { release(); if (writeQueues.get(GEOJSON_FILE_ID) === tail) writeQueues.delete(GEOJSON_FILE_ID); }
}

export async function GET(request: NextRequest) {
  if (!getTokenFromRequest(request)) return NextResponse.json({ error: 'Sign in to open the project map.' }, { status: 401 });
  try {
    const stored = await getStoredCollection();
    const data = stored || EMPTY;
    if (request.nextUrl.searchParams.get('download') === '1') {
      return new NextResponse(JSON.stringify(data, null, 2), { headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${GEOJSON_FILE_ID}.geojson"`,
      } });
    }
    return NextResponse.json({ data, revision: digest(data), source: 'supabase', object: GEOJSON_OBJECT }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: NextRequest) {
  if (!getTokenFromRequest(request)) return NextResponse.json({ error: 'Sign in to save map edits.' }, { status: 401 });
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
      const stored = await getStoredCollection();
      const current = stored || EMPTY;
      const revision = digest(current);
      if (revision !== body.baseRevision) return { conflict: true as const, data: current, revision };
      const collection = body.data as FeatureCollection;
      const { error } = await getStorageClient().storage.from(GEOJSON_BUCKET).upload(GEOJSON_OBJECT, Buffer.from(JSON.stringify(collection)), {
        contentType: 'application/geo+json', cacheControl: '0', upsert: true,
      });
      if (error) throw Object.assign(new Error(`Supabase could not save the GeoJSON file: ${error.message}`), { status: Number(error.statusCode) || 502 });
      const updatedAt = new Date().toISOString();
      const nextRevision = digest(collection);
      appliedChanges.set(changeId, { revision: nextRevision, updatedAt });
      if (appliedChanges.size > 500) appliedChanges.delete(appliedChanges.keys().next().value || '');
      return { saved: true as const, revision: nextRevision, updatedAt };
    });
    if ('conflict' in result) return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}
