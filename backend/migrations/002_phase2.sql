-- TrustLens Phase 2 migration — profiles/roles, scan_history, widened fraud_reports
-- taxonomy, predatory company status, embeddings, and the entity_links trust graph.
-- Run once in the Supabase SQL editor. Safe to re-run — uses IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS throughout.

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists vector;          -- pgvector for Milestone P2-4

-- ── User profiles: lightweight roles (user vs admin) ────────
-- Minimal role support so admin review + admin dashboard can ship in Phase 2.
-- Full RBAC/RLS is still a hardening task; this is just a role column.
create table if not exists profiles (
    id uuid primary key,                  -- = auth user id (from /auth/me)
    email text unique,
    full_name text,
    role text not null default 'user' check (role in ('user','admin')),
    created_at timestamptz not null default now()
);
-- Promote an admin manually for now:
--   insert into profiles (id, email, role) values ('<auth-user-uuid>', 'you@x.com', 'admin')
--   on conflict (id) do update set role = 'admin';

-- ── Scan history: every analysis from every module ──────────
create table if not exists scan_history (
    id uuid primary key default uuid_generate_v4(),
    scan_type text not null check (scan_type in
        ('job_text','job_url','job_image','email','communication',
         'company','website','recruiter','similarity')),
    input_summary text not null,          -- first ~500 chars of input, or domain/email
    input_ref text,                       -- domain / email / URL if applicable
    risk_score numeric(5,2),
    risk_category text,                   -- low/medium/high or verified/suspicious/...
    signal_breakdown jsonb,
    result_payload jsonb,                 -- full response we returned
    user_id uuid,                         -- nullable; fill when auth token present
    feedback_accurate boolean,            -- user says verdict was right/wrong
    feedback_comment text,
    created_at timestamptz not null default now()
);
create index if not exists idx_scan_history_type_time on scan_history (scan_type, created_at desc);
create index if not exists idx_scan_history_user on scan_history (user_id);

-- ── Fraud reports: widen taxonomy (Milestone P2-2) ──────────
alter table fraud_reports drop constraint if exists fraud_reports_report_type_check;
alter table fraud_reports add constraint fraud_reports_report_type_check
    check (report_type in ('recruiter','company','website',
                           'job_posting','phishing_message','predatory_internship'));
alter table fraud_reports add column if not exists title text;
alter table fraud_reports add column if not exists evidence_paths jsonb default '[]'::jsonb;
alter table fraud_reports add column if not exists reviewed_by uuid;
alter table fraud_reports add column if not exists resolution_note text;
alter table fraud_reports add column if not exists embedding vector(768);

-- ── Companies: predatory status + score history ─────────────
alter table companies drop constraint if exists companies_status_check;
alter table companies add constraint companies_status_check
    check (status in ('verified','suspicious','unverified','predatory'));
alter table companies add column if not exists predatory_notes text;

-- ── Embeddings on existing content tables ───────────────────
alter table job_postings add column if not exists embedding vector(768);

-- ── Trust graph: minimal edge table ─────────────────────────
create table if not exists entity_links (
    id uuid primary key default uuid_generate_v4(),
    source_type text not null check (source_type in ('company','recruiter','domain','report','job_posting','scan')),
    source_id text not null,              -- uuid or domain/email string
    target_type text not null check (target_type in ('company','recruiter','domain','report','job_posting','scan')),
    target_id text not null,
    relationship text not null,           -- e.g. 'claims_company','mentions_domain','reported_against','same_email_domain'
    created_from text,                    -- which module created it
    created_at timestamptz not null default now(),
    unique (source_type, source_id, target_type, target_id, relationship)
);
create index if not exists idx_links_source on entity_links (source_type, source_id);
create index if not exists idx_links_target on entity_links (target_type, target_id);

-- ── pgvector similarity search function (Milestone P2-4) ────
create or replace function match_fraud_content(
    query_embedding vector(768), match_count int default 5, min_similarity float default 0.5)
returns table (source_table text, id uuid, content text, category text, similarity float)
language sql stable as $$
    select * from (
        select 'fraud_reports'::text, fr.id, fr.description, fr.report_type,
               1 - (fr.embedding <=> query_embedding) as sim
        from fraud_reports fr where fr.embedding is not null and fr.status = 'approved'
        union all
        select 'job_postings'::text, jp.id, jp.description, jp.risk_category,
               1 - (jp.embedding <=> query_embedding)
        from job_postings jp where jp.embedding is not null
    ) t where t.sim >= min_similarity
    order by t.sim desc limit match_count;
$$;
