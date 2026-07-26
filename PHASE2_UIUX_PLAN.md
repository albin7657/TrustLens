# TrustLens — Phase 2 UI/UX Refinement Plan

> Runs **after** `PHASE2_PLAN.md` is complete. Prerequisite state: the 5-destination
> information architecture exists (`/overview`, `/scan`, `/intelligence`, `/reports`,
> `/admin`), every backend feature is wired through the skeleton UI (`TabNav`,
> `ResultShell`, `SimpleTable`, inline loading/error states), old routes redirect, and role
> gating works. This plan changes **zero API wiring** — it replaces skeleton components and
> restyles pages. If a task here requires a backend change, something went wrong in Phase 2.

Goal: the app looks like one designed product, a first-time student understands every
screen without instructions, and it works on a phone.

---

## U1. Design tokens & visual language

Define once as CSS variables / Tailwind theme tokens in `globals.css`; every component below
consumes tokens — no page picks its own colors again.

- **Color**: background `slate-50`; cards white, `border-slate-200`, `rounded-xl`, `shadow-sm`; text `slate-900` / secondary `slate-500`; one primary accent **`indigo-600`** for buttons, links, active nav (the current all-slate palette is why the UI reads flat). Semantic set — `emerald-600` = verified/low risk, `amber-500` = medium/predatory, `red-600` = high/suspicious. Semantic colors are never used decoratively.
- **Typography**: default Next/Geist font; exactly four sizes — page title 24px semibold, section 16px semibold, body 14px, caption 12px `slate-500`.
- **Layout rhythm**: page container `max-w-5xl mx-auto px-6 py-8`; forms `max-w-2xl`; `space-y-6` between sections; `p-6` card padding. Nothing touches viewport edges.
- **Motion**: 150ms transitions on hover/active, skeleton shimmer, toast slide-in. No gradients, no glow, no leftover `cyber-*` remnants anywhere.

**Accept when:** grepping pages for raw color classes outside the semantic/token set returns
nothing meaningful; every screen visibly shares the same palette and rhythm.

## U2. Real UI kit (replaces skeleton components in `src/components/ui/`)

Swap-in replacements — same props as the skeletons where possible so pages barely change:

- `PageHeader` — title, one-line tool description, optional action slot. Every destination opens with it.
- `TabNav` (restyled) — underline style, keyboard navigable, horizontal scroll on mobile; keeps the `?tab=` sync.
- `ScoreGauge` — SVG semicircle 0–100, colored by category, animated sweep on load. **Every score in the app renders through this** — today's biggest visual inconsistency is each page drawing scores differently.
- `RiskBadge` — score + category pill (emerald/amber/red); `predatory` variant labeled "Pay-for-certificate".
- `ResultCard` (replaces `ResultShell`) — **verdict-first**: plain-language one-liner on top ("⚠ Likely a pay-for-certificate internship — do not pay"), then `ScoreGauge` + `RiskBadge`, explanation, expandable `SignalBreakdown`, feedback strip (👍/👎). Score alone is never the verdict.
- `LoadingState` — skeleton cards matching each page's layout (not spinners), with shimmer.
- `EmptyState` — icon + one teaching sentence + primary action (e.g. History empty → "You haven't scanned anything yet. Try pasting a job offer you received." → button to `/scan`).
- `ErrorState` — friendly message + Retry button; raw error strings never reach the user.
- `Toast` — small context/provider for success/error notices (report submitted, feedback saved). No new dependency; ~60 lines.
- `StatCard` — dashboard number card with label, delta hint optional.
- `DataTable` (replaces `SimpleTable`) — sortable headers, status chips, pagination, and card-list collapse on mobile.

Rule: after this milestone **no page hand-rolls loading/empty/error/result markup**.

## U3. Navigation polish

- Sidebar: lucide icons (`LayoutDashboard`, `ScanSearch`, `Database`, `Flag`, `ShieldCheck`), active state = filled background + left accent bar, icon-only collapsible rail on desktop, slide-over drawer with hamburger under 768px, user menu at bottom.
- No breadcrumbs — 5-item sidebar + `PageHeader` + `TabNav` are the wayfinding.

## U4. Per-destination refinement

- **Home** (`/overview`): greeting header; 4 `StatCard`s; "Recent activity" list with re-open links; my-report status chips; large quick-action cards ("Scan a job posting", "Check a recruiter", "Analyze a message", "Report a scam"). Must make the product self-explanatory to a first-time user. History tab gets `DataTable` with type icons and `RiskBadge`s.
- **Scan Center** (`/scan`): each tab's form gets clear input affordances (text/URL/screenshot segmented control on Job; them/me thread builder rows on Message); results via `ResultCard`; the `fetch_failed` fallback becomes a styled callout steering to paste/screenshot; the inline "Similar known scams" section gets similarity % bars; Message tab renders the scam-stage timeline (contact → trust → urgency → payment) highlighting the detected stage, plus lure-type chip and link-check table.
- **Intelligence** (`/intelligence`): Search tab results as entity cards with status chips and the graph "Connections" expander (entity → relationship → entity, chips colored by status); Find Similar tab with similarity bars and excerpts.
- **Reports** (`/reports`): submission form with drag-drop evidence upload + previews; My Reports as `DataTable` with status chips; Complaint Generator as a two-step flow (pick scan → preview → download PDF) with the country-based portal links panel.
- **Admin** (`/admin`): Intelligence tab gets the recharts charts specified in P2-8 (30-day area/line of scans vs high-risk, bar of scans_by_type, pie/bar of lure_breakdown) over `StatCard` rows and `DataTable`s; Review queue gets expandable evidence previews (signed URLs), required resolution-note field, and toasts on approve/reject; Data health tab as compact tables.
- **Auth + landing**: verify login/signup/callback and the landing page still match the U1 tokens; fix any drift.

## U5. UX behavior, mobile & a11y pass (whole app)

- Every analyze button: disabled while pending → `LoadingState` in the result area → `ErrorState` with Retry on failure. No dead silence anywhere.
- Every empty state teaches (per `EmptyState` above); every destructive/irreversible action (report reject) asks once.
- Mobile 375px: cards stack, `DataTable` collapses to card lists, sidebar becomes drawer, tabs scroll horizontally.
- Keyboard/a11y: Enter submits single-field forms, visible focus rings, `aria-label` on icon-only buttons, charts have text alternatives (the tables already provide this).

---

## Order & sizes

| Order | Milestone | Size |
|---|---|---|
| 1 | U1 tokens | ½ day |
| 2 | U2 UI kit (build + swap into all pages) | 1½–2 days |
| 3 | U3 navigation | ½ day |
| 4 | U4 per-destination refinement | 2 days |
| 5 | U5 behavior/mobile/a11y pass | 1 day |

## Exit criteria

1. Every score in the app renders via `ScoreGauge`; every result opens with a plain-language verdict line.
2. Backend stopped → every destination shows `ErrorState` with Retry; nothing raw or blank.
3. Every empty state has a teaching message + action; toasts confirm submissions and feedback.
4. Sidebar: icons, active accent, rail collapse, mobile drawer; non-admins see 4 items.
5. Admin dashboard shows the three chart types over live data; review queue previews evidence and toasts on decisions.
6. The full Phase 2 exit walkthrough (§12 of `PHASE2_PLAN.md`) still passes unchanged — proof that no wiring broke.
7. App is fully usable at 375px; keyboard focus is visible throughout.
