-- Private storage for the Project Echo map's GeoJSON document.
-- The Echo API uses SUPABASE_SERVICE_ROLE_KEY on the server; do not expose it to the browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'echo-project-geojson',
  'echo-project-geojson',
  false,
  10485760,
  array['application/geo+json', 'application/json']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
