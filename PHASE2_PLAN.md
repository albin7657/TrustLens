# TrustLens — Phase 2 Plan (Detailed Implementation Spec)

> Audience: any developer or coding agent implementing Phase 2. Every milestone lists the
> exact files to create/modify, endpoint contracts, SQL, and acceptance checks.
> Enterprise hardening (auth on endpoints, rate limiting, RLS, CI, Docker) is **explicitly
> out of scope** for this phase — it is a separate later pass. Do not block any milestone on it.

---

## 0. Current state (post-Phase 1)

**Backend** (`TrustLens/backend`, FastAPI + Supabase + Gemini):

| File | What it does today |
|---|---|
| `app/auth.py` | Email/password + Google OAuth, refresh, `/auth/me` |
| `app/jobs.py` | `POST /jobs/analyze` — rule checks + internal DB + Gemini signals → composite score, persists to `job_postings` |
| `app/companies.py` | `POST /companies/verify` — WHOIS/SSL/domain trust, upserts `companies` |
| `app/recruiters.py` | `POST /recruiters/verify` — email domain vs `companies`, prior reports |
| `app/repository.py` | `GET /repository/search` — **read-only** search across tables |
| `app/scanner.py` | `POST /scanner/ocr`, `/scanner/analyze-job`, `/scanner/analyze-email`, `/scanner/analyze-similarity` — DistilBERT models + easyocr + Gemini. **Stateless: writes nothing to Supabase. `analyze-similarity` just asks Gemini to recall "known scams" from training memory (hallucination-prone).** |
| `app/services/gemini_client.py` | Gemini wrapper, structured signals |
| `app/services/scoring.py` | `Signal` dataclass + weighted `combine()` with overrides |
| `app/services/internal_db.py` | Ground-truth lookup: `scam_websites` → `companies` → `recruiters`; override signals |
| `app/services/rule_checks.py` | Red-flag phrase rules |
| `app/services/domain_trust.py` | WHOIS, SSL, typosquat checks |
| `migrations/001_core_tables.sql` | `companies`, `recruiters`, `job_postings`, `fraud_reports`, `scam_websites` |

**Frontend** (`TrustLens/frontend`, Next.js 16 / React 19 / Tailwind 4, light SaaS theme):
`job-scanner`, `company-verification`, `website-scanner`, `recruiter-verification`,
`trust-repository` are wired to real endpoints. `communication-analyzer`,
`community-reports`, `institutional-dashboard`, `scam-similarity`, `reporting-assistant`,
`rag-assistant`, `overview` still render **mock data**. `src/lib/api.ts` holds typed fetch
helpers; `recharts` is already a dependency.

**The gaps this phase closes:**

1. **No write path into the trust repository** — `repository.py` only searches. Users cannot submit fraud reports, so `internal_db.py` reads static seed data forever instead of a growing intelligence base.
2. **Scan results are thrown away** — every `/scanner/analyze-*` call is stateless. No data accumulates to power dashboards or ever re-train the frozen `.safetensors` DistilBERT models.
3. **Similarity is fake** — `analyze-similarity` asks Gemini to hallucinate matches. It must search **our own stored data** via embeddings + pgvector.
4. **Trust Graph doesn't exist** — it's the stated USP. A minimal `entity_links` table + "this recruiter is linked to 3 flagged companies" delivers it without a graph DB.
5. **No real dashboard** — `institutional-dashboard` and `overview` are hardcoded numbers.
6. **Certificate-mill blind spot** — companies like paid-internship mills pass WHOIS/SSL checks ("looks fine on paper"). Needs a `predatory` category, targeted signals, and a curated watchlist.

**Core design principle for everything below — the internal database is a flywheel:**
*every* analysis writes back, *every* approved report enriches `internal_db.py`'s lookup
tables, and every later scan benefits. No endpoint may be stateless after this phase.

---

## 1. Milestone P2-1 — Database migration `002_phase2.sql`

Create `backend/migrations/002_phase2.sql`. Run once in the Supabase SQL editor.
All later milestones depend on this; do it first.

```sql
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
```

Also create a **Supabase Storage bucket** named `evidence` (public read off; use signed URLs).
Do this in the Supabase dashboard → Storage → New bucket, or via the admin client at startup.

**Accept when:** migration runs without error; `select * from scan_history limit 1` and
`select match_fraud_content(array_fill(0,'{768}')::vector, 1);` both execute.

---

## 2. Milestone P2-2 — Community Reporting write path (Module 8)

This is the flywheel's intake valve. **New files:** `app/reports.py`, `app/schemas_reports.py`.
Register the router in `app/main.py`.

### Endpoints

`POST /reports` — submit a report.
```json
// request
{ "report_type": "predatory_internship",      // one of the 6 types
  "title": "Unified Mentors charges for internship certificate",
  "target_reference": "unifiedmentors.example",   // domain, email, or name
  "description": "They asked ₹3500 for a 'training fee'...",
  "reporter_id": null }                            // optional; from /auth/me if logged in
// response 201
{ "id": "<uuid>", "status": "pending", "created_at": "..." }
```
On insert also: generate the embedding for `description` (Milestone P2-4 helper; skip
silently if embeddings not yet built) and create an `entity_links` row
(`report → domain/company/recruiter` with relationship `reported_against`).

`POST /reports/{id}/evidence` — multipart file upload (images/PDF, max 10 MB, check
content-type). Store to Supabase Storage bucket `evidence` at path `{report_id}/{filename}`
via the admin client; append the path to `fraud_reports.evidence_paths`.

`GET /reports?status=pending&report_type=&limit=50&offset=0` — list (admin review queue and
public browse of approved ones). Response: array of report objects + `total`.

`GET /reports/mine?reporter_id=` — user's own submissions with status.

`POST /reports/{id}/review` — **admin-only** (see role check below); the **approval
side-effect** is the whole point:
```json
// request
{ "action": "approve",          // or "reject"
  "resolution_note": "Verified against 4 similar reports" }
```
On **approve**, inside one function `apply_report_side_effects(report)`:
- `website` / `phishing_message` type → upsert domain into `scam_websites` (reason = report title). `internal_db.check_domain` now returns an override signal for it automatically — zero extra wiring.
- `company` type → set `companies.status = 'suspicious'` (upsert by domain/name).
- `predatory_internship` type → set `companies.status = 'predatory'`, `predatory_notes` = report title (upsert). See Milestone P2-6 for how `internal_db` treats this.
- `recruiter` / `job_posting` type → set `recruiters.status = 'suspicious'` (upsert by email) / nothing extra (job report already embedded for similarity).
- All types → `entity_links` rows linking the report to every entity it touched.

### `internal_db.py` change

Add `predatory` handling to `_status_to_signal` and the company lookup:

```python
if status == "predatory":
    return Signal(name=name, score=80.0, weight=KNOWN_RECORD_WEIGHT, is_override=True,
        explanation=("Flagged as a pay-for-certificate / predatory internship provider. "
                     "The company is registered and may look legitimate, but community "
                     "reports indicate participants pay fees for certificates of little value."))
```

Also add `check_recruiter_reports(email)` if not present: count approved `fraud_reports`
against the email → signal scaled by count.

### Lightweight role check (backend)

Extend `app/auth.py`: on signup/first login, upsert a `profiles` row (role `user`).
`/auth/me` response gains a `role` field (read from `profiles`, default `user`).
New helper in `app/auth.py`:

```python
def get_role(authorization: str | None) -> str:
    # resolve the Supabase user from the bearer token, look up profiles.role,
    # return 'user' on any failure. Used by /reports/{id}/review and /stats/admin.
```

`POST /reports/{id}/review` returns 403 unless role is `admin`. That's the entire
role system for Phase 2 — one column, one helper, two protected endpoints.

### Frontend — `community-reports/page.tsx`

Replace mocks with: submission form (type dropdown incl. "Predatory internship / certificate
mill", title, target, description, file input), and a "My reports" list with status chips.
The **review queue lives in the admin dashboard** (Milestone P2-8), not here. Add all fetch
helpers to `src/lib/api.ts` following the existing `postJSON` pattern.

**Accept when:** submit report → appears pending → approve it → re-run a company/job scan
that mentions the reported domain → the scan now shows the internal-DB override signal.
That end-to-end loop is the milestone's definition of done.

---

## 3. Milestone P2-3 — Persist every scan (`scan_history`)

**New file:** `app/services/scan_log.py`:

```python
def log_scan(scan_type, input_summary, result, *, input_ref=None, user_id=None) -> str | None:
    """Best-effort insert into scan_history. Never raises. Returns row id or None."""
```

Call it (and include the returned `scan_id` in the API response) from:
- `app/jobs.py` → `job_text` (and `job_url` after P2-6)
- `app/companies.py` → `company` / `website`
- `app/recruiters.py` → `recruiter`
- `app/scanner.py` → `job_image` (analyze-job), `email` (analyze-email), `similarity`
- `app/communications.py` (new, P2-5) → `communication`

**New endpoints** (add to a new `app/history.py` router):
- `GET /history?scan_type=&user_id=&limit=20&offset=0` → newest-first list.
- `POST /history/{scan_id}/feedback` — body `{ "accurate": true, "comment": "..." }` → updates the row. This feedback column is the future training set for re-training the DistilBERT models; that re-training itself is **Phase 3**, but the data collection starts now.

**Frontend:** new page `src/app/my-scans/page.tsx` (add to `Sidebar.tsx`): table of past
scans (type icon, input summary, score badge, date), click → expand stored result. On every
module's result card add a small "Was this accurate? 👍 / 👎" strip that calls the feedback
endpoint using the `scan_id` now returned by every analyze endpoint.

**Accept when:** run one scan of each type → `GET /history` returns them all; feedback
persists; nothing breaks if Supabase insert fails (best-effort).

---

## 4. Milestone P2-4 — Real scam similarity (Module 7, pgvector)

**New file:** `app/services/embeddings.py`:

```python
# google-generativeai: genai.embed_content(model="models/text-embedding-004", content=text)
def embed_text(text: str) -> list[float] | None   # 768-dim, None on failure, truncate input to ~8k chars
```

**Write path:** generate embeddings on insert in `jobs.py` (job_postings) and `reports.py`
(fraud_reports). Backfill script `backend/scripts/backfill_embeddings.py` for existing rows.

**Read path:** `POST /similarity/check` in **new** `app/similarity.py`:
```json
// request
{ "text": "Congratulations! You are selected... pay ₹2000 registration" }
// response
{ "matches": [ { "source_table": "fraud_reports", "id": "...", "similarity": 0.87,
                 "category": "predatory_internship",
                 "excerpt": "first 300 chars of matched content" } ],
  "analysis": "This message closely matches 3 previously reported registration-fee scams...",
  "scan_id": "..." }
```
Implementation: `embed_text(query)` → call the `match_fraud_content` SQL function via
`client.rpc("match_fraud_content", {...})` → pass the top matches to Gemini **only to write
the human explanation of why they're similar** (Gemini explains real matches; it no longer
invents them). Log to `scan_history`.

**Replace** the body of `scanner.py analyze-similarity` with a call to this same service
(keep the route for backward compatibility), and wire `scam-similarity/page.tsx` to
`/similarity/check` with a match list UI (similarity % bars, category chips, excerpts).

**Accept when:** submit text resembling an approved report → that report comes back with
similarity ≥ 0.7; submitting gibberish returns empty matches, not hallucinated ones.

---

## 5. Milestone P2-5 — Communication Analyzer (Module 5)

**New files:** `app/communications.py`, `app/schemas_communications.py`.

`POST /communications/analyze`:
```json
// request — single message OR a thread
{ "channel": "whatsapp",              // email | sms | whatsapp | telegram | other
  "messages": [ { "sender": "them", "text": "You are selected! Pay joining fee..." },
                { "sender": "me",   "text": "Which company is this?" } ] }
// response
{ "risk_score": 88, "risk_category": "high",
  "scam_stage": "payment_request",    // contact | trust_building | urgency | payment_request | credential_theft
  "lure_type": "registration_fee",    // registration_fee | equipment_fee | training_deposit |
                                      // crypto | gift_card | phishing_link | credential_theft | none
  "explanation": "...",
  "signal_breakdown": [ ... ],        // same Signal shape as every other module
  "extracted_links": [ { "url": "...", "domain": "...", "internal_db_hit": "scam_website" } ],
  "scan_id": "..." }
```

Pipeline (reuse everything): concatenate thread → `rule_checks` red-flag phrases → **extract
URLs/domains/emails** with the regexes already in `internal_db.py` and run `check_domain` on
each (a scam-list hit is an override signal) → new `gemini_client.analyze_communication(thread, channel)`
prompt that returns the stage/lure classification + sub-signals → `scoring.combine` →
`log_scan("communication", ...)` → embed the text for similarity corpus.

**Screenshot input:** the frontend calls existing `POST /scanner/ocr` first, then feeds the
extracted text into this endpoint — no new backend needed.

**Frontend `communication-analyzer/page.tsx`:** channel selector, message thread builder
("add message" rows with them/me toggle), "or upload screenshot" (→ OCR → prefill), result
card with stage timeline (contact → trust → urgency → payment) highlighting the detected
stage, lure-type chip, link-check table, `SignalBreakdown` component reuse.

**Accept when:** a pasted fee-demand WhatsApp thread scores high with correct lure type; a
benign scheduling email scores low; links found in messages get internal-DB checks.

---

## 6. Milestone P2-6 — Detection upgrades (Modules 1–4) incl. predatory-internship signals

All changes to existing files; no new tables.

### 6a. Job Scanner (M1) — internship / certificate-mill signals
- `rule_checks.py`: add `check_internship_fee_phrases(text)` — phrase list: "registration fee", "training fee", "certificate fee", "security deposit", "pay for internship", "stipend based on performance", "certificate + LOR", "guaranteed certificate", "limited seats", "MSME registered" (as credibility claim), "no interview required". Score scales with hit count; weight 25.
- `gemini_client.analyze_job_posting` prompt: add instructions to (1) detect the **pay-for-certificate pattern** — unpaid role + any fee + certificate/LOR as the main deliverable + trivial work (watching videos, forms) → emit sub-signal `predatory_internship_pattern`; (2) emit a `salary_plausibility` sub-signal — is the pay wildly high for the role/experience asked (classic lure) or is the "stipend" actually a fee in disguise; (3) classify `posting_type`: `job` | `internship`.
- If composite is predatory-dominated, set `risk_category` normally but add a distinct `verdict_label: "predatory_internship"` in the response so the UI can show the specific "pay-for-certificate scheme" warning instead of the generic scam banner.

### 6b. Job Scanner — auto cross-check (biggest single upgrade)
In `jobs.py` after extracting a domain/email from the text (regexes exist in `internal_db.py`):
run `domain_trust` checks on the domain and the recruiter-email checks from 6d, and append
their outputs as additional signals into the same `combine()` call. One paste → one combined
verdict across M1+M2+M3. Also write `entity_links` rows (`job_posting → domain`, `job_posting → recruiter email`).

### 6c. Job Scanner — analyze by URL

`POST /jobs/analyze-url` — body `{ "url": "..." }`.

**Fetch strategy — generic extraction, graceful degradation, no selector scraping:**
we never parse site-specific selectors (they churn constantly); we extract the page's main
visible text with `trafilatura` (`pip install trafilatura httpx`) and feed it to the exact
same pipeline as pasted text (`scan_type="job_url"`, URL as `input_ref`). Layout redesigns
therefore can't break us. Ladder:

1. **Known-blocked list first**: constant `BLOCKED_JOB_BOARDS = {"linkedin.com","indeed.com","naukri.com","glassdoor.com","monster.com", ...}`. URL matches → skip the fetch, return `{ "fetch_failed": true, "reason": "site_blocks_bots", "domain_analysis": {...} }` so the UI can say "This site blocks automated access — paste the posting text or upload a screenshot instead." No evasion attempts (no proxies, no stealth browsers): it's an unwinnable arms race and the wrong posture for a trust platform. These boards' ToS also prohibit scraping.
2. Otherwise fetch with `httpx` — browser User-Agent, 10 s timeout, follow redirects, **no retries**. Traffic pattern is one user-initiated request per URL, not crawling, so bot walls outside the big boards are rare.
3. Detect a useless response (HTTP 403/429, extracted text < 300 chars, "enable javascript"/captcha markers) → same `fetch_failed` response as step 1 with `reason: "page_unreadable"`.
4. **Always run domain analysis regardless of fetch outcome**: the URL's domain goes through `domain_trust` + `internal_db` either way — "we couldn't read the page, but this domain is 12 days old" is often the verdict by itself.

Frontend (Scan Center → Job tab, URL sub-input): on `fetch_failed`, render the domain
analysis result plus a callout steering the user to the paste-text or screenshot inputs —
never a dead end. Paste and screenshot remain the primary paths; URL is convenience.

(Phase 3 note: the review-aggregation signal must use a search API — Serper/Tavily/Google
Programmable Search — over result snippets, never HTML scraping of review sites.)

### 6d. Recruiter Verification (M2) — email authenticity
In `recruiters.py` / a new `app/services/email_checks.py` (`pip install dnspython`):
- **MX check**: no MX records on the claimed domain → strong signal (score 85, weight 40).
- **Free-mail detection**: gmail/yahoo/outlook/proton/rediff etc. claiming to represent a company → signal (score 70, weight 30, explanation "Corporate recruiters use company domains").
- **Disposable-email list**: small bundled txt list of disposable domains → override signal.
- **Lookalike domain**: reuse the Levenshtein/typosquat code in `domain_trust.py` to compare the email's domain against the claimed company domain (`infosys-hr.in` vs `infosys.com`) → high signal on near-miss.

### 6e. Company/Website (M3/M4) — DNS depth + predatory surfacing
- `domain_trust.py`: add MX/SPF/DMARC record checks (dnspython, already added) — a "company" with zero mail infrastructure is a signal (score 60, weight 15).
- `companies.py` response: when internal DB status is `predatory`, return the dedicated explanation and `status: "predatory"` so the UI shows the amber "pay-for-certificate" banner distinct from the red scam banner. Frontend: add the `predatory` status style (amber) to `company-verification` and `website-scanner` result cards and the trust-repository list.

**Accept when:** a synthetic paid-internship posting (fee + certificate + no interview)
returns `verdict_label: predatory_internship`; a gmail "recruiter" for a known company gets
penalized; `analyze-url` on a real job posting URL returns a scored result.

---

## 7. Milestone P2-7 — Minimal Trust Graph

**New file:** `app/services/graph.py`:

```python
def link(source_type, source_id, target_type, target_id, relationship, created_from) -> None
    # best-effort upsert into entity_links (unique constraint absorbs duplicates)
def neighbors(entity_type: str, entity_id: str, depth: int = 1) -> dict
    # returns {"nodes":[{type,id,label,status}], "edges":[{source,target,relationship}]}
    # depth 1: direct links; depth 2: one more hop (cap total nodes at 50)
def flagged_neighbor_signal(entity_type, entity_id) -> Signal | None
    # counts depth-1 neighbors whose status is suspicious/predatory or that are approved
    # reports; >=1 → Signal(score=min(50+20*count,95), weight=60,
    #   explanation=f"Linked to {count} flagged entities in our trust graph")
```

**Auto-linking call sites** (all already touched in earlier milestones — just add `link()` calls):
recruiter verify → `recruiter↔domain` (email domain) and `recruiter↔company`; company verify
→ `company↔domain`; job analyze → `job_posting↔domain/recruiter` (6b); report approval →
`report↔target` (P2-2); communication analyze → `scan↔domain` per extracted link.

**New endpoint:** `GET /graph/{entity_type}/{entity_id}?depth=1` → the nodes/edges JSON.
**Signal integration:** `recruiters.py` and `companies.py` append `flagged_neighbor_signal`
to their combine() — this is the "recruiter linked to 3 flagged companies" USP moment.

**Frontend:** on `trust-repository` search results, add a "Connections" expander per result
that calls the graph endpoint and renders a simple two-column list (entity → relationship →
entity, status chips colored by verified/suspicious/predatory). A visual force-graph is a
Phase 3 nice-to-have; the list ships now.

**Accept when:** approve a report against domain X → verify a recruiter whose email is on
X → verification output includes the flagged-neighbor signal and the graph endpoint returns
both edges.

---

## 8. Milestone P2-8 — Separate User and Admin dashboards (Module 9)

Two distinct dashboards with different audiences, routes, and data:

| | **User dashboard** | **Admin dashboard** |
|---|---|---|
| Route | `/overview` (post-login default) | `/admin` (replaces `/institutional-dashboard`) |
| Who sees it | every logged-in user | `role = 'admin'` only (nav item hidden otherwise; page checks `/auth/me` role and redirects non-admins to `/overview`) |
| Data source | `GET /stats/me` | `GET /stats/admin` (backend returns 403 for non-admins via `get_role`) |
| Purpose | "my activity + quick actions" | "platform intelligence + moderation" |

**New file:** `app/stats.py` with both endpoints.

`GET /stats/me?user_id=` (user dashboard):
```json
{ "my_totals": { "scans": 23, "high_risk_found": 5, "reports_submitted": 2,
                 "reports_approved": 1 },
  "recent_scans": [ /* last 5 scan_history rows for this user */ ],
  "my_report_statuses": [ { "id": "...", "title": "...", "status": "pending" } ] }
```

**Frontend `overview/page.tsx`** (user dashboard): greeting header with the user's name,
4 stat cards (my scans, high-risk found, reports submitted, reports approved), "Recent
activity" list (last 5 scans, click to re-open the stored result via `my-scans`), status of
my submitted reports, and large quick-action cards ("Scan a job posting", "Check a
recruiter", "Analyze a message", "Report a scam") linking to each tool. This page must make
the product self-explanatory to a first-time student user.

`GET /stats/admin` (admin dashboard — all queries over real tables, no hardcoding):
```json
{ "totals": { "scans": 412, "scans_high_risk": 87, "reports_pending": 6,
              "reports_approved": 41, "companies_tracked": 120,
              "companies_suspicious": 18, "companies_predatory": 7,
              "scam_websites": 33, "recruiters_flagged": 12 },
  "scans_by_type":   [ { "scan_type": "job_text", "count": 200 }, ... ],
  "lure_breakdown":  [ { "lure_type": "registration_fee", "count": 25 }, ... ],
  "top_flagged_domains": [ { "domain": "...", "hits": 9, "status": "predatory" } ],
  "trend": [ { "date": "2026-07-01", "scans": 12, "high_risk": 3 }, ... ] }  // last 30 days
```
Implementation notes: use Supabase selects with `count="exact"` for totals; for the trend,
fetch last-30-day `scan_history (created_at, risk_category)` and group by day in Python
(simpler than SQL RPC, fine at this scale). `lure_breakdown` reads `result_payload->>'lure_type'`
from communication scans. `top_flagged_domains` = count `entity_links` targets joined against
flagged `companies`/`scam_websites`.

**Frontend `admin/page.tsx`** (admin dashboard) — tabbed layout. *Skeleton phase ships the
numbers and plain tables; the recharts charts and visual layout below land in
`PHASE2_UIUX_PLAN.md` — but the endpoints must already return everything they need:*

- **Tab 1 — Intelligence**: stat cards row (total scans, high-risk %, companies tracked, predatory companies — amber card), 30-day area/line chart (scans vs high-risk), bar chart of scans_by_type, pie/bar of lure_breakdown, "Top flagged domains" table with status chips, "Predatory internship watchlist" table (`GET /reports?report_type=predatory_internship&status=approved` + companies with `status=predatory`).
- **Tab 2 — Review queue** (moved here from community-reports): pending reports list with expandable evidence (signed URLs from the `evidence` bucket), Approve/Reject buttons with a required resolution-note field, and a reviewed-history list. Approving updates the queue in place with a success toast.
- **Tab 3 — Data health**: row counts per table (companies/recruiters/scam_websites/reports/scans), recent feedback (👍/👎 with comments) — the admin's window into whether verdicts are landing well.

Keep `/institutional-dashboard` as a redirect to `/admin` so old links don't break.

**Accept when:** a `user`-role account never sees the admin nav item and gets redirected off
`/admin`; an admin sees live numbers that change after new scans/approvals; zero hardcoded
values remain in either dashboard.

---

## 9. Milestone P2-9 — Fraud Reporting Assistant (Module 10)

**New file:** `app/reporting_assistant.py`. `pip install reportlab`.

`POST /reporting/generate` — body `{ "scan_id": "..." }` or `{ "report_id": "..." }`:
1. Load the stored scan/report (this is why P2-3 persistence had to come first).
2. Gemini prompt → structured complaint: incident summary, entity details (domain/email/company), evidence list (signals that fired, similarity matches), recommended reporting channel.
3. Render a clean one-page PDF with reportlab (TrustLens header, incident table, evidence bullets, timestamp, disclaimer "auto-generated evidence summary, not legal advice").
4. Return the PDF (`StreamingResponse`, `application/pdf`) plus a JSON variant at `POST /reporting/generate-json` for the UI preview.

Include a static links section (frontend constant, not backend): India cybercrime portal
(cybercrime.gov.in), local cyber cell, FTC (reportfraud.ftc.gov), IC3 (ic3.gov), Action Fraud
UK — shown based on a country dropdown.

**Frontend `reporting-assistant/page.tsx`:** pick one of "my scans" (from P2-3 history) →
preview the generated summary → "Download PDF" → portal links panel.

**Accept when:** a high-risk scan from history produces a downloadable, readable PDF with
its real signals listed.

---

## 10. Milestone P2-10 — Frontend skeleton (functional shell; polish deferred)

All visual/UX refinement now lives in a separate follow-up plan — **`PHASE2_UIUX_PLAN.md`**
— executed after this phase. This milestone builds only the functional skeleton: the
consolidated routes, tabs, forms, and plain result rendering needed for every Phase 2
backend feature to be exercised end-to-end from the browser. **Ugly is acceptable; broken
or unreachable is not.** Frontend deliverables described in P2-2 → P2-9 are built to this
skeleton standard; the UI/UX plan later restyles them without changing any API wiring.

The information architecture (12 routes → 5 destinations) is built **now**, not deferred:
it's structural, and backend wiring needs stable homes. Only its *appearance* is deferred.

### 10a. Consolidate 12 routes → 5 destinations (build as bare shells)

| New destination | Route | Absorbs (old routes) | Rationale |
|---|---|---|---|
| **Home** | `/overview` | `overview`, `my-scans` | Dashboard + full scan history as two tabs of one page ("Dashboard" / "History"); recent-5 activity on Dashboard links into History. |
| **Scan Center** | `/scan` | `job-scanner`, `communication-analyzer`, `recruiter-verification`, `company-verification`, `website-scanner` | These are all the same user intent — "is this safe?" — differing only by input type. One page, four tabs: **Job Posting** (text / URL / screenshot sub-inputs), **Message / Email** (thread builder + screenshot), **Recruiter** (email + claimed company), **Company / Website** (single domain input — these two already share one backend endpoint, so two pages was pure duplication). |
| **Intelligence** | `/intelligence` | `trust-repository`, `scam-similarity` | Both are "search what TrustLens knows": tab **Search** (entity lookup, with the graph Connections expander from P2-7) and tab **Find Similar** (paste text → pgvector matches). |
| **Reports** | `/reports` | `community-reports`, `reporting-assistant` | One reporting journey: tab **Report a Scam** (submit + evidence), tab **My Reports** (status tracking), tab **Complaint Generator** (P2-9 PDF flow). Natural funnel: report here → generate official complaint from the same place. |
| **Admin** | `/admin` | `institutional-dashboard` | As specified in P2-8; visible only to `role === 'admin'`. |

`rag-assistant` is removed from the nav until Phase 3 ships it (dead links erode trust);
it returns later as "Assistant".

Implementation notes:
- Every old route becomes a redirect into its new home with the tab preselected, e.g. `/job-scanner` → `/scan?tab=job`, `/website-scanner` → `/scan?tab=company`, `/scam-similarity` → `/intelligence?tab=similar`, `/reporting-assistant` → `/reports?tab=complaint`. Tab state syncs to the query param so results are shareable/bookmarkable.
- Frontend deliverables described in P2-2 → P2-9 as standalone pages **land as these tabs instead**; every endpoint contract is unchanged.
- Bonus of consolidation: each Scan Center result can show a "Similar known scams" section inline (one extra call to `/similarity/check` with the scanned text) — cross-module value that separate pages made awkward.

### 10b. Sidebar (`src/components/Sidebar.tsx`) — skeleton version

Replace the 12-item list with five plain links plus the existing user menu/logout:
Home `/overview`, Scan Center `/scan`, Intelligence `/intelligence`, Reports `/reports`,
Admin `/admin` (rendered only when `role === 'admin'` from `/auth/me`, cached in
localStorage). Simple active-link highlight is enough. No icons, collapsible rail, or
mobile drawer yet — those come with the UI/UX plan.

### 10c. Skeleton components (minimum shared set, `src/components/ui/`)

Plain Tailwind, zero styling ambition — these are thin placeholders the UI/UX plan will
replace with the real kit, so keep them small and prop-driven:

- `TabNav` — functional tab switcher synced to the `?tab=` query param (unstyled buttons are fine).
- `ResultShell` — renders any analysis response: numeric score, category text, `verdict_label` when present, explanation paragraph, `SignalBreakdown` (already exists), and the 👍/👎 feedback buttons wired to P2-3. Every Scan Center tab and the similarity tab use it.
- `SimpleTable` — dumb `<table>` used for history, repository results, report lists, the review queue, and dashboard tables.
- Inline states, standardized but plain: button disabled + "Loading…" text while pending; error message + Retry button on failure; a one-line empty message. No skeletons, toasts, or animations yet.

### 10d. Functional requirements (what "skeleton works" means)

- Post-login lands on `/overview`; unauthenticated users are still redirected to `/login` (fix the hardcoded `/institutional-dashboard` target in `Sidebar.tsx`/login).
- Every old route redirects to the right destination + tab.
- Role gating works end-to-end: non-admins never see the Admin link, are redirected off `/admin`, and review actions return 403 from the backend.
- Every Phase 2 endpoint is reachable from some form/button: all four Scan Center tabs (including the URL and screenshot sub-inputs and the `fetch_failed` fallback message from 6c), similarity check, repository search + graph Connections expander, report submit/evidence upload/my-reports, review approve/reject, both dashboards, history + feedback, and the PDF download.
- Dashboards render totals and `SimpleTable`s only — recharts charts land in the UI/UX plan.

**Accept when:** every step of the Phase 2 exit walkthrough (§12) can be completed in the
browser using only this skeleton UI. Appearance is explicitly not a criterion here.

---

## 11. Execution order & dependencies

| Order | Milestone | Depends on | Rough size |
|---|---|---|---|
| 1 | P2-1 migration (incl. `profiles` roles) | — | ½ day |
| 2 | P2-10 frontend skeleton (IA shells, sidebar, skeleton components, redirects) | — (parallel with 1) | 1 day |
| 3 | P2-2 community reports write path + role check | P2-1 | 1–1½ days |
| 4 | P2-3 scan persistence + feedback | P2-1 | 1 day |
| 5 | P2-4 pgvector similarity | P2-1 (vectors), P2-2 (corpus) | 1 day |
| 6 | P2-5 communication analyzer | P2-3, P2-4 (embedding write) | 1–1½ days |
| 7 | P2-6 detection upgrades + predatory signals | P2-2 (`internal_db` predatory) | 1½ days |
| 8 | P2-7 trust graph | P2-1; call sites from 3/4/6/7 | 1 day |
| 9 | P2-8 user + admin dashboards | P2-3 (data), P2-2 (role check), P2-10 (components) | 1–1½ days |
| 10 | P2-9 reporting assistant | P2-3 | ½–1 day |
| 11 | Skeleton completeness pass (§10d checklist over all destinations) | everything above | ½ day |

Do P2-10 early — the consolidated shells and skeleton components are where every later
milestone's frontend lands (P2-2/5/8/9 build *inside* them as tabs) — and finish with the
§10d completeness pass once everything exists.

**Deferred to the UI/UX refinement phase** (`PHASE2_UIUX_PLAN.md`, runs right after this
plan): design tokens/visual language, the real UI kit (`ScoreGauge`, `RiskBadge`,
`LoadingState`/`EmptyState`/`ErrorState`, `Toast`, `StatCard`, `DataTable`, `PageHeader`),
sidebar polish + mobile drawer, dashboard charts, verdict-first result design, UX behaviors,
mobile/a11y pass.

Explicitly **deferred to Phase 3**: RAG assistant (M11) incl. certificate-value education
content, force-graph visualization, campaign clustering, review-scraping signal, offer-letter
analysis, DistilBERT re-training on collected feedback, and **all** enterprise hardening
(endpoint auth on scan routes, rate limits, RLS, full RBAC beyond the single role column,
CI, Docker).

New backend deps to add to `requirements.txt`: `httpx`, `beautifulsoup4`, `dnspython`, `reportlab`.

---

## 12. Phase 2 exit criteria (verification walkthrough)

1. Submit a predatory-internship report with an evidence screenshot → it appears pending → approve it → the company shows `predatory` (amber) in company-verification and trust-repository.
2. Paste a job posting mentioning that company's domain → the job scan shows the internal-DB predatory override signal and `verdict_label: predatory_internship` for fee-for-certificate text.
3. Paste a scam WhatsApp thread → high score, correct lure type, extracted link flagged via `scam_websites`.
4. Run `/similarity/check` with text resembling the approved report → real match with similarity %, no hallucinated matches.
5. Verify a recruiter whose email domain was reported → flagged-neighbor graph signal appears; `GET /graph/...` returns the edges.
6. `my-scans` lists every scan above; thumbs-up feedback persists.
7. Log in as a normal user: sidebar shows exactly Home / Scan Center / Intelligence / Reports; `/overview` (default landing) shows *my* stats and quick actions; `/admin` redirects away. Log in as an admin: the Admin item appears, its dashboard shows live platform numbers that move after steps 1–6, and the review queue works from Tab 2.
8. All old routes (`/job-scanner`, `/website-scanner`, `/scam-similarity`, `/community-reports`, `/reporting-assistant`, `/institutional-dashboard`, …) redirect into the correct destination + tab; no mock data remains anywhere.
9. Reporting assistant (Reports → Complaint Generator tab) produces a PDF from one of those scans.
10. All of the above was completed using only the skeleton UI — plain but never broken: loading text while pending, error + Retry on failure (test with the backend stopped), no dead ends. Visual quality criteria live in `PHASE2_UIUX_PLAN.md`, not here.
