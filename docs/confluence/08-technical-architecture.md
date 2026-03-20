# Technical Architecture

**Last updated:** 2026-03-19
**Status:** Approved
**Owner:** Chhayly Sreng (Solo Founder)

---

## Repository

| Field | Value |
|-------|-------|
| GitHub | https://github.com/Chhayly-and-AI/data-concierge |
| Local path | ~/Projects/data-concierge |
| Live URL | https://data-concierge.vercel.app |
| Neon project | proud-hill-17929648 (data-concierge DB) |

---

## Tech Stack

### Current Stack (Inherited from DataConcierge V1)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 | App router, TypeScript |
| AI | Gemini API | Natural language understanding + SQL generation |
| Database | Neon PostgreSQL | Serverless Postgres, project: proud-hill-17929648 |
| Hosting | Vercel | Free tier sufficient for beta |
| Styling | Tailwind CSS | Utility-first CSS |
| Language | TypeScript (frontend + API) | Python (data ingestion scripts) |

### New Stack Components (To Build)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Auth | Shopify OAuth | Self-serve store connection (replaces password auth) |
| Data sync | Shopify Admin API (Node.js) | Pull orders, products, refunds, transactions |
| Billing | Stripe Checkout | $19/mo subscription |
| Email | Resend | Weekly profit digest |
| Cron | Vercel Cron | Trigger weekly email + periodic data refresh |

---

## What Changes from V1 to Shopify Pivot

### Components Being Replaced

| Old (DataConcierge V1) | New (Shopify Profit Advisor) | Why |
|------------------------|------------------------------|-----|
| CSV file ingestion (Python scripts) | Shopify API sync pipeline | Self-serve. No founder intervention needed per client. |
| Password auth per client | Shopify OAuth | Industry standard. Unlocks self-serve onboarding. |
| Generic "ask anything" chat | Profit-focused chat with precomputed answers | Focused value prop. Faster responses. Lower API costs. |
| Manual onboarding (founder runs scripts) | Automated self-serve onboarding | Scales without founder time per client. |
| Per-client YAML config files | Database-driven configuration | Dynamic. No redeployment needed per merchant. |
| Dashboard sidebar with metrics | No dashboard (text-only chat) | V1 cut. Simplifies UI, differentiates from TrueProfit. |
| Multi-schema isolation (one schema per client) | TBD: may keep schema-per-merchant or use row-level security | Depends on scale expectations |

### Components Being Kept (~70% Reuse)

| Component | Details | Modifications Needed |
|-----------|---------|---------------------|
| Next.js 15 structure | App router, API routes, page layout | Refactor pages for new UX flow |
| Gemini API integration | System prompt + two-step query flow | New system prompt for profit-focused context |
| SQL validator + safety layer | Regex-reject non-SELECT, row limits, timeout | No changes needed |
| Rate limiter | In-memory, 30 req/min per client | May need to adjust per-merchant limits |
| Neon PostgreSQL | Serverless, auto-scaling | Extend schema for Shopify data |
| Vercel deployment | CI/CD from GitHub | No changes needed |
| Tailwind CSS styling | Utility classes | Restyle for new brand |

---

## System Architecture

### High-Level Flow

```
Merchant                    Our App                      External Services
-------                    -------                      -----------------

[Shopify Store] --OAuth--> [Auth Service] -------------> [Shopify OAuth]
                           |
                           v
                   [Data Sync Pipeline] ----------------> [Shopify Admin API]
                           |                              (orders, products,
                           v                               refunds, transactions)
                   [Neon PostgreSQL]
                           |
                           v
[Browser] <---Chat--> [Chat API] -----> [Profit Calculation Engine]
                           |                    |
                           |                    v
                           |            [Precomputed Answer Cache]
                           |
                           +----(Q5 only)-----> [Gemini API]
                                                (scenario modeling)

[Vercel Cron] ---------> [Email Digest] ------> [Resend]
                                                 (weekly profit summary)

[Browser] <---Billing---> [Stripe Checkout]
```

### Request Flow for Questions 1-4 (Precomputed)

1. Merchant types a question (e.g., "What's my real profit this month?")
2. Chat API receives the question
3. Simple intent classification (regex/keyword matching or light LLM call) routes to the correct precomputed answer
4. Precomputed answer is retrieved from the cache (database table)
5. Answer is formatted and returned to the chat UI
6. **No full LLM call needed.** Response time: <500ms.

### Request Flow for Question 5 (Scenario Modeling)

1. Merchant types "What happens if I raise prices by $5?"
2. Chat API identifies this as a scenario modeling question
3. Current product data + pricing + sales volume is pulled from the database
4. Gemini API is called with the scenario context + current data
5. Gemini generates a projected profit analysis with stated assumptions
6. Response is formatted and returned to the chat UI
7. **Full LLM call required.** Response time: 2-5 seconds.

---

## Data Model

### Core Tables (New for Shopify Pivot)

```sql
-- Merchant account (created on Shopify OAuth)
merchants (
  id              UUID PRIMARY KEY,
  shopify_shop_id TEXT UNIQUE NOT NULL,
  shop_domain     TEXT NOT NULL,
  shop_name       TEXT,
  access_token    TEXT NOT NULL,  -- encrypted Shopify API token
  plan            TEXT DEFAULT 'beta',  -- beta, standard, cancelled
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Synced Shopify orders
orders (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  shopify_order_id BIGINT NOT NULL,
  order_number    TEXT,
  created_at      TIMESTAMPTZ,
  total_price     DECIMAL(10,2),
  subtotal_price  DECIMAL(10,2),
  total_shipping  DECIMAL(10,2),
  total_tax       DECIMAL(10,2),
  total_discounts DECIMAL(10,2),
  financial_status TEXT,
  source_name     TEXT,  -- channel attribution
  referring_site  TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, shopify_order_id)
)

-- Order line items (for per-product profit)
order_line_items (
  id              UUID PRIMARY KEY,
  order_id        UUID REFERENCES orders(id),
  merchant_id     UUID REFERENCES merchants(id),
  shopify_product_id BIGINT,
  title           TEXT,
  quantity        INT,
  price           DECIMAL(10,2),
  total_discount  DECIMAL(10,2),
  synced_at       TIMESTAMPTZ DEFAULT NOW()
)

-- Synced Shopify products
products (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  shopify_product_id BIGINT NOT NULL,
  title           TEXT,
  vendor          TEXT,
  product_type    TEXT,
  shopify_cost    DECIMAL(10,2),  -- from Shopify's cost field (often empty)
  manual_cost     DECIMAL(10,2),  -- entered by merchant via COGS form
  effective_cost  DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(manual_cost, shopify_cost)) STORED,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, shopify_product_id)
)

-- Refunds (for profit accuracy)
refunds (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  order_id        UUID REFERENCES orders(id),
  shopify_refund_id BIGINT NOT NULL,
  amount          DECIMAL(10,2),
  created_at      TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, shopify_refund_id)
)

-- Manual cost entries (ad spend, misc costs)
manual_costs (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  cost_type       TEXT NOT NULL,  -- 'ad_spend_meta', 'ad_spend_google', 'shipping_override', 'other'
  amount          DECIMAL(10,2),
  period_start    DATE,
  period_end      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Precomputed answers (the cache)
precomputed_answers (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  question_key    TEXT NOT NULL,  -- 'q1_real_profit', 'q2_product_profit', 'q3_roas', 'q4_channel_margins'
  answer_data     JSONB NOT NULL, -- structured answer data
  answer_text     TEXT NOT NULL,  -- human-readable formatted answer
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  data_freshness  TIMESTAMPTZ,   -- timestamp of newest data used in calculation
  UNIQUE(merchant_id, question_key)
)

-- Shopify fee estimates
shopify_fees (
  id              UUID PRIMARY KEY,
  merchant_id     UUID REFERENCES merchants(id),
  order_id        UUID REFERENCES orders(id),
  fee_type        TEXT,  -- 'transaction_fee', 'payment_processing', 'subscription'
  amount          DECIMAL(10,2),
  computed_at     TIMESTAMPTZ DEFAULT NOW()
)
```

### Data Sync Strategy

| Data Type | Shopify API Endpoint | Sync Frequency | Volume Estimate |
|-----------|---------------------|---------------|-----------------|
| Orders | GET /admin/api/orders.json | On connect (full), then daily incremental | 100-10,000 orders/merchant |
| Products | GET /admin/api/products.json | On connect (full), then weekly | 10-500 products/merchant |
| Refunds | GET /admin/api/orders/{id}/refunds.json | Daily with orders | 5-15% of order count |
| Transactions | GET /admin/api/orders/{id}/transactions.json | Daily with orders | 1-3 per order |

### Precompute Pipeline

```
Trigger: Data sync completes (or manual refresh)
    |
    v
[Profit Calculation Engine]
    |
    +---> Q1: Sum all revenue, subtract all costs for current month
    +---> Q2: Per-product profit = revenue - (effective_cost * qty) - allocated fees
    +---> Q3: Ad spend (manual_costs) vs attributed revenue (orders by source)
    +---> Q4: Group by source_name, calculate margins per channel
    |
    v
[Write to precomputed_answers table]
    |
    v
[Answer ready for instant retrieval]
```

---

## Deployment Architecture

### Current (Unchanged)

| Service | Purpose | Cost | Tier |
|---------|---------|------|------|
| Vercel | Next.js app hosting, API routes, cron jobs | $0-20/mo | Free tier for beta |
| Neon PostgreSQL | Database (serverless) | $0-19/mo | Free tier for beta (500MB) |
| Gemini API | AI for scenario modeling + question routing | $10-30/mo | Pay per use (precompute reduces calls) |

### New Services

| Service | Purpose | Cost | Tier |
|---------|---------|------|------|
| Shopify Partner | App registration, OAuth, API access | $0 | Free for developers |
| Stripe | Billing ($19/mo subscriptions) | 2.9% + $0.30/tx | Standard pricing |
| Resend | Weekly email digests | $0 | Free tier (3K emails/mo) |
| Domain | Custom URL for the app | ~$1/mo ($12/yr) | Standard |

### Infrastructure Scaling Considerations

| Milestone | Constraint | Action |
|-----------|-----------|--------|
| 0-50 merchants | Neon free tier (500MB) | No action needed |
| 50-200 merchants | Neon free tier may be tight | Upgrade to Neon Pro ($19/mo) |
| 200+ merchants | Vercel free tier limits (100GB bandwidth) | Upgrade to Vercel Pro ($20/mo) |
| 500+ merchants | Data sync pipeline latency | Add queue (Vercel KV or external) |

**Key principle:** Don't optimize for scale prematurely. At $19/mo with 50 merchants ($950 MRR), the infrastructure costs are $30-50/mo. Margins are excellent. Scale when forced to, not before.

---

## Reuse Assessment

### What Transfers Directly (Low Effort)

| Component | Current State | Effort to Adapt |
|-----------|-------------|----------------|
| Next.js 15 app structure | Working, deployed | Trivial -- add new pages/routes |
| Tailwind CSS | Configured | Trivial -- restyle for new brand |
| Vercel deployment | CI/CD working | None |
| Neon PostgreSQL connection | Working | Trivial -- add new tables |
| Rate limiter | Working | None |

### What Needs Modification (Medium Effort)

| Component | Current State | What Changes |
|-----------|-------------|-------------|
| Gemini integration | Generic "ask anything" system prompt | New profit-focused system prompt. Keep two-step flow (question -> SQL -> answer) but add precompute bypass for Q1-Q4. |
| SQL safety layer | Regex + read-only user | No change to safety. May need to adjust schema_path resolution for merchant isolation. |
| Chat UI | Generic dashboard + chat | Remove dashboard sidebar. Add profit-focused welcome state. Add suggested questions = 5 killers. |
| API routes | POST /api/chat, GET /api/metrics | Refactor /api/chat for precomputed answers. Add Shopify webhook routes. Add billing routes. |

### What Must Be Built Fresh (High Effort)

| Component | Complexity | Estimated Time |
|-----------|-----------|---------------|
| Shopify OAuth flow | Medium | 2-3 days (Week 3) |
| Shopify data sync pipeline | Medium | 2-3 days (Week 3) |
| COGS entry form | Low | 1 day (Week 3) |
| Profit calculation engine | Medium | 2-3 days (Week 4) |
| Precomputed answer cache | Low-Medium | 1-2 days (Week 4) |
| Stripe billing | Low | 1 day (Week 5) |
| Weekly email digest | Low | 0.5 days (Week 5) |
| Onboarding flow | Medium | 1-2 days (Week 5) |

### Total Reuse Estimate: ~70%

The core infrastructure (Next.js, Neon, Vercel, Gemini, Tailwind, safety layers) transfers directly. The data layer and auth layer are full rewrites. The UI needs a significant refactor but not a rewrite.

---

## Security Model

### Authentication

| Concern | Approach |
|---------|----------|
| Merchant auth | Shopify OAuth (industry standard). No password management. |
| API token storage | Shopify access tokens encrypted at rest in Neon. |
| Session management | Vercel serverless sessions. Short-lived JWT. |

### Data Isolation

| Concern | Approach |
|---------|----------|
| Merchant data isolation | All queries scoped by merchant_id. Row-level filtering on every query. |
| Cross-merchant access | Impossible by design -- merchant_id is a required parameter on all data access functions. |
| AI query safety | SQL validator (regex-reject non-SELECT). Read-only DB user for Gemini-generated queries. Row limit (1000). Statement timeout (5s). |

### Data Handling

| Concern | Approach |
|---------|----------|
| What data is synced | Orders, products, refunds, transactions from Shopify API. Only data needed for profit calculations. |
| Data sent to Gemini | Schema description + query results for answer formatting. No raw PII sent unless part of order data. |
| Data retention | Merchant data deleted on account cancellation (or on request). |
| HTTPS | Enforced via Vercel. Non-negotiable. |

### Shopify App Store Compliance

| Requirement | How We Meet It |
|------------|----------------|
| Minimal API scopes | Request only: read_orders, read_products, read_inventory (if needed) |
| Webhook handling | Must handle GDPR webhooks: customers/redact, shop/redact, customers/data_request |
| Data privacy | Privacy policy page. Data handling disclosure during OAuth consent. |
| No fake reviews | All reviews must be from real users who installed via App Store |

---

## Key Technical Decision: Precompute vs Live Query

**Decision:** Precompute the 5 core answers on data sync. Do NOT call the LLM on every question.

**Rationale:**

| Approach | Response Time | API Cost | Accuracy | Complexity |
|----------|-------------|----------|----------|-----------|
| LLM on every query | 3-8 seconds | High ($10-30/mo at 50 merchants) | Variable (LLM may hallucinate numbers) | Low (just prompt engineering) |
| **Precompute on sync** | **<500ms** | **Low ($5-10/mo)** | **Deterministic** | **Medium (calculation engine)** |

The LLM is a formatting and reasoning layer, not the source of truth for numbers. The profit calculation engine produces deterministic, auditable results. The LLM turns those results into conversational answers and handles scenario modeling (Question 5).

---

## Development Environment

### Prerequisites

- Node.js 18+
- Bun (package manager)
- Shopify Partner account (free)
- Neon account (free tier)
- Stripe account (test mode for development)
- Gemini API key

### Environment Variables

```
# Existing
DATABASE_URL=           # Neon PostgreSQL connection string
GEMINI_API_KEY=         # Google Gemini API key

# New (Shopify Pivot)
SHOPIFY_API_KEY=        # From Shopify Partner dashboard
SHOPIFY_API_SECRET=     # From Shopify Partner dashboard
SHOPIFY_SCOPES=         # read_orders,read_products
STRIPE_SECRET_KEY=      # Stripe API key
STRIPE_WEBHOOK_SECRET=  # Stripe webhook signing secret
RESEND_API_KEY=         # For email digest
NEXT_PUBLIC_APP_URL=    # Base URL for OAuth callbacks
```
