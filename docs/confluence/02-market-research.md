# Market Research

**Last updated:** 2026-03-19
**Status:** Approved
**Owner:** Chhayly Sreng (Solo Founder)

---

## Shopify Merchant Pain Points

Shopify's built-in analytics fail small store owners ($10K-$500K/mo revenue) in five critical areas:

### 1. No Profit Visibility

Shopify shows revenue, not profit. The platform has no native way to calculate:
- Cost of goods sold (COGS) per product
- Net profit after all fees, shipping, returns, and ad spend
- True margin by product, channel, or time period

**The aha moment we're building around:** The gap between Shopify-reported revenue and real profit. Example: "$47K revenue, but only $8K profit after all costs." Every merchant suspects this gap exists but most can't quantify it.

### 2. Broken Attribution

Up to 40% of traffic shows as "Direct" in Shopify analytics. Store owners can't tell which marketing channels actually drive sales. This means:
- They can't calculate true return on ad spend (ROAS)
- Marketing budget allocation is guesswork
- They don't know which channels to double down on or cut

### 3. No Customer Intelligence

Shopify provides no:
- Cohort analysis
- RFM (Recency, Frequency, Monetary) segmentation
- Lifetime value calculations
- "Who bought once and never came back?" queries
- Repeat purchase rate tracking

### 4. Data Silos

Shopify can't combine:
- Ad spend from Meta and Google
- Payment data from Stripe
- Shipping costs from carriers
- Accounting data from QuickBooks

Each system lives in its own silo. Getting a unified view requires manual spreadsheet work.

### 5. Data Lag

1-24 hour delay on analytics during critical moments like flash sales, product launches, or Black Friday. When merchants most need real-time data, Shopify can't provide it.

---

## Shopify App Ecosystem Overview

### Scale of the Marketplace

The Shopify App Store hosts approximately **903 apps in the Analytics category** (as referenced in market research). This is a mature but active category with room for differentiated products.

### Key Insight: Dashboard Fatigue

The vast majority of analytics apps follow the same pattern: dashboards with charts and tables. Merchants need to learn a new interface, understand what the charts mean, and figure out what to do about it. This is "rearview mirror" analytics -- it shows what happened but doesn't tell you what to do.

Our conversational approach is differentiated: merchants ask questions in plain English and get direct answers with recommended actions.

---

## Pricing Landscape

### Competitor Pricing Tiers

| App | Price Range | Target Merchant | Focus Area |
|-----|-----------|----------------|------------|
| **TrueProfit** | $35/mo | Solo merchants, SMBs | Profit tracking dashboards |
| **Triple Whale** | $100-500+/mo | DTC brands spending $10K+/mo on ads | Ad attribution, pixel tracking |
| **Lifetimely** | $50-150/mo | Subscription/DTC brands | Customer lifetime value |
| **BeProfit** | $25-75/mo | Small-mid merchants | Profit dashboards |
| **OrderMetrics** | $30-100/mo | Growing stores | Order-level P&L |
| **Custom BI (Tableau, Looker)** | $1,000+/mo + analyst salary | Enterprise | Everything |
| **Hiring a data analyst** | $3,000-5,000/mo | Funded startups | Custom analysis |

### Our Pricing Strategy

| Tier | Price | Rationale |
|------|-------|-----------|
| **Launch (beta users)** | $19/mo (locked for life) | Undercut TrueProfit by 46%. Low enough for impulse install. Beta users become evangelists. |
| **Standard (post-launch)** | $29/mo | Still cheaper than TrueProfit ($35/mo) while increasing ARPU. |
| **Target for $1K MRR** | 53 customers at $19/mo | Achievable milestone within first 3 months if product-market fit exists. |

### Pricing Gap We Exploit

There is a clear gap between "free but useless" (Shopify built-in) and "powerful but expensive" (Triple Whale at $100+/mo). Our position:

```
Free          $19/mo          $35/mo         $100-500/mo
Shopify  -->  [US]  -->  TrueProfit  -->  Triple Whale
(useless)     (focused)   (dashboard)      (enterprise)
```

---

## Shopify Sidekick Gaps

Shopify's own AI assistant (Sidekick) is positioned as a general-purpose store helper. Key limitations that create our opportunity:

1. **No COGS integration.** Sidekick can't calculate profit because Shopify doesn't store cost of goods sold.
2. **No cross-platform data.** Sidekick can't pull in ad spend from Meta/Google or shipping costs from carriers.
3. **Surface-level analytics.** Sidekick answers basic questions about orders and traffic but can't do multi-variable profit analysis.
4. **No scenario modeling.** Sidekick can't answer "what happens to my profit if I raise prices by $5?"
5. **Shopify's incentive misalignment.** Shopify benefits from merchants spending more (higher GMV = higher Shopify revenue). A tool that shows merchants their true costs might discourage spending. Shopify is unlikely to build a brutally honest profit tool.

---

## Merchant Spending Patterns

### Who Spends on Analytics Apps

Based on market research and community observation:

| Merchant Revenue | Analytics Spend Tolerance | Behavior |
|-----------------|-------------------------|----------|
| $0-$5K/mo | $0 (free tools only) | Not our target. Can't afford $19/mo. |
| **$5K-$50K/mo** | $15-50/mo | **Sweet spot.** Know they need data, can't afford Triple Whale. |
| **$50K-$500K/mo** | $30-150/mo | **Premium tier.** Will pay more for accuracy. May already use TrueProfit. |
| $500K+/mo | $100-500+/mo | Using Triple Whale or custom solutions. Not our V1 target. |

### What Merchants Actually Pay For

From Reddit threads, Shopify Community forums, and app reviews, merchants pay for tools that:

1. **Save time** -- "This used to take me 2 hours in Excel"
2. **Reveal hidden costs** -- "I didn't know Shopify fees were eating 8% of my revenue"
3. **Are dead simple** -- "I installed it and got my answer in 2 minutes"
4. **Provide specific answers** -- Not "here's a dashboard," but "your profit this month is $X"

Merchants churn from tools that:
- Require complex setup or configuration
- Show charts without explaining what they mean
- Don't account for all costs (giving false profit numbers)
- Have steep learning curves

---

## Community Size and Engagement

### Reddit

| Subreddit | Members | Relevance |
|-----------|---------|-----------|
| r/shopify | 274K | Primary target. Active discussions about analytics pain. |
| r/ecommerce | 177K | Broader e-commerce audience. Cross-platform merchants. |
| r/smallbusiness | 2.2M | Large audience. Shopify merchants present but not dominant. |
| r/SideProject | -- | Good for founder story / "I built..." posts |
| r/SaaS | -- | Feedback threads, weekly promo threads |
| r/Entrepreneur | -- | Backup if primary channels underperform |

### Facebook Groups

| Group | Relevance |
|-------|-----------|
| Shopify Entrepreneurs | Direct target audience |
| Ecommerce Entrepreneurs | Broader but relevant |
| Shopify Store Owners | Active community |

### Shopify Community Forums

The highest-concentration venue for active Shopify merchants. App-related discussions are common. Beta recruitment starts here.

### YouTube / Podcast Influencers

| Creator | Platform | Audience Size | Relevance |
|---------|----------|--------------|-----------|
| Curious Themes (Elle McCann) | YouTube | ~33K subscribers | Shopify app reviews, tutorials |
| Product Powerhouse (Erin Alexander) | YouTube/Podcast | Growing audience | Shopify app ecosystem |
| Ecommerce Coffee Break (Claus Lauter) | Podcast | ~23K listeners | E-commerce tools, interviews |

---

## Search Volume and SEO Opportunity

### High-Intent Keywords

| Keyword | Intent | Competition |
|---------|--------|------------|
| "shopify profit tracking" | Direct product search | Medium -- TrueProfit ranks #1 |
| "shopify hidden costs" | Problem-aware search | Low-medium -- content opportunity |
| "trueprofit alternative" | Competitor comparison | Low -- we can own this |
| "shopify profit calculator" | Tool search | Medium -- lead magnet opportunity |
| "how to calculate profit shopify" | Educational | Low -- blog content opportunity |
| "shopify COGS tracking" | Specific pain point | Low -- niche but high intent |

### Content-SEO Strategy

5 blog posts planned across the 8-week launch period, each targeting a specific keyword:

1. "Why Shopify Shows Revenue But Not Profit" (Week 2)
2. "The Hidden Costs Shopify Doesn't Show You" (Week 3)
3. "TrueProfit vs Spreadsheets vs [Our App]" (Week 3) -- highest-intent keyword
4. "I Talked to 10 Shopify Store Owners About Profit" (Week 5)
5. Case study from beta (Week 7)

---

## Key Market Insights Summary

| Insight | Implication |
|---------|------------|
| 903 analytics apps on Shopify App Store | Market is active but saturated with dashboards -- conversational approach is differentiated |
| TrueProfit at $35/mo with 540+ reviews | Established competitor but vulnerable on price and UX model |
| 70% of Shopify app installs come from App Store search | ASO (App Store Optimization) is the #1 growth lever post-launch |
| Merchants tolerate $15-50/mo for analytics | $19/mo is in the impulse-install zone |
| Shopify has no native profit calculation | Structural gap that Shopify is unlikely to fill |
| COGS data doesn't exist in Shopify | Creates lock-in once merchants enter it into our system |
| Reddit + YouTube are where Shopify merchants spend time | LinkedIn and Product Hunt are not relevant channels |
