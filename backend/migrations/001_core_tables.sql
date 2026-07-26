-- TrustLens core tables — Phase 1
-- Companies, recruiters, job postings, fraud reports, scam websites.
-- Run this in the Supabase SQL editor (or via `supabase db execute`) for the
-- same project already used for auth. Safe to run once; uses IF NOT EXISTS.

create extension if not exists "uuid-ossp";

-- ── Companies ────────────────────────────────────────────────────────────────
create table if not exists companies (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    domain text unique,
    status text not null default 'unverified' check (status in ('verified', 'suspicious', 'unverified')),
    trust_score numeric(5, 2),
    whois_data jsonb,
    ssl_data jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_companies_domain on companies (domain);
create index if not exists idx_companies_status on companies (status);

-- ── Recruiters ───────────────────────────────────────────────────────────────
create table if not exists recruiters (
    id uuid primary key default uuid_generate_v4(),
    name text,
    email text not null unique,
    company_id uuid references companies (id) on delete set null,
    status text not null default 'unverified' check (status in ('verified', 'suspicious', 'unverified')),
    trust_rating numeric(5, 2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_recruiters_email on recruiters (email);
create index if not exists idx_recruiters_company_id on recruiters (company_id);

-- ── Job postings ─────────────────────────────────────────────────────────────
create table if not exists job_postings (
    id uuid primary key default uuid_generate_v4(),
    description text not null,
    company_id uuid references companies (id) on delete set null,
    risk_score numeric(5, 2) not null,
    risk_category text not null check (risk_category in ('low', 'medium', 'high')),
    explanation text,
    signal_breakdown jsonb,
    submitted_by uuid,
    created_at timestamptz not null default now()
);
create index if not exists idx_job_postings_created_at on job_postings (created_at desc);

-- ── Fraud reports ────────────────────────────────────────────────────────────
create table if not exists fraud_reports (
    id uuid primary key default uuid_generate_v4(),
    report_type text not null check (report_type in ('recruiter', 'company', 'website')),
    target_reference text not null, -- domain, email, or free-text identifier
    company_id uuid references companies (id) on delete set null,
    recruiter_id uuid references recruiters (id) on delete set null,
    description text not null,
    evidence_url text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reporter_id uuid,
    created_at timestamptz not null default now(),
    reviewed_at timestamptz
);
create index if not exists idx_fraud_reports_target on fraud_reports (target_reference);
create index if not exists idx_fraud_reports_status on fraud_reports (status);

-- ── Scam websites ────────────────────────────────────────────────────────────
create table if not exists scam_websites (
    id uuid primary key default uuid_generate_v4(),
    domain text not null unique,
    reason text,
    reported_at timestamptz not null default now()
);
create index if not exists idx_scam_websites_domain on scam_websites (domain);
