-- Ingestion pipeline logging
CREATE TABLE ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  source text NOT NULL,
  tool_name text NOT NULL,
  tool_slug text,
  status text NOT NULL, -- discovered, duplicate, enriched, inserted, failed
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ingestion_logs_run ON ingestion_logs(run_id);
CREATE INDEX idx_ingestion_logs_created ON ingestion_logs(created_at DESC);

ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (no public access)
CREATE POLICY "Service role full access on ingestion_logs"
  ON ingestion_logs FOR ALL
  USING (auth.role() = 'service_role');
