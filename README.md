<div align="center">

# Recovery OS

### The statutory recovery engine for Indian MSMEs.
*Get paid what the law already owes you — under the MSMED Act, 2006.*

[Next.js 16](https://nextjs.org) · [TypeScript](https://typescriptlang.org) · [Tailwind CSS 4](https://tailwindcss.com) · [Prisma](https://prisma.io) · [Three.js](https://threejs.org) · [Recharts](https://recharts.org) · [Z-AI SDK](https://github.com/zai-org)

</div>

---

## 📹 Demo Video

https://github.com/arpitnayan123-bot/Recovery-OS/assets/public/screenshots/demo-walkthrough.webm

*(Download the `.webm` file from `public/screenshots/demo-walkthrough.webm` if it doesn't play inline.)*

---

## 📸 Screenshots

### Marketing Site

| Homepage (Originkit Hero 24 + WebGL globe) | Login (with demo sign-in) |
|---|---|
| ![Homepage](public/screenshots/08-homepage.png) | ![Login](public/screenshots/09-login.png) |

### Console

| Overview (KPIs + forecast + pipeline) | Profile (engine status + org details) |
|---|---|
| ![Overview](public/screenshots/01-console-overview.png) | ![Profile](public/screenshots/02-profile.png) |

| Invoices (filters + bulk actions) | Invoice Drawer (documents + forecast) |
|---|---|
| ![Invoices](public/screenshots/03-invoices.png) | ![Drawer](public/screenshots/10-invoice-drawer.png) |

| Analytics (4 theme-aware charts) | AI Insights (LLM action plan) |
|---|---|
| ![Analytics](public/screenshots/04-analytics.png) | ![Insights](public/screenshots/05-ai-insights.png) |

| Buyers (risk index + due diligence) | Settings (digest preferences) |
|---|---|
| ![Buyers](public/screenshots/06-buyers.png) | ![Settings](public/screenshots/07-settings.png) |

| Audit Log (immutable accountability) |
|---|
| ![Audit Log](public/screenshots/11-audit-log.png) |

---

## 🎯 The Problem

₹8.0 lakh crore is trapped in MSME receivables across India. The law is unambiguous:

- **§15 MSMED Act** — buyers must pay micro/small suppliers within **45 days** of acceptance
- **§16 MSMED Act** — buyers who delay owe **compound interest at 3× the RBI bank rate** (monthly rests)
- **§43B(h) Income Tax Act** — late MSME payments are **disallowed as tax deductions** (effective April 2024)
- **§18 MSMED Act** — suppliers can file with the MSEFC council (decision in 90 days)
- **§19 MSMED Act** — buyers must deposit **75% of the award** before appealing

Yet most small businesses never collect, because chasing a large buyer costs more than the interest is worth. **Recovery OS closes that gap.**

---

## ⚙️ What Recovery OS Does

Recovery OS watches every invoice, switches on §16 interest the day the statutory term breaks, serves statutory demand, seals the evidence pack, files on the ODR/MSEFC pathway, and tracks the reference to award and money — for a **tiered success fee charged only on money actually recovered**.

### The 5-Stage Pipeline

```
Monitor → Notice served → Evidence sealed → Filed on ODR → Recovery
  (§15)      (§16 demand)    (5 documents)     (§18 filing)    (award + money)
```

Every invoice moves through these stages. Each stage is one click per invoice, with the statutory maths computed automatically.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js 16 App Router                           │
│                                                                     │
│  Marketing (/)        Onboarding (/onboarding)                      │
│  ─ Originkit Hero 24  ─ 3-step wizard + instant demo               │
│  ─ WebGL dot globe    ─ zero-typing demo persona                    │
│  ─ §16 calculator     ─ "Use demo sign in" on /login                │
│                                                                     │
│  Console (/console)── session guard ── per-org data only            │
│  ─ Overview (KPIs + forecast card + chart + pipeline + feed)       │
│  ─ Invoices (bulk actions + comparison + drawer with PDFs)          │
│  ─ Profile (engine status + org + account + KPIs + buyers)         │
│  ─ Analytics (4 theme-aware recharts)                               │
│  ─ AI Insights (LLM action plan)                                    │
│  ─ Buyers (risk index + web-search due diligence)                   │
│  ─ Cases (ODR references + 90-day clocks)                           │
│  ─ Audit Log (immutable accountability ledger)                      │
│  ─ Settings (org + account + digest prefs + danger zone)           │
│  ─ Lawyers (advocate network placeholder)                           │
│                                                                     │
│  Pico — 3D mascot on every page (draggable + chat + voice)         │
│  Compliance OS (/compliance) — buyer-side §43B(h) product           │
├─────────────────────────────────────────────────────────────────────┤
│  API layer (34 route handlers, org-scoped, rate-limited)            │
│  /api/auth/*  /api/session  /api/onboard  /api/overview            │
│  /api/invoices/*  /api/cases  /api/buyers  /api/events             │
│  /api/insights (LLM)  /api/forecast (LLM)  /api/analytics          │
│  /api/documents/[id] (PDF)  /api/samadhaan/[id] (MSEFC form)      │
│  /api/imports (CSV/Tally)  /api/cron/tick (reminder engine)        │
│  /api/digest (prefs)  /api/audit  /api/profile  /api/search        │
│  /api/pico/chat (LLM)  /api/invoices/bulk  /api/invoices/compare  │
├─────────────────────────────────────────────────────────────────────┤
│  Domain core (pure, client-safe) — lib/domain.ts                   │
│  §16 monthly-compound interest · stage machine · statutory notice   │
│  (§15/§16/§18/§19/§43B(h)) · ODR numbering · buyer risk scoring    │
│  tiered success-fee (8-25% by invoice age)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Security — lib/security.ts                                         │
│  Rate limiting · Zod validation · CSRF · secure cookies             │
├─────────────────────────────────────────────────────────────────────┤
│  Prisma ORM (13 models)                                             │
│  Org · User · Buyer · Invoice · Case · Event · Reminder            │
│  Document · Insight · BuyerDiligence · ImportBatch                  │
│  AuditLog · DigestPreference                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM (SQLite dev / PostgreSQL production) |
| Charts | Recharts (theme-aware) |
| 3D | Three.js + Originkit Hero 24 |
| Animation | Framer Motion |
| State | TanStack Query (server) + Zustand (client) |
| Auth | bcryptjs + httpOnly cookies (DB-backed, revocable) |
| AI | Z-AI Web Dev SDK (LLM chat + web search + image gen) |
| PDF | pdf-lib (statutory notice, evidence pack, ODR dossier) |
| Mascot | Pico (custom 3D avatar with 24 animations) |
| Icons | Lucide React |
| Validation | Zod |
| Security | Rate limiting + CSRF + secure cookies |

---

## ✨ Feature Inventory

### Core Engine
- **§16 compound interest** — 3× RBI bank rate, monthly rests, per-second live accrual
- **5-stage pipeline** — Monitor → Notice → Evidence → Filed → Recovery
- **Statutory notice builder** — §15/§16/§18/§19/**§43B(h)** demand letter
- **Tiered success-fee** — 8% (0-45d), 12% (46-90d), 18% (91-180d), 25% (180+d), 30% (post-award)
- **ODR case numbering** — MSEFC-style case numbers

### Authentication
- Email + password signup/login (bcrypt-hashed, DB-backed)
- Change-password flow
- Demo sign-in (one-click seeded workspace)
- Rate limiting (5 login attempts/15min, 3 signups/hour)
- CSRF protection + secure cookies

### Data
- **CSV bulk import** — drag-drop upload with validation + dedupe
- **Tally XML parser** — parse Tally Prime XML export format
- **CSV export** — 16-column reconciliation format
- **Manual invoice entry**
- **Simulated Tally/Zoho sync**
- **Pagination** on all list APIs (limit + offset + hasMore)

### Console
| Page | Route | What it shows |
|---|---|---|
| Overview | `/console` | KPIs, live §16 ticker, forecast card + 90-day chart, pipeline funnel, machine feed |
| Profile | `/console/profile` | Engine status badge, org details, account, top buyers, alert prefs, activity |
| Invoices | `/console/invoices` | Filtered table, checkboxes, bulk actions, comparison, search |
| Invoice Drawer | (modal) | Stage track, notice preview, evidence scan, ODR filing, 3 PDF downloads, per-invoice forecast, timeline |
| AI Insights | `/console/insights` | LLM-generated prioritised action plan, risk flags, opportunities |
| Analytics | `/console/analytics` | Aging buckets, §16 trend, recovery velocity, pipeline distribution (theme-aware) |
| Buyers | `/console/buyers` | Risk index, web-search due diligence (LLM), concentration |
| Cases | `/console/cases` | ODR references, 90-day MSEFC clocks, hearing dates |
| Activity | `/console/activity` | Full machine feed (append-only) |
| Audit Log | `/console/security` | Immutable accountability ledger + import batches |
| Settings | `/console/settings` | Org, account, commercial terms, digest prefs, danger zone |
| Lawyers | `/console/lawyers` | Advocate network placeholder (MSEFC representation) |

### AI Features
- **Recovery Insights** — LLM reads the portfolio and produces a prioritised action plan (P0-P3 actions, risk flags, opportunities)
- **Forecast Narrative** — LLM narrates the cost-of-inaction in plain English with real invoice numbers
- **Buyer Due Diligence** — web search + LLM synthesises a buyer risk report (level, score, signals, sources)
- **Pico Mascot** — 3D avatar (24 animations), draggable, chat with LLM (portfolio-aware), TTS voice, mute/unmute

### Documents
- **Statutory Notice PDF** — §15/§16/§18/§19/§43B(h) demand letter (pdf-lib, A4)
- **Evidence Pack PDF** — 5-document verified pack manifest
- **ODR Dossier PDF** — MSEFC filing reference package
- **Comparison PDF** — side-by-side invoice forecast report
- **MSEFC Form-A** — pre-filled Samadhaan filing form (samadhaan.msme.gov.in)

### UX
- **Command Palette** (⌘K) — search invoices, buyers, cases, pages
- **Keyboard shortcuts** — `?` for help, `g+o/i/c/b/a/s` for navigation, `e` for AI narrative
- **Notifications bell** — unread count + dropdown feed (polls every 30s)
- **Theme toggle** — light/dark with theme-aware charts
- **Bulk actions** — serve demand / seal evidence / file ODR in bulk
- **Invoice comparison** — side-by-side forecast projections + PDF export

### Marketing Site
- **Originkit Hero 24** — cinematic WebGL dot-globe + hand cutouts
- **Visible nav CTAs** — Sign in + Start recovery buttons
- **§16 calculator** — 3 sliders → compound interest computation
- **Sections** — Problem, Law (§15/§16/§18/§19), Product, Calculator, Pricing, FAQ, CTA

### Compliance OS (buyer-side)
- `/compliance` page explaining the §43B(h) tax-deduction risk
- Udyam verification + AP queue prioritisation + quarter-end report (planned)

---

## 📊 Pricing Model

**Pure success-fee. No upfront. No subscription. You pay only from money we recover.**

| Invoice age (at engagement) | Fee | Rationale |
|---|---|---|
| 0–45 days (just broke term) | 8% | Early intervention, high recovery rate |
| 46–90 days | 12% | Standard — most cases resolve here |
| 91–180 days | 18% | Needs notice + evidence + filing |
| 180+ days | 25% | Needs full MSEFC case + legal |
| Post-award enforcement | 30% | Hardest — buyer contesting, §19 deposit |

**Minimum fee: ₹5,000 per recovery.**

---

## 🚀 Quick Start

```bash
# 1. install
bun install

# 2. database (SQLite for dev; PostgreSQL for production)
bun run db:push

# 3. run
bun run dev          # http://localhost:3000
```

No signup needed — press **"Use demo sign in"** on the login page for a seeded workspace.

### Environment

```bash
# .env
DATABASE_URL=file:./db/custom.db          # SQLite (dev)
# DATABASE_URL=postgresql://user:pass@host:5432/recovery_os  # PostgreSQL (prod)

# Email delivery (optional — falls back to console.log in dev)
# RESEND_API_KEY=re_xxxxx
# FROM_EMAIL=recovery@recovery-os.in

# Cron secret (protects /api/cron/tick in production)
# CRON_SECRET=your-secret-here
```

---

## 📡 API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/signup` | POST | Create account (rate-limited, Zod-validated) |
| `/api/auth/login` | POST | Sign in (rate-limited, Zod-validated) |
| `/api/auth/logout` | POST | Revoke session |
| `/api/auth/me` | GET | Current user + org |
| `/api/auth/password` | POST | Change password |
| `/api/session` | GET/POST/DELETE | Read/demo/reset session org |
| `/api/onboard` | POST | Create workspace from wizard |
| `/api/overview` | GET | KPIs, pipeline, clocks, feed |
| `/api/invoices` | GET/POST | List (paginated) + manual entry |
| `/api/invoices/[id]` | GET | Full invoice detail + timeline |
| `/api/invoices/[id]/action` | POST | remind · evidence · file · advance · recover |
| `/api/invoices/bulk` | POST | Bulk serve/seal/file (stage-gated) |
| `/api/invoices/compare` | GET | Side-by-side forecast comparison |
| `/api/invoices/compare/pdf` | GET | Comparison PDF (pdf-lib) |
| `/api/invoices/export` | GET | CSV export (16 columns) |
| `/api/invoices/sync` | POST | Simulated Tally/Zoho sync |
| `/api/cases` | GET | ODR cases + 90-day clocks |
| `/api/buyers` | GET | Buyer risk index rollups |
| `/api/buyers/[id]/diligence` | GET/POST | Web-search + LLM due diligence |
| `/api/events` | GET | Activity feed |
| `/api/analytics` | GET | Aging, velocity, distribution, trends |
| `/api/insights` | GET | LLM recovery action plan |
| `/api/forecast` | GET | Cost-of-inaction projections + 90-day curve |
| `/api/documents/[id]` | GET | Statutory notice / evidence / ODR PDF |
| `/api/samadhaan/[invoiceId]` | GET | Pre-filled MSEFC Form-A |
| `/api/imports` | GET/POST | CSV import with dedupe + validation |
| `/api/cron/tick` | GET/POST | Reminder engine (respects digest prefs + demo cleanup) |
| `/api/digest` | GET/POST | Email/WhatsApp/SMS preferences |
| `/api/digest/test` | POST | Send test alert |
| `/api/audit` | GET | Audit log + import batches |
| `/api/profile` | GET | Full consumer profile |
| `/api/search` | GET | Command palette search |
| `/api/pico/chat` | POST | Pico LLM chat (portfolio-aware) |

---

## 🗄️ Database Schema (13 models)

| Model | Purpose |
|---|---|
| `Org` | Supplier organisation (linked to User) |
| `User` | Auth account (email + bcrypt passwordHash) |
| `Buyer` | Counterparty (GSTIN, city, diligence) |
| `Invoice` | Core entity (amount, due date, status, case, documents) |
| `Case` | MSEFC reference (caseNumber, stage, hearing, award) |
| `Event` | Append-only machine feed |
| `Reminder` | Queued email/WhatsApp/SMS (channel, kind, status) |
| `Document` | Evidence pack items + PDF payload |
| `Insight` | Cached LLM action plans |
| `BuyerDiligence` | Web-search risk report per buyer |
| `ImportBatch` | CSV/Tally import audit |
| `AuditLog` | Immutable accountability ledger |
| `DigestPreference` | Per-org alert channels + triggers + cadence |

---

## 🔒 Security

- **Rate limiting** — login (5/15min), signup (3/hour) per IP
- **Zod validation** — all API inputs validated
- **CSRF protection** — same-origin check on POST endpoints
- **Secure cookies** — `httpOnly + sameSite=lax + secure` (production)
- **bcrypt** — passwords hashed with 10 rounds
- **DB-backed sessions** — cookie holds userId, validated on every request
- **Multi-tenant scoping** — every query includes `orgId` (PostgreSQL RLS recommended for production)

---

## 🎭 Pico — Your Recovery OS Companion

Pico is a 3D animated cloud-sphere mascot with **24 expressions** (happy, thinking, curious, excited, proud, celebrate, sad, etc.). He appears on every page (homepage, login, console) as a floating, draggable companion.

- **Tap to chat** — ask Pico about Recovery OS, the MSMED Act, or your portfolio
- **Voice (TTS)** — Pico speaks his responses (rate 1.05, pitch 1.2)
- **Mute/unmute** — toggle voice in the chat header
- **Drag to move** — grab Pico and place him anywhere (position persists)
- **Portfolio-aware** — Pico's chat includes your live KPIs when you have a session

---

## 📐 The 4-Layer Vision

Recovery OS is not a single product — it's four connected layers:

1. **Recovery** (core, built) — the engine: detect overdue → remind → evidence → file → chase to award → collect. Every case produces proprietary recovery-outcome data.

2. **Monitoring** (free, exists) — the 45-day §15 watch on every invoice. Not a product — the input funnel for Layer 1.

3. **Compliance** (planned) — a buyer-side product riding on §43B(h). Helps enterprises that want to pay correctly but keep missing the 45-day deadline. Positioned as "avoid getting blindsided by the tax hit," not "comply with the law."

4. **Risk scoring + data** (downstream) — recovery-outcome data that only a product running the actual funnel can produce. Which buyers needed legal pressure to pay? How long did it take? This data is NOT what TReDS or CIBIL already track — it's proprietary recovery-outcome intelligence.

---

## 📝 Statutory Grounding

Recovery OS operationalises, and its output cites:

| Section | Act | What it does |
|---|---|---|
| §15 | MSMED Act, 2006 | 45-day payment term |
| §16 | MSMED Act, 2006 | Compound interest at 3× bank rate, monthly rests |
| §43B(h) | Income Tax Act, 1961 | Tax deduction disallowed for late MSME payments (April 2024) |
| §18 | MSMED Act, 2006 | MSEFC reference filing (decision in 90 days) |
| §19 | MSMED Act, 2006 | 75% pre-deposit to appeal an award |

Nothing here is legal advice. Filings are prepared for the owner's review.

---

## 📂 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # marketing site
│   ├── layout.tsx                  # root layout (Pico + metadata)
│   ├── login/ + signup/            # auth pages
│   ├── onboarding/                  # wizard + instant demo route
│   ├── compliance/                  # buyer-side §43B(h) product
│   ├── console/                    # 12 pages (overview → settings)
│   └── api/                        # 34 route handlers
├── components/
│   ├── site/                       # nav, hero, calculator, sections
│   ├── console/                    # shell, drawer, kit, forecast, etc.
│   ├── originkit/                  # Hero 24 (globe, hands, scale frames)
│   ├── cloudee/                    # Pico 3D avatar runtime
│   └── pico/                       # Pico widget + boundary
├── lib/
│   ├── domain.ts                   # pure §16 logic + notice + pricing
│   ├── recovery.ts                 # Prisma + demo seeding
│   ├── auth.ts                     # bcrypt + sessions + audit
│   ├── security.ts                 # rate limit + CSRF + cookies
│   ├── email.ts                    # Resend integration
│   ├── tally-parser.ts             # Tally XML parser
│   ├── dto.ts                      # wire serialization
│   ├── session.ts                  # org session cookie
│   └── format.ts                   # ₹ formatting + §16 maths
├── hooks/                          # use-keyboard-nav, use-theme
└── prisma/                         # schema.prisma (13 models)
```

---

## 🔧 Development

```bash
bun run dev      # dev server on port 3000
bun run lint     # ESLint
bun run db:push  # push schema changes to database
```

---

<div align="center">

**Built for the businesses that build India.**

*Recovery OS — they had 45 days. It's day 214. We go get it.*

</div>
