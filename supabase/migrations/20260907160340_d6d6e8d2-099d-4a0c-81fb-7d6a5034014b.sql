
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  organisation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  origin text,
  byte_size integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  raw_text text NOT NULL DEFAULT '',
  extraction_method text NOT NULL DEFAULT 'direct_text',
  summary text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.sources FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  current_stage text NOT NULL DEFAULT 'upload',
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs" ON public.jobs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  ordinal integer NOT NULL,
  locator text NOT NULL,
  content text NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX source_chunks_tsv_idx ON public.source_chunks USING gin (tsv);
CREATE INDEX source_chunks_source_idx ON public.source_chunks (source_id, ordinal);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_chunks TO authenticated;
GRANT ALL ON public.source_chunks TO service_role;
ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chunks" ON public.source_chunks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  locator text,
  chunk_id uuid REFERENCES public.source_chunks ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facts TO authenticated;
GRANT ALL ON public.facts TO service_role;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own facts" ON public.facts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  text text NOT NULL,
  locator text,
  chunk_id uuid REFERENCES public.source_chunks ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims" ON public.claims FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'other',
  locator text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entities" ON public.entities FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'Executive',
  tone text NOT NULL DEFAULT 'Formal',
  language text NOT NULL DEFAULT 'English',
  detail text NOT NULL DEFAULT 'Moderate',
  objective text NOT NULL DEFAULT 'Inform',
  output_types text[] NOT NULL DEFAULT ARRAY['Executive Brief'],
  instructions text,
  intent_prompt text,
  understood_intent jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_requests TO authenticated;
GRANT ALL ON public.generation_requests TO service_role;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests" ON public.generation_requests FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources ON DELETE CASCADE,
  request_id uuid REFERENCES public.generation_requests ON DELETE SET NULL,
  output_type text NOT NULL,
  audience text NOT NULL,
  tone text,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'generating',
  verification_status text NOT NULL DEFAULT 'unverified',
  evidence_coverage numeric,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outputs TO authenticated;
GRANT ALL ON public.outputs TO service_role;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own outputs" ON public.outputs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.output_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs ON DELETE CASCADE,
  ordinal integer NOT NULL DEFAULT 0,
  sentence text NOT NULL,
  chunk_id uuid REFERENCES public.source_chunks ON DELETE SET NULL,
  locator text,
  evidence_text text,
  grounded boolean NOT NULL DEFAULT false,
  match_score numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.output_claims TO authenticated;
GRANT ALL ON public.output_claims TO service_role;
ALTER TABLE public.output_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own output claims" ON public.output_claims FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.trust_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs ON DELETE CASCADE,
  check_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  detail text,
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_checks TO authenticated;
GRANT ALL ON public.trust_checks TO service_role;
ALTER TABLE public.trust_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trust checks" ON public.trust_checks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.fact_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs ON DELETE CASCADE,
  fact_id uuid REFERENCES public.facts ON DELETE SET NULL,
  fact_label text NOT NULL,
  locked_value text NOT NULL,
  generated_text text NOT NULL,
  generated_value text,
  status text NOT NULL DEFAULT 'open',
  suggestion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_conflicts TO authenticated;
GRANT ALL ON public.fact_conflicts TO service_role;
ALTER TABLE public.fact_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conflicts" ON public.fact_conflicts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs ON DELETE CASCADE,
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reviews" ON public.reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs ON DELETE CASCADE,
  channel text NOT NULL,
  target text,
  status text NOT NULL DEFAULT 'prepared',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions TO authenticated;
GRANT ALL ON public.distributions TO service_role;
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own distributions" ON public.distributions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  detail text,
  payload jsonb,
  prev_hash text,
  hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_user_idx ON public.audit_events (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT SELECT, INSERT ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own audit" ON public.audit_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "append own audit" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END; $$;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();

CREATE TABLE public.demo_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_scenarios TO authenticated;
GRANT SELECT ON public.demo_scenarios TO anon;
GRANT ALL ON public.demo_scenarios TO service_role;
ALTER TABLE public.demo_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo readable" ON public.demo_scenarios FOR SELECT USING (true);

INSERT INTO public.demo_scenarios (slug, title, description, kind, body) VALUES (
'ntro-incident-advisory',
'SAMPLE DATA — Network Intrusion Incident Report INC-2026-0447',
'A clearly labelled fictional incident report used to demonstrate the full INTELLI-FORGE workflow. No real organisation, system or person is described.',
'text',
'SAMPLE / FICTIONAL DOCUMENT — FOR DEMONSTRATION ONLY

Section 1. Incident Summary
Incident reference: INC-2026-0447. On 14 February 2026, monitoring detected anomalous outbound traffic from the internal reporting network of a regional administrative data centre. The incident was classified as Severity: High. A total of 17 systems were affected across two subnets. No classified material is known to have been exfiltrated at the time of writing.

Section 2. Timeline
At 02:14 IST on 14 February 2026 an automated alert was raised by the network monitoring platform. Containment began at 03:40 IST. The affected subnets were isolated by 05:05 IST on the same day. Forensic imaging of the 17 affected systems completed on 16 February 2026.

Section 3. Technical Findings
Initial access is assessed with moderate confidence to have occurred through a phishing email carrying a malicious document attachment. The attachment executed a loader that established an encrypted outbound channel to an external host. Two credential sets belonging to service accounts were reused across the affected subnets, which allowed lateral movement. Endpoint logging was incomplete on 4 of the 17 systems, which limits the forensic picture.

Section 4. Impact Assessment
Three internal reporting services were unavailable for approximately 9 hours. No citizen-facing service was interrupted. There is no current evidence of data exfiltration, though the assessment remains provisional pending completion of log analysis.

Section 5. Recommended Actions
Recommended action: rotate all service account credentials within 48 hours, enforce phishing-resistant multi-factor authentication for administrative accounts, and restore full endpoint logging coverage across the reporting network. A follow-up review is scheduled for 28 February 2026.

Section 6. Public Communication Guidance
Public communication should confirm that services have been restored, avoid technical attribution, and state that a review is under way. Do not publish subnet details or system counts by department.'
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.output_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fact_conflicts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facts;
