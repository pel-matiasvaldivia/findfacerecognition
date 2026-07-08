-- Access logs schema (self-hosted PostgreSQL).
-- The backend also creates this table automatically on startup (see
-- backend/src/services/db.service.js), so applying this file is optional.

CREATE TABLE IF NOT EXISTS access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  image_url text NOT NULL,
  detection_id text,
  matched_card_id text,
  confidence double precision,
  status text CHECK (status IN ('MATCH', 'NO_MATCH', 'ERROR')),
  metadata jsonb
);
