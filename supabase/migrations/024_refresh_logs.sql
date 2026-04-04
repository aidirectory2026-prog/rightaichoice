-- Tool data refresh logging
CREATE TABLE refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  tool_slug text NOT NULL,
  status text NOT NULL, -- refreshed, skipped, failed
  fields_updated text[],
  error_message text,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_refresh_logs_run ON refresh_logs(run_id);
CREATE INDEX idx_refresh_logs_created ON refresh_logs(created_at DESC);

ALTER TABLE refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on refresh_logs"
  ON refresh_logs FOR ALL
  USING (auth.role() = 'service_role');
