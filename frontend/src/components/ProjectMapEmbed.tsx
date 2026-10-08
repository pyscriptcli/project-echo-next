'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Expand, LoaderCircle, Maximize2, RefreshCw, X } from 'lucide-react';

type GeoJsonCollection = { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; id?: string | number; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }>; [key: string]: unknown };
type AtlasChange = { type: 'atlas:change'; protocolVersion: 1; sessionId: string; baseRevision: string | number; changeId: string; data: GeoJsonCollection };

const MAX_GEOJSON_BYTES = 450_000;
function validCoordinates(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) || !value.length) return false;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') return Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
  return value.every((part) => validCoordinates(part, depth + 1));
}
function isFeatureCollection(value: unknown): value is GeoJsonCollection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const collection = value as Record<string, unknown>;
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length > 10_000) return false;
  try { if (new TextEncoder().encode(JSON.stringify(collection)).length > MAX_GEOJSON_BYTES) return false; } catch { return false; }
  const ids = new Set<string>();
  return collection.features.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const feature = item as Record<string, unknown>;
    const geometry = feature.geometry as Record<string, unknown> | null;
    if (feature.id !== undefined) {
      if ((typeof feature.id !== 'string' && typeof feature.id !== 'number') || (typeof feature.id === 'string' && (!feature.id || feature.id.length > 256)) || (typeof feature.id === 'number' && !Number.isSafeInteger(feature.id))) return false;
      const id = String(feature.id);
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return feature.type === 'Feature' && Boolean(geometry) && ['Point', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(String(geometry?.type))
      && validCoordinates(geometry?.coordinates) && (feature.properties == null || (typeof feature.properties === 'object' && !Array.isArray(feature.properties)));
  });
}

export default function ProjectMapEmbed({ projectName }: { projectName: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionIdRef = useRef('');
  const revisionRef = useRef<string | number>('');
  const dataRef = useRef<GeoJsonCollection>({ type: 'FeatureCollection', features: [] });
  const initializedRef = useRef(false);
  const queuedChangeRef = useRef<AtlasChange | null>(null);
  const failedChangeRef = useRef<AtlasChange | null>(null);
  const savingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading GeoJSON from ClickUp…');
  const [ready, setReady] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const atlasUrl = process.env.NEXT_PUBLIC_ATLAS_EMBED_URL || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3200/embed/gis'
    : 'https://project-atlas-next.vercel.app/embed/gis');
  const atlasOrigin = useMemo(() => {
    try { return new URL(atlasUrl).origin; } catch { return ''; }
  }, [atlasUrl]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(''); setReady(false); initializedRef.current = false;
    try {
      const response = await fetch('/api/projects/map-data', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Map data could not be loaded from ClickUp.');
      if (!isFeatureCollection(payload.data)) throw new Error('The GeoJSON in the designated ClickUp list is invalid or too large.');
      dataRef.current = payload.data;
      revisionRef.current = String(payload.revision || '');
      sessionIdRef.current = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setStatus('Waiting for map editor…');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Map data could not be loaded from ClickUp.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, atlasOrigin);
  }, [atlasOrigin]);

  const refreshData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/projects/map-data', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Map data could not be refreshed from ClickUp.');
      if (!isFeatureCollection(payload.data)) throw new Error('The GeoJSON in the designated ClickUp list is invalid or too large.');
      dataRef.current = payload.data;
      revisionRef.current = String(payload.revision || '');
      if (initializedRef.current && sessionIdRef.current) post({ type: 'atlas:replace-data', protocolVersion: 1, sessionId: sessionIdRef.current, revision: revisionRef.current, data: payload.data });
      setStatus('Project GeoJSON refreshed from ClickUp.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Map data could not be refreshed from ClickUp.');
    } finally { setLoading(false); }
  }, [post]);

  const sendInit = useCallback(() => {
    if (!sessionIdRef.current || initializedRef.current) return;
    initializedRef.current = true;
    post({ type: 'atlas:init', protocolVersion: 1, sessionId: sessionIdRef.current, mode: 'edit', revision: revisionRef.current, data: dataRef.current, projectName, basemap: 'Midnight Blue' });
  }, [post, projectName]);

  const persistQueuedChange = useCallback(async () => {
    if (savingRef.current) return;
    const change = queuedChangeRef.current;
    if (!change) return;
    savingRef.current = true;
    queuedChangeRef.current = null;
    failedChangeRef.current = null;
    setStatus('Saving map to ClickUp…');
    try {
      if (!isFeatureCollection(change.data)) throw new Error('The editor returned invalid GeoJSON; changes were not saved.');
      const response = await fetch('/api/projects/map-data', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: change.data, baseRevision: revisionRef.current, changeId: change.changeId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409 && isFeatureCollection(payload.data)) {
        dataRef.current = payload.data;
        revisionRef.current = String(payload.revision);
        post({ type: 'atlas:replace-data', protocolVersion: 1, sessionId: sessionIdRef.current, revision: revisionRef.current, data: payload.data });
        setStatus('ClickUp changed elsewhere; latest saved GeoJSON was reloaded.');
      } else if (!response.ok) throw new Error(payload.error || 'Map edits could not be saved to ClickUp.');
      else {
        dataRef.current = change.data;
        revisionRef.current = String(payload.revision);
        failedChangeRef.current = null;
        post({ type: 'atlas:saved', protocolVersion: 1, sessionId: sessionIdRef.current, revision: revisionRef.current, changeId: change.changeId });
        setStatus('Map changes saved to ClickUp.');
      }
    } catch (caught) {
      failedChangeRef.current = change;
      setStatus(caught instanceof Error ? caught.message : 'Map edits could not be saved.');
    } finally {
      savingRef.current = false;
      if (queuedChangeRef.current) void persistQueuedChange();
    }
  }, [post]);

  useEffect(() => {
    if (!atlasOrigin) { setError('Set NEXT_PUBLIC_ATLAS_EMBED_URL to the Project Atlas host.'); return; }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== atlasOrigin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data as Record<string, unknown>;
      if (!message || message.protocolVersion !== 1 || typeof message.type !== 'string') return;
      if (message.type === 'atlas:ready') { sendInit(); return; }
      if (message.sessionId !== sessionIdRef.current) return;
      if (message.type === 'atlas:loaded') { setReady(true); setStatus('Map loaded · editing enabled'); return; }
      if (message.type === 'atlas:error') { setStatus(typeof message.message === 'string' ? message.message : 'The map editor reported an error.'); return; }
      if (message.type !== 'atlas:change' || typeof message.changeId !== 'string' || (typeof message.baseRevision !== 'string' && typeof message.baseRevision !== 'number') || !isFeatureCollection(message.data)) return;
      const change = message as unknown as AtlasChange;
      queuedChangeRef.current = change;
      void persistQueuedChange();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [atlasOrigin, loadData, persistQueuedChange, refreshData, sendInit]);

  useEffect(() => {
    if (fullScreen) {
      const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setFullScreen(false); };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [fullScreen]);

  const src = `${atlasUrl}${atlasUrl.includes('?') ? '&' : '?'}parentOrigin=${encodeURIComponent(typeof window === 'undefined' ? '' : window.location.origin)}`;
  const retrySave = () => {
    if (failedChangeRef.current) {
      queuedChangeRef.current = failedChangeRef.current;
      void persistQueuedChange();
    }
  };
  return <section className={fullScreen ? 'fixed inset-0 z-[100] bg-white p-2' : 'space-y-2'} aria-label="Project map editor">
    <header className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2">
      <div><h2 className="text-sm font-semibold text-[#003366]">Project map</h2><p role="status" className="text-[10px] text-slate-500">{status}</p></div>
      <div className="flex items-center gap-1.5">
        <a href="https://app.clickup.com/9014981136/v/l/li/901412841984" target="_blank" rel="noreferrer" className="hidden text-[10px] font-semibold text-[#003366] underline sm:inline">GeoJSON storage · ClickUp list</a>
        {failedChangeRef.current && <button type="button" onClick={retrySave} disabled={savingRef.current} className="inline-flex h-8 items-center gap-1.5 border border-amber-400 px-2.5 text-[10px] font-semibold text-amber-800 disabled:opacity-50">Retry save</button>}
        <button type="button" onClick={() => void refreshData()} disabled={loading} aria-label="Refresh map data" className="inline-flex h-8 items-center gap-1.5 border border-slate-300 px-2.5 text-[10px] font-semibold text-[#003366] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        <button type="button" onClick={() => setFullScreen((value) => !value)} className="inline-flex h-8 items-center gap-1.5 border border-[#003366] bg-[#003366] px-2.5 text-[10px] font-semibold text-white">{fullScreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{fullScreen ? 'Close' : 'Full screen'}</button>
      </div>
    </header>
    {error ? <div role="alert" className="border border-amber-300 bg-white p-4 text-xs text-slate-700"><p>{error}</p><button type="button" onClick={() => void (initializedRef.current ? refreshData() : loadData())} className="mt-2 border border-[#003366] px-3 py-2 font-semibold text-[#003366]">Try again</button></div>
      : <div className={fullScreen ? 'relative h-[calc(100vh-3.5rem)] overflow-hidden border border-slate-200 bg-[#0a0d12]' : 'relative h-[min(75vh,860px)] min-h-[560px] overflow-hidden border border-slate-200 bg-[#0a0d12]'}>
        <iframe ref={iframeRef} title="Project Atlas embedded GIS editor" src={src} allow="fullscreen" allowFullScreen className="h-full w-full border-0" />
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-xs text-slate-600"><LoaderCircle className="mr-2 h-4 w-4 animate-spin text-[#003366]" />Loading project GeoJSON</div>}
        {!loading && !ready && <div className="pointer-events-none absolute bottom-3 left-3 rounded border border-white/20 bg-[#111820]/90 px-3 py-2 text-[10px] text-white"><Expand className="mr-1 inline h-3 w-3" />Connecting to Project Atlas</div>}
      </div>}
  </section>;
}
