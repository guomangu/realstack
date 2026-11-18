CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS external_api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  etag text,
  status text NOT NULL DEFAULT 'success',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS external_api_cache_key_idx
  ON external_api_cache (cache_key);

CREATE INDEX IF NOT EXISTS external_api_cache_source_idx
  ON external_api_cache (source);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  geom geometry(Point, 4326),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS locations_source_external_id_idx
  ON locations (source, external_id);

CREATE INDEX IF NOT EXISTS locations_geom_idx
  ON locations USING gist (geom);
