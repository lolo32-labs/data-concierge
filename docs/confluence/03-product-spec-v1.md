# Product Specification -- V1

**Last updated:** 2026-03-19
**Status:** Approved
**Owner:** Chhayly Sreng (Solo Founder)

---

## Product Vision

A Shopify profit advisor that answers the question every store owner asks but Shopify cannot: **"What's my real profit?"**

The product connects via Shopify OAuth, ingests store data, and delivers precomputed answers to 5 high-value profit questions through a conversational AI interface.

---

## The 5 Killer Questions

V1 answers exactly these 5 questions. Everything else is out of scope.

### Question 1: "What's my real profit this month?"

- **Role:** The hook / aha moment
- **Data required:** Orders, refunds, Shopify fees, shipping costs, COGS (manual entry), ad spend (manual entry)
- **Calculation:** Revenue - COGS - Shopify fees - shipping costs - returns/refunds - ad spend
- **Output:** Single dollar figure with breakdown by cost category
- **Example response:** "Your real profit this month is $8,247. That's on $47,312 in revenue. Here's where the money went: COGS ($22,450), Shopify fees ($1,325), shipping ($8,200), returns ($3,100), ad spend ($3,990)."

### Question 2: "Which products are actually making me money?"

- **Role:** Behavior-changing insight
- **Data required:** Product-level orders, per-product COGS, per-product returns/refunds, allocated fees
- **Calculation:** Per-product revenue - per-product COGS - per-product share of fees/shipping/returns
- **Output:** Ranked list of products by net profit, with margin percentage
- **Example response:** "Your top 3 profitable products are: (1) Wireless Earbuds -- $2,340 profit, 34% margin, (2) Phone Case Bundle -- $1,890 profit, 52% margin, (3) Charging Dock -- $1,200 profit, 28% margin. Your 3 least profitable: ..."

### Question 3: "How much did I spend on ads vs. what they brought in?"

- **Role:** True ROAS (Return on Ad Spend)
- **Data required:** Ad spend (manual entry per channel), attributed revenue (from Shopify UTM/source data)
- **Calculation:** Revenue per channel / ad spend per channel
- **Output:** ROAS by channel, total ad spend vs total attributed revenue
- **Note:** V1 uses Shopify's source attribution + manual ad spend entry. No Meta/Google API integration.

### Question 4: "What are my margins by order channel/source?"

- **Role:** Channel profitability
- **Data required:** Orders with source/channel attribution, channel-level COGS allocation, channel-level fee allocation
- **Calculation:** Per-channel revenue - per-channel allocated costs
- **Output:** Margin breakdown by channel (organic, paid social, email, referral, etc.)

### Question 5: "What happens to my profit if I raise prices by $X?"

- **Role:** Scenario modeling (forward-looking)
- **Data required:** Current pricing, current sales volume, price elasticity assumptions
- **Calculation:** LLM-assisted scenario projection based on current data
- **Output:** Projected profit change with assumptions stated
- **Note:** This is where the LLM earns its keep. Questions 1-4 use precomputed data; Question 5 uses the LLM for reasoning.

---

## Aha Moment

The gap between Shopify-reported revenue and real profit.

**Target experience:** Merchant connects their store, enters COGS, and sees: "$47K revenue, but only $8K profit after all costs."

This single moment is the emotional hook. If we nail this, everything else follows.

---

## Activation Metric

**Definition:** User sees their real profit number AND clicks at least one follow-up question.

**Target:** 60% of users activate in their first session.

**Why this metric:** Seeing the profit number proves the product works. Clicking a follow-up question proves the user finds enough value to explore. Together, these predict retention.

---

## Time to Value Target

**Under 3 minutes** from Shopify OAuth connect to first profit number on screen.

### Onboarding Flow

```
Step 1: Land on our site / App Store listing
Step 2: Click "Connect Shopify Store" --> Shopify OAuth flow
Step 3: OAuth completes, data sync begins (orders, products, refunds, transactions)
Step 4: COGS entry form appears -- per-product cost input
        (Optional: skip and get partial profit estimate, or bulk CSV upload)
Step 5: Processing complete --> First profit number displayed
Step 6: Suggested follow-up questions appear (the other 4 killer questions)
```

**Critical path to aha moment:** Steps 2 through 5 must complete in under 3 minutes. The data sync is the bottleneck -- precompute the answer as data streams in, don't wait for full sync to complete.

### COGS Entry UX

COGS (Cost of Goods Sold) is the make-or-break data point. Shopify doesn't store it natively. Our approach:

1. **Default:** Use Shopify's `cost` field if the merchant has populated it (many don't)
2. **Manual entry:** Simple per-product cost form. Show the product name, current price, and a field for cost
3. **Bulk upload:** CSV upload for merchants with many SKUs
4. **Progressive:** Start with top 10 products by revenue. Don't require ALL products to show a profit estimate
5. **Motivation:** Show the "profit gap" -- "We can calculate your profit more accurately if you enter costs for these 10 products. Right now we're estimating based on [X]."

**Target:** 80% of merchants complete COGS entry for their top products.

---

## V1 Scope Definition

### What V1 Includes

| Component | Description |
|-----------|------------|
| Shopify OAuth integration | Self-serve store connection |
| Data sync pipeline | Pull orders, products, costs, refunds, transactions from Shopify API |
| COGS manual entry form | Per-product cost input (individual + bulk CSV) |
| Profit calculation engine | Revenue - COGS - fees - shipping - returns - ad spend |
| Precomputed answer cache | Calculate the 5 answers on sync, not on every query |
| Conversational UI | Chat interface with suggested questions = the 5 killers |
| Weekly email digest | "Your profit this week" summary via Resend + Vercel Cron |
| Stripe billing | $19/mo subscription via Stripe Checkout |
| Shopify App Store listing | Name, icon, screenshots, keywords, description |

### What V1 Explicitly Cuts

| Cut | Rationale |
|-----|-----------|
| General NLP / "ask anything" | We answer 5 questions, not infinite questions |
| Dashboards or charts | Text answers only. No Recharts, no D3, no visualizations |
| Ad platform API integrations (Meta, Google) | Ad spend is manual entry. API integration is complex and fragile |
| Inventory management / restock alerts | Not a profit question |
| Multi-store support | One store per account. Simplifies everything |
| Accounting or tax calculations | Out of our domain. Defer to QuickBooks/Xero |
| POS / in-store data | Online only for V1 |
| Mobile app | Web only, responsive design |
| Team / multi-user accounts | Solo merchant focus |
| Peer benchmarks | Year 2 moat, requires aggregated data |
| Proactive alerts | Year 2 feature |

---

## Tech Stack

### Kept from Existing Codebase (~70% reuse)

| Component | Details |
|-----------|---------|
| Framework | Next.js 15 |
| AI | Gemini API integration |
| Safety | SQL validator + safety layer |
| Rate limiting | In-memory counter (30 req/min per client) |
| Database | Neon PostgreSQL (project: proud-hill-17929648) |
| Hosting | Vercel deployment |
| Styling | Tailwind CSS |

### New Components to Build

| Component | Priority | Complexity |
|-----------|----------|-----------|
| Shopify OAuth integration | MUST HAVE (unlocks everything) | Medium -- use Shopify Node.js library |
| Data sync pipeline | MUST HAVE | Medium -- orders, products, costs, refunds from Shopify API |
| COGS manual entry form | MUST HAVE | Low -- per-product cost entry UI |
| Profit calculation engine | MUST HAVE | Medium -- multi-variable calculation |
| Precomputed answer cache | MUST HAVE | Low-medium -- calculate on sync, store results |
| Weekly email digest | NICE TO HAVE | Low -- Resend + Vercel Cron |
| Stripe billing | MUST HAVE (for launch) | Low -- Stripe Checkout session |

### Key Technical Decision: Precompute, Don't Query

The 5 core answers are precomputed on data sync. We do NOT call the LLM on every question.

**The LLM (Gemini) is used for:**
- Initial question understanding (routing to the right precomputed answer)
- Scenario modeling (Question 5: "What if I raise prices?")
- Follow-up clarification

**The base profit numbers come from the calculation engine, not Gemini.** This gives us:
- Faster response times (no LLM latency for basic questions)
- Lower API costs (fewer Gemini calls)
- More reliable accuracy (deterministic calculations, not probabilistic LLM outputs)

---

## Chat UI Design

### Layout

- Clean, focused interface -- no dashboard sidebar (cut from original DataConcierge design)
- Chat area with welcome state
- Input bar at the bottom

### Welcome State

When a user first arrives after onboarding:
1. Display their profit number prominently: "Your profit this month: $X,XXX"
2. Show the gap: "That's on $XX,XXX in revenue"
3. Present the 5 killer questions as clickable suggested prompts

### Message Format

- User questions: right-aligned bubbles
- AI answers: left-aligned, with structured data (tables for product rankings, bullet points for breakdowns)
- Each answer includes a "confidence note" when data is incomplete (e.g., "Note: This estimate doesn't include COGS for 5 of your products. Enter costs to improve accuracy.")

### Conversation Behavior

- Conversation history stored in browser state (cleared on refresh)
- No persistent chat history in V1
- Session-scoped: each visit starts fresh with the latest precomputed data

---

## Success Metrics

### Activation

| Metric | Target | Measurement |
|--------|--------|------------|
| Time to first profit number | <3 minutes | Instrument onboarding flow (OAuth start -> first number displayed) |
| Activation rate | 60% see profit + click follow-up | Analytics event tracking |
| COGS entry completion | 80% of merchants enter costs for top products | Database check |

### Engagement

| Metric | Target | Measurement |
|--------|--------|------------|
| Weekly active users (beta) | 70% return weekly | Login/query logs |
| Questions per session | 3+ | Query logs |
| Weekly email digest open rate | 40%+ | Resend analytics |

### Business

| Metric | Target by Week 12 | Measurement |
|--------|-------------------|------------|
| MRR | $200+ | Stripe dashboard |
| Paying customers | 11+ | Stripe dashboard |
| App Store rating | 4.5+ stars | App Store |
| App Store reviews | 5-10 | App Store |
| Churn rate | <10%/mo | Monthly cohort tracking |
| Organic App Store installs | 20+/week | Shopify Partner dashboard |
