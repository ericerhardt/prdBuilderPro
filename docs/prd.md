# PRD Builder Pro — Product Requirements Document (PRD)

**Product type:** AI app builder that generates platform-specific PRDs (system prompts)  
**Stack:** Vercel (Next.js/Edge Functions), Supabase (Auth, Postgres, RLS, Storage), Stripe (Billing)  
**Audience:** Indie devs, agencies, founders, product engineers who want fast, accurate PRDs tailored to build platforms like Replit, Bolt.new, Leap.new, and Lovable.

---

## 1) Problem & Goals
**Problem:** Teams lose time translating fuzzy ideas into build-ready specs and then re-writing them to match each platform’s quirks (hosting, auth, connectors, billing, etc.).  
**Goal:** Let users describe what they want, pick a target platform, and receive an auto-generated, fully editable PRD that already accounts for that platform’s stack, options, and conventions—plus a turnkey subscription model with Stripe.

**Success metrics (v1):**
- ≥70% of generated PRDs require “minor tweaks only” (self-report).
- Time-to-first-PRD < 5 minutes.
- ≥40% of new users successfully create a Stripe-backed project skeleton from the PRD within 24 hours (via emailed follow-up survey prompt).

---

## 2) Core User Stories
1. **Create PRD (happy path).**  
   As a user, I select **Platform = Lovable** → I’m shown Lovable-specific fields (e.g., MCP connectors, repo settings). I enter my product’s pitch, features, data, and constraints. I click **Generate**, and **PRD Builder Pro** returns a polished PRD tuned to Lovable’s build style. I can edit any section, then export/copy as Markdown for Claude Code.
2. **Switch platform.**  
   I change Platform to **Leap.new** → the UI reveals parameters like model settings, tool adapters, and backend options. I regenerate and get a Leap.new-optimized PRD.
3. **Stripe SaaS plan.**  
   I enable “Subscription SaaS” → I pick pricing model (monthly, annual, metered), then PRD Builder Pro injects a **Billing** section (implementation notes, webhooks, admin analytics) into the PRD.
4. **Save & compare versions.**  
   I save multiple PRD drafts. I can diff versions and revert.
5. **Team collaboration (post-MVP).**  
   I invite teammates to comment or propose edits.

---

## 3) Product Scope (v1)
### Must-have
- Platform dropdown with dynamic parameter panels for **Replit**, **Bolt.new**, **Leap.new**, **Lovable**.
- PRD Generator: prompt-engineering engine that merges (a) user inputs, (b) platform profiles, and (c) best-practice templates into one cohesive document.
- Post-generation editor (rich text + section toggles) and **Export for Claude Code** (Markdown).
- Stripe subscription blueprint (plans, webhooks, dunning, customer portal) added to the PRD when enabled.
- Supabase Auth (Email/Password + OAuth), RLS-secured multi-tenant data model.
- Admin dashboard for Stripe analytics (Active subs, MRR, Churn, Trials, Involuntary churn signals).

### Nice-to-have (v1.1+)
- AI “question-ladder” to elicit missing details before generation.
- One-click “Spin up skeleton repo” per platform (where possible).
- Team roles & comments.
- Template marketplace.

---

## 4) High-Level Architecture
- **Frontend:** Next.js (App Router) on Vercel, Typescript, Tailwind, shadcn/ui.  
- **Backend:** Vercel Edge/Serverless Functions for secure ops (Stripe webhooks, token exchange).  
- **Database:** Supabase Postgres (RLS), Supabase Storage for PRD attachments/exports.  
- **Auth:** Supabase Auth (JWT), workspace-scoped RBAC.  
- **Billing:** Stripe Checkout + Customer Portal; webhook ingestion to Supabase.  
- **Observability:** Vercel Analytics + simple audit/event tables.

---

## 5) Data Model (Supabase/Postgres)
```sql
-- Multi-tenant
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text check (role in ('owner','admin','editor','viewer')) not null,
  primary key (workspace_id, user_id)
);

-- PRDs
create table prd_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  platform text not null,                -- 'replit' | 'bolt' | 'leap' | 'lovable'
  title text not null,
  body_markdown text not null,
  params jsonb not null default '{}',    -- captured UI inputs
  version int not null default 1,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table prd_versions (
  prd_id uuid references prd_documents(id) on delete cascade,
  version int not null,
  body_markdown text not null,
  params jsonb not null default '{}',
  created_at timestamptz default now(),
  primary key (prd_id, version)
);

-- Platform registry (drives dynamic UI)
create table platforms (
  id text primary key,                   -- 'replit','bolt','leap','lovable'
  label text not null,
  ordering int not null,
  enabled boolean default true
);

create table platform_params (
  id bigserial primary key,
  platform_id text references platforms(id) on delete cascade,
  key text not null,                     -- e.g., 'backend', 'mcp_connectors'
  label text not null,
  type text not null,                    -- 'text'|'textarea'|'select'|'multiselect'|'boolean'
  help text,
  options jsonb,                         -- for select types
  required boolean default false,
  advanced boolean default false
);

-- Stripe
create table billing_customers (
  user_id uuid primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  stripe_customer_id text unique
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  stripe_subscription_id text unique,
  plan_id text,                          -- FK to internal plan catalog (optional)
  status text,                           -- trialing, active, past_due, canceled, incomplete
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table stripe_events (
  id bigserial primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz default now()
);

-- Analytics snapshots (rolled up by job or on read)
create table billing_metrics_daily (
  day date primary key,
  mrr_cents bigint not null,
  active_subscribers int not null,
  trials int not null,
  churn_rate numeric(6,4),
  arpa_cents bigint,
  new_subs int not null,
  cancels int not null
);
```

**RLS:** All tables should scope reads/writes by `workspace_id` membership. `platforms`/`platform_params` are public-read.

---

## 6) Platform Profiles & Parameters (what users fill in)

### Shared base inputs
- **Product pitch (1–2 sentences)**
- **Target users & jobs-to-be-done**
- **Core features** (multi-select + freeform)
- **Data entities** (freeform + guided prompts)
- **Design vibe** (minimal, dashboard, marketplace, playful, etc.)
- **Include billing section?** (toggle)

### Platform-specific panels

#### Replit
- Backend: Node/Express | FastAPI | Flask  
- Persistence: Replit DB | Supabase | SQLite (dev)  
- Deployment: Replit Nix + secrets  
- Repo/Template: pick official templates

#### Bolt.new
- Codegen target: Next.js / Remix  
- Auth source: Supabase | Clerk  
- Hosting assumptions and secret management

#### Leap.new
- Model/runtime: (Claude/OpenAI/etc.)  
- **MCP connectors**: Filesystem, GitHub, Google Drive, Notion, Slack (multi-select)  
- Tools/APIs: vector DB, embeddings, formatter, schema validators  
- Guardrails: PII redaction, prompt-budget, eval hooks

#### Lovable
- Project type: Web app | Mobile | Landing + backend  
- Source control: GitHub repo settings  
- Integrations: Supabase, Stripe, Upload service  
- Collaboration: PR flow assumptions

> The generator uses these inputs to weave platform conventions (file structure, secrets, deploy steps) into the PRD and to add concrete “Claude Code Tasks” per platform.

---

## 7) PRD Output Structure (what PRD Builder Pro generates)
1. **Title & One-liner**  
2. **Problem & Target Users**  
3. **User Flows** (happy path + edge cases)  
4. **Feature List** (MVP vs later)  
5. **Data Model** (entities, relationships, indexing notes)  
6. **Platform-Specific Implementation Notes**  
   - File layout, environment variables, secret handling  
   - Auth, storage, connectors, deployment steps  
7. **Stripe Subscription Blueprint** (if enabled)  
8. **Admin & Analytics** (Stripe metrics + product usage signals)  
9. **Non-functional Requirements** (perf, security, privacy, logging)  
10. **Acceptance Criteria & Test Plan**  
11. **“For Claude Code” Task List** (copy-pasteable Markdown)

---

## 8) “For Claude Code” — Implementation Tasks (copy-paste)

> Paste the section below into Claude Code to scaffold the project. You can regenerate per platform.

### 8.1 Project Setup (Vercel + Supabase)
- Create a Next.js (App Router, TS) project.
- Install deps: `@supabase/supabase-js`, `@stripe/stripe-js`, `stripe`, `zod`, `zustand`, `@tanstack/react-query`, `lucide-react`, `next-safe-action`.
- Add **`.env`** keys:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (serverless only)
  - `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- Create Supabase schema (see SQL above) and enable RLS policies.
- Seed `platforms` & `platform_params` with the options in Section 6.

### 8.2 Auth & Workspaces
- Implement Supabase Auth UI (email+password; social later).
- On first login, create a **workspace** and add the user as `owner`.
- Add middleware to resolve `activeWorkspaceId` via cookie/query for all app routes.

### 8.3 PRD Builder UI
- Page: `/builder`
  - **PlatformSelect**: reads `platforms`, selects one.
  - **DynamicParamsForm**: builds controls from `platform_params` (type, options, help, required).
  - **CoreInputs**: pitch, target users, features, entities, vibe.
  - **BillingToggle**: include Stripe blueprint?
  - **GenerateButton**: posts to `/api/generate`.
- Page: `/editor/[id]`
  - Markdown editor with left nav of sections.
  - **Versioning**: Save creates a new entry in `prd_versions`.
  - **Export**: Copy Markdown; download `.md`.

### 8.4 PRD Generation API
- Route: `POST /api/generate`
  - Validate payload with Zod.
  - Build a **generation prompt** from:
    - User inputs (core + platform params)
    - Platform profile template (Section 6)
    - Best-practice skeleton (Sections 7–11)
  - Call chosen LLM provider (abstraction for OpenAI/Anthropic).  
  - Persist `prd_documents` + `prd_versions`.

### 8.5 Stripe Subscription (SaaS)
- Pricing page: `/pricing` with plan cards.
- Checkout: `POST /api/billing/checkout`
  - Creates/attaches Stripe Customer to user/workspace.
  - Redirects to `stripe.redirectToCheckout`.
- Billing portal: `GET /api/billing/portal`
  - Creates portal session; redirects.
- Webhook handler: `POST /api/stripe/webhook` (Vercel function)
  - Handle: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_*`.
  - Upsert `subscriptions` and write to `stripe_events`.
  - Optional: handle soft-dunning (email notices).
- Admin analytics page: `/admin/billing`
  - KPIs: Active Subs, MRR, Trials, New vs Cancel, Churn, ARPA.
  - Source data: live Stripe API + `billing_metrics_daily` rollups.

### 8.6 Admin Panel
- Route group `/admin` protected to `role in ('owner','admin')`.
- Pages:
  - **Stripe Overview** (see above)
  - **Users & Roles** (list, invite, change role)
  - **PRD Library** (all PRDs, filters by platform, author, date)
  - **Platform Config** (toggle visibility, edit param labels/options)

### 8.7 Security & Policies
- Supabase RLS:  
  - Only members of a workspace can read/write its PRDs and billing rows.
- Serverless only uses **service role** in backend code (never on client).
- Encrypt secret fields at rest where applicable.
- Add `Content-Security-Policy`, disallow inline scripts, use `next-safe-action` on mutations.

### 8.8 Testing & Acceptance
- Unit: Zod schemas, generation prompt builders, webhook handlers.
- E2E (Playwright): Create account → Build PRD → Checkout test → Admin metrics show subscription.
- Webhooks: Use Stripe CLI to replay events in CI.
- Acceptance checks (sample):
  - [ ] Switching platform changes visible params and influences PRD sections.
  - [ ] Generated PRD includes platform-specific file layout & secrets list.
  - [ ] Billing toggle injects the full Stripe blueprint.
  - [ ] Admin dashboard renders all KPIs with non-zero seed data.

---

## 9) Stripe Blueprint (content injected into the PRD when “Billing” is ON)

**Plans & Pricing**
- Support Monthly & Annual tiers; optional **metered add-on** (e.g., generations over quota).
- Plan catalog stored in Stripe; mirror IDs in app config for gating features.

**Checkout & Portal**
- Client: `stripe-js` for Checkout; Portal for self-serve updates/cancellations.
- Server: ephemeral sessions via secure API routes.

**Webhooks (minimum)**
- `checkout.session.completed` → attach `stripe_customer_id` to workspace.
- `customer.subscription.created|updated|deleted` → upsert `subscriptions`.
- `invoice.payment_failed` → mark past_due and surface banner.
- (If metered) report usage daily with `usage_record.create`.

**Feature Gating**
- Middleware reads subscription status; components receive `entitlements` (e.g., `max_prds`, `ai_generate_per_day`).
- Free plan: limited PRD versions, no team features.
- Pro plan: unlimited PRDs, team seats, advanced platforms, priority queue.
- Business: SSO, audit logs, custom limits.

**Admin Analytics (definitions)**
- **Active Subscribers:** `subscriptions.status in ('trialing','active','past_due')`
- **MRR:** sum(plan price monthly-equivalent for active)
- **Churn (logo):** cancels / prior active
- **ARPA:** MRR / active subscribers
- **Trials:** `status = 'trialing'`
- **Involuntary churn signal:** payment_failed in last N days

---

## 10) UX Details
- **Nav:** Builder, Library, Pricing/Billing, Admin (role-gated), Account.
- **Builder page layout:**
  - Left: Platform pick + param panels (accordion).
  - Center: Core inputs (pitch, users, flows, features, data).
  - Right: Tips panel that updates with platform-specific guidance.
- **Editor:**
  - Section list (Problem, Flows, Data, Platform Notes, Billing, Admin, NFRs, Tests).
  - “Regenerate section only” action for targeted rewrites.
- **Empty states:** Friendly examples for first PRD; link to sample platforms.

---

## 11) Non-Functional Requirements
- **Performance:** TTFB < 200ms for cached reads; generation requests streamed.
- **Availability:** 99.9% (best-effort on Vercel/Supabase).
- **Security:** RLS everywhere; secrets never sent to client; HTTPS only.
- **Privacy:** No training on user PRDs without explicit opt-in.
- **Compliance:** Stripe PCI handled client-side; server never stores card data.

---

## 12) Analytics & Telemetry
- Track: platform selection, time-to-first-PRD, edits per PRD, export events, billing status changes.
- Respect Do-Not-Track; anonymize where appropriate.

---

## 13) Risks & Mitigations
- **Platform drift:** Platform conventions change.  
  *Mitigation:* Store platform profiles in DB; version them; ship silent updates.
- **Webhook fragility:** Missed Stripe events.  
  *Mitigation:* Idempotency, store all events, periodic reconciliation job.
- **Prompt quality variance:** Some ideas are underspecified.  
  *Mitigation:* Pre-generation question-ladder to fill gaps; show examples.

---

## 14) Rollout Plan
- **Alpha:** Internal & 10 design partners (one per platform focus).  
- **Beta:** Open waitlist + Stripe live mode.  
- **GA:** Template marketplace + team collaboration.

---

## 15) Appendix — Example Section Snippets the Generator Should Produce

### A) Platform Notes (Lovable)
- **Repo & branches**, **Environment variables**, **MCP connector picks**, **Supabase auth wiring**, **Stripe pages**, **CI hints**.

### B) Platform Notes (Leap.new)
- **MCP connectors** selected (e.g., GitHub, Notion).  
- **Tool use policy** (rate limits, retries, budget).  
- **Prompt structure & evals** for PRD generation tasks.

### C) Platform Notes (Replit/Bolt.new)
- **Process model** (server vs serverless), secret injection, quick deploy, sample directory map, run scripts.

---

# Deliverable: Claude-Ready PRD Template (export format)

Copy/export a single Markdown file with the following headings. This is what PRD Builder Pro outputs for users to paste into Claude Code:

```
# {Product Name}
## One-liner
## Problem & Users
## User Flows
## Features (MVP vs Later)
## Data Model
## Platform Implementation Notes ({platform})
## Billing with Stripe (if enabled)
## Admin & Analytics
## Non-Functional Requirements
## Acceptance Criteria & Test Plan
## Tasks for Claude Code
- [ ] Scaffold Next.js on Vercel with Supabase Auth & DB schema
- [ ] Seed platform registry and params
- [ ] Implement Builder UI (dynamic panels)
- [ ] Implement /api/generate (prompt builder + LLM call)
- [ ] Add Editor with versioning & export
- [ ] Add Pricing, Checkout, Portal; wire Stripe webhooks
- [ ] Build Admin Billing dashboard (MRR, Active subs, Churn, Trials)
- [ ] Add RLS policies, role gates, CSP, logging
```
