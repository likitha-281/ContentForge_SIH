-- ============================================================
-- INTELLI-FORGE Consolidated Database Schema & Storage Setup
-- SIH 2026 — Problem Statement 26154
-- Target Supabase Project: toqcdcapidfcgxfdqcvy
--
-- Instructions:
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/toqcdcapidfcgxfdqcvy/sql/new
-- ============================================================

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES TABLE & NEW USER TRIGGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  organisation text DEFAULT 'INTELLI-FORGE Enterprise',
  role text DEFAULT 'Operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by owner"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Profiles can be updated by owner"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Operator')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. SOURCES (DOCUMENTS) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  origin text,
  storage_path text,
  mime_type text,
  byte_size integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  raw_text text NOT NULL DEFAULT '',
  extraction_method text NOT NULL DEFAULT 'direct_text',
  summary text,
  is_demo boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_user_id_idx ON public.sources (user_id);
CREATE INDEX IF NOT EXISTS sources_created_at_idx ON public.sources (created_at DESC);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can select own sources"
    ON public.sources FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own sources"
    ON public.sources FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sources"
    ON public.sources FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own sources"
    ON public.sources FOR DELETE TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. JOBS TABLE (TRANSFORMATION & ETL PIPELINE)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  current_stage text NOT NULL DEFAULT 'upload',
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_source_id_idx ON public.jobs (source_id);
CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON public.jobs (user_id);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own jobs"
    ON public.jobs FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 4. SOURCE CHUNKS (CONTENT UNITS / RETRIEVAL INDEX)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  locator text NOT NULL,
  page_number integer,
  section text,
  content text NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_chunks_tsv_idx ON public.source_chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS source_chunks_source_idx ON public.source_chunks (source_id, ordinal);

ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_chunks TO authenticated;
GRANT ALL ON public.source_chunks TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own source chunks"
    ON public.source_chunks FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 5. FACTS TABLE (PROTECTED EXTRACTED FACTS FOR FACT LOCK)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  category text DEFAULT 'metric',
  is_locked boolean NOT NULL DEFAULT true,
  locator text,
  chunk_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facts_source_id_idx ON public.facts (source_id);

ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facts TO authenticated;
GRANT ALL ON public.facts TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own facts"
    ON public.facts FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 6. CLAIMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  text text NOT NULL,
  locator text,
  chunk_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own claims"
    ON public.claims FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 7. ENTITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'other',
  locator text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own entities"
    ON public.entities FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8. GENERATION REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
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

ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_requests TO authenticated;
GRANT ALL ON public.generation_requests TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own generation requests"
    ON public.generation_requests FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 9. OUTPUTS (TRANSFORMATION ARTEFACTS) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.generation_requests(id) ON DELETE SET NULL,
  output_type text NOT NULL,
  audience text NOT NULL,
  tone text,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'generated',
  verification_status text NOT NULL DEFAULT 'unverified',
  evidence_coverage numeric DEFAULT 0,
  model text DEFAULT 'google/gemini-3.7-flash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outputs_source_id_idx ON public.outputs (source_id);
CREATE INDEX IF NOT EXISTS outputs_user_id_idx ON public.outputs (user_id);

ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outputs TO authenticated;
GRANT ALL ON public.outputs TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own outputs"
    ON public.outputs FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 10. OUTPUT CLAIMS (EVIDENCE & PROVENANCE MAPPING)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.output_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  ordinal integer NOT NULL DEFAULT 0,
  sentence text NOT NULL,
  chunk_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  locator text,
  evidence_text text,
  grounded boolean NOT NULL DEFAULT false,
  match_score numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS output_claims_output_id_idx ON public.output_claims (output_id);

ALTER TABLE public.output_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.output_claims TO authenticated;
GRANT ALL ON public.output_claims TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own output claims"
    ON public.output_claims FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 11. TRUST CHECKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'passed',
  detail text,
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_checks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_checks TO authenticated;
GRANT ALL ON public.trust_checks TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own trust checks"
    ON public.trust_checks FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 12. FACT CONFLICTS TABLE (FLAGGED FACT LOCK CONFLICTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fact_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  fact_id uuid REFERENCES public.facts(id) ON DELETE SET NULL,
  fact_label text NOT NULL,
  locked_value text NOT NULL,
  generated_text text NOT NULL,
  generated_value text,
  status text NOT NULL DEFAULT 'open',
  suggestion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fact_conflicts_output_id_idx ON public.fact_conflicts (output_id);

ALTER TABLE public.fact_conflicts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_conflicts TO authenticated;
GRANT ALL ON public.fact_conflicts TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own fact conflicts"
    ON public.fact_conflicts FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 13. REVIEWS TABLE (HUMAN REVIEW & APPROVAL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'approved', 'rejected', 'edited'
  notes text,
  previous_content text,
  edited_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_output_id_idx ON public.reviews (output_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own reviews"
    ON public.reviews FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 14. DISTRIBUTIONS TABLE (MULTI-CHANNEL DISPATCH)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  output_id uuid NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  channel text NOT NULL, -- 'web', 'smtp', 'rest'
  target text,
  status text NOT NULL DEFAULT 'sent',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions TO authenticated;
GRANT ALL ON public.distributions TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can manage own distributions"
    ON public.distributions FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 15. AUDIT EVENTS TABLE (IMMUTABLE HASH-CHAINED LEDGER)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
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

CREATE INDEX IF NOT EXISTS audit_events_user_idx ON public.audit_events (user_id, created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

DO $$ BEGIN
  CREATE POLICY "Users can read own audit events"
    ON public.audit_events FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own audit events"
    ON public.audit_events FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Immutable audit trigger
CREATE OR REPLACE FUNCTION public.audit_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is strictly append-only and cannot be modified or deleted';
END; $$;

DROP TRIGGER IF EXISTS audit_events_no_update ON public.audit_events;
CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();

-- ============================================================
-- 16. DEMO SCENARIOS TABLE & EXACT DEMO SEED
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_scenarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.demo_scenarios TO authenticated;
GRANT SELECT ON public.demo_scenarios TO anon;
GRANT ALL ON public.demo_scenarios TO service_role;

DO $$ BEGIN
  CREATE POLICY "Demo scenarios are readable by all"
    ON public.demo_scenarios FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert exact SIH Demo Scenario
INSERT INTO public.demo_scenarios (slug, title, description, kind, body) VALUES (
  'sih-exact-incident',
  'Security Incident Advisory — Hyderabad (SIH Demo)',
  'Official incident report for SIH 2026 Problem Statement 26154 demonstration.',
  'incident report',
  'On 12 August 2026, a high-severity security incident was detected in Hyderabad. 17 systems were affected. The recommended action is to patch the affected systems to Version Y.'
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  body = EXCLUDED.body;

-- ============================================================
-- 17. SUPABASE STORAGE BUCKETS & RLS POLICIES
-- ============================================================
-- Create private storage buckets if storage schema is present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('source-documents', 'source-documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'audio/*', 'video/*']),
  ('generated-outputs', 'generated-outputs', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'application/json'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- Storage RLS: Users can only upload and read files in their own folder ({user_id}/*)
DO $$ BEGIN
  CREATE POLICY "Users can upload to own source folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'source-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own source documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'source-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload to own generated outputs folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'generated-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own generated outputs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'generated-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 18. REALTIME REPLICATION SETUP
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sources;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.facts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.outputs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.output_claims;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fact_conflicts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_checks;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.distributions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_events;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
