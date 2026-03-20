# Strategic Direction

**Last updated:** 2026-03-19
**Status:** Approved
**Owner:** Chhayly Sreng (Solo Founder)

---

## The Pivot: From Generic Data Chat to Shopify Profit Advisor

### Where We Started

DataConcierge began as a generic "ask your data anything" AI assistant for small businesses. The original vision was broad: any business, any data source, any question. Clients would email spreadsheets and CSVs, a founder would manually ingest them via Python scripts, and clients would get a chat interface to query their data in plain English.

The product worked technically -- deployed on Vercel with Neon PostgreSQL, Gemini API integration, SQL safety layers, and a functional chat interface. But the positioning had a fatal flaw: **"ask your data anything" has no distribution channel.** There is no community where generic data querying is a burning topic. There is no App Store for it. There is no keyword people search for.

### Why We Pivoted

Three converging signals forced the pivot:

1. **No distribution path.** LinkedIn outreach and Upwork gigs were the primary acquisition channels. Unit economics don't work at $49/mo when you're cold-DMing people one at a time.
2. **Shopify has a specific, painful, underserved problem.** Shopify shows revenue but not real profit. COGS, ad spend, shipping costs, transaction fees, returns -- none of it is automatically tracked. Every Shopify merchant knows this pain.
3. **A ready-made distribution channel exists.** The Shopify App Store drives 70% of app downloads via search. Reddit (r/shopify: 274K members, r/ecommerce: 177K) and YouTube influencers provide organic reach. The audience is concentrated and reachable.

### What Changed

| Dimension | Before (DataConcierge) | After (Profit Advisor) |
|-----------|----------------------|----------------------|
| Positioning | "Ask your data anything" | "Know your real profit without the spreadsheet" |
| Target user | Any small business owner | Solo Shopify merchants, $10K-$500K/mo revenue |
| Data source | Manual CSV/Excel ingestion | Shopify API via OAuth (self-serve) |
| Value prop | General business intelligence | 5 specific, high-value profit questions |
| Price point | $49-99/mo (manual onboarding) | $19/mo launch, $29/mo standard |
| Distribution | LinkedIn DMs, Upwork, cold outreach | Shopify App Store, Reddit, YouTube influencers |
| Onboarding | Founder runs Python scripts per client | Automated: OAuth connect, 3 minutes to value |
| Auth | Password per client | Shopify OAuth (self-serve) |

---

## Current Positioning

**One-line:** "Know your real profit without the spreadsheet."

We are NOT "ask your data anything." We are a focused profit advisor that answers 5 killer questions. The positioning is deliberately narrow because narrow positioning has distribution (App Store keywords, Reddit threads about profit tracking) while broad positioning does not.

---

## The 5 Killer Questions (V1 Scope)

These are the only questions V1 answers. Everything else is V1.1 or later.

| # | Question | Why It Matters |
|---|----------|---------------|
| 1 | "What's my real profit this month?" | **The hook / aha moment.** The gap between Shopify-reported revenue and real profit is the emotional trigger. E.g., "$47K revenue, but only $8K profit after all costs." |
| 2 | "Which products are actually making me money?" | **Behavior-changing insight.** Merchants often don't know which SKUs are profitable after shipping, returns, and fees. |
| 3 | "How much did I spend on ads vs. what they brought in?" | **True ROAS.** Shopify can't combine ad spend (Meta, Google) with order attribution in a single view. |
| 4 | "What are my margins by order channel/source?" | **Channel profitability.** Helps merchants decide where to invest marketing dollars. |
| 5 | "What happens to my profit if I raise prices by $X?" | **Scenario modeling.** Forward-looking, not just rearview mirror. This is where the LLM earns its keep. |

---

## Competitive Positioning

### Direct Competitor: TrueProfit

| Dimension | TrueProfit | Us |
|-----------|-----------|-----|
| Price | $35/mo | $19/mo (launch), $29/mo (standard) |
| Reviews | 540+ (established) | 0 (launching) |
| UX model | Dashboard with charts and tables | Conversational AI -- ask questions, get answers |
| Approach | Rearview mirror (shows what happened) | Co-pilot (tells you what to do about it) |
| Scenario modeling | No | Yes (Question 5) |
| Setup time | 10-15 minutes | Under 3 minutes to first profit number |

### Wider Competitive Landscape

| Competitor | Price | Focus | Why We're Different |
|-----------|-------|-------|-------------------|
| TrueProfit | $35/mo | Profit dashboards | We're conversational + cheaper |
| Triple Whale | $100-500+/mo | Ad attribution | Built for stores spending $10K+/mo on ads; we serve the $10K-$500K revenue tier |
| Lifetimely | $50-150/mo | Customer LTV | Single metric; we cover 5 profit dimensions |
| Spreadsheets | Free | Everything | Painful, manual, error-prone, no one maintains them |
| Shopify Analytics | Free (built-in) | Revenue/traffic | Doesn't show profit, broken attribution, no COGS |

### Competitive Response Risk

**Will TrueProfit copy the conversational approach?** Unlikely in the near term. They have a 540-review dashboard product to protect. Their incentive is to defend the dashboard paradigm, not pivot to conversation. We launch in 8 weeks; they would need months to rebuild.

---

## Year 1 / Year 2 Vision

### Year 1: Know Your Profit

The product answers the 5 killer questions accurately and fast. The aha moment is the gap between Shopify revenue and real profit. Value proposition is simple: connect your store, see your real numbers, stop guessing.

**Year 1 moat:** COGS data. Shopify doesn't store cost of goods sold. Once a merchant enters COGS into our system, that data doesn't exist anywhere else and doesn't export. Combined with conversational question logs that reveal what metrics actually matter to merchants.

### Year 2: Profit Autopilot

The product becomes proactive. Instead of waiting for merchants to ask questions, it tells them what they need to know:

- "Your shipping costs spiked 23% this week -- here's why"
- "This product's margin dropped below 10% -- consider raising the price"
- "Stores your size average 18% margin -- you're at 12%"
- Peer benchmarks from aggregated, anonymized data across the merchant base

**Year 2 moat:** Aggregated anonymized benchmark data. The more merchants use the product, the better the benchmarks become. This is a network effect that compounds over time.

---

## Key Strategic Decisions (Decision Log)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-19 | Pivot from generic data chat to Shopify profit advisor | Generic positioning has no distribution. Profit is a specific, painful, underserved problem with a ready-made App Store channel. |
| 2026-03-19 | Price at $19/mo, not $49-99/mo | Undercut TrueProfit ($35/mo). Lower barrier to impulse install. Need 53 customers for $1K MRR instead of 21. |
| 2026-03-19 | Deprioritize LinkedIn, prioritize Reddit + YouTube + Shopify forums | Shopify merchants are not on LinkedIn. Reddit and YouTube are where they actually spend time and ask for help. |
| 2026-03-19 | Precompute answers instead of LLM on every query | Faster response time, lower API costs, more reliable accuracy. LLM only for scenario modeling and follow-ups. |
| 2026-03-19 | Skip Product Hunt at launch | Shopify merchants are not on Product Hunt. Revisit only if expanding beyond Shopify. |
| 2026-03-19 | Skip Built for Shopify badge at launch | Engineering effort is significant. Focus on getting approved and live first. BFS is a Month 2-3 goal. |
| 2026-03-19 | 3 hard decision gates with kill criteria | Solo founder can't afford to build for months without validation signals. Gates force honesty about product-market fit. |

---

## What Is Explicitly NOT in V1

These are intentional cuts. Do not build any of these before Gate 3 (Week 12, June 10).

- General NLP / "ask anything" -- we answer 5 questions, not infinite questions
- Dashboards or charts -- text answers only, no Recharts, no D3, no visualizations
- Ad platform API integrations (Meta, Google) -- ad spend is manual entry in V1
- Inventory management / restock alerts
- Multi-store support -- one store per account
- Accounting or tax calculations
- POS / in-store data
- Mobile app -- web only, responsive design
- Team / multi-user accounts
- Benchmarking against other merchants -- Year 2 moat, not V1
- Proactive alerts ("your margin dropped this week") -- Year 2
- Product Hunt launch
- LinkedIn marketing
- Built for Shopify badge (Month 2-3 goal)
- Upwork / Fiverr client acquisition (unit economics don't work at $19/mo)
