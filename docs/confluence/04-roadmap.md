# Roadmap

**Last updated:** 2026-03-19
**Status:** Approved
**Owner:** Chhayly Sreng (Solo Founder)
**Timeline:** 12 weeks, March 19 -- June 10, 2026

---

## Overview

8-week plan from idea to Shopify App Store launch, followed by 4 weeks of growth monitoring. Four distinct phases with three hard decision gates that will either validate the business or kill it.

| Phase | Weeks | Dates | Goal |
|-------|-------|-------|------|
| **DISCOVERY** | 1-2 | Mar 19 -- Apr 1 | Validate demand. 7+ merchants commit to beta. Choose a name. |
| **BUILD** | 3-5 | Apr 2 -- Apr 22 | Working product answering 5 questions for real Shopify stores. |
| **BETA** | 6-7 | Apr 23 -- May 6 | 10 merchants using product. 3+ actively returning. Pricing validated. |
| **LAUNCH** | 8 | May 7 -- May 13 | Public launch on Shopify App Store. First organic installs. Revenue. |
| *Growth monitoring* | 9-12 | May 14 -- Jun 10 | ASO optimization, content, influencer reviews. Gate 3 evaluation. |

---

## Phase 1: DISCOVERY (Weeks 1-2, March 19 -- April 1)

**Goal:** Validate demand. Get 7+ merchants to commit to beta. Choose a name.

### Week 1 (March 19-25): Outreach Blitz

| Day | Date | Tasks (3-4 hrs) | Output |
|-----|------|-----------------|--------|
| Wed | Mar 19 | Set up landing page (1-pager with email capture). Record 60-sec Loom demo using existing prototype with fake data. Join Shopify Community forums, r/shopify, r/ecommerce, 3 Facebook groups. | Landing page live, communities joined |
| Thu | Mar 20 | Post beta recruitment thread on Shopify Community forums (Apps section). Post value-first thread on r/shopify: "How do you actually track profit on Shopify?" | 2 forum posts live, 5-15 DMs/replies expected |
| Fri | Mar 21 | Post on r/SideProject, r/SaaS weekly feedback thread, r/smallbusiness promo thread. Respond to all Day 1 replies. | 3 more posts, 5-10 more responses |
| Sat | Mar 22 | Post in 3 Facebook groups (Shopify Entrepreneurs, Ecommerce Entrepreneurs, Shopify Store Owners). Value-first: post about the profit tracking problem, not the product. | Facebook presence established |
| Sun | Mar 23 | Rest / catch up on replies only | -- |
| Mon | Mar 24 | Follow up ALL conversations from Thu-Sat. Schedule calls with interested leads. Start CRM spreadsheet (Name, Contact, Source, Status, Qualified Y/N, Notes). | 8-12 qualified conversations in pipeline |
| Tue | Mar 25 | Conduct first 2-3 discovery calls (15 min each). Ask: "How do you track profit today? What takes the most time? Would you pay $19/mo for this?" Log insights. | First validation data |

**Week 1 Checkpoint (end of Tuesday March 25):**
- Fewer than 5 responses total? **Escalate:** cross-post to r/Entrepreneur, post on Indie Hackers, run a $50 Facebook ad targeting Shopify store owners.

### Week 2 (March 26 -- April 1): Close Commitments + Name

| Day | Date | Tasks (3-4 hrs) | Output |
|-----|------|-----------------|--------|
| Wed | Mar 26 | **Naming decision (2hr timebox).** Evaluate ClearProfit / ProfitPilot / ProfitChat / ProfitLens. Check domain availability, Shopify App Store conflicts, social handles. Pick one. ALSO: 2-3 more discovery calls. | Name chosen, domain purchased |
| Thu | Mar 27 | Direct email outreach: use BrandNav/Store Census to find 50 Shopify stores ($10K-$500K/mo, NOT already using TrueProfit). Send personalized emails. | 50 emails sent |
| Fri | Mar 28 | Continue discovery calls. Follow up all Reddit/Facebook/forum threads. Start blog post #1: "Why Shopify Shows Revenue But Not Profit." | 3-5 more calls completed, blog draft started |
| Sat | Mar 29 | Publish blog post #1 (SEO target: "shopify profit tracking"). Share on Reddit as genuine discussion post. | Blog live, SEO started |
| Sun | Mar 30 | Rest / catch up on replies only | -- |
| Mon | Mar 31 | Follow up all email outreach. Close final beta commitments. Finalize beta list. | Beta merchant list finalized |
| Tue | Apr 1 | **GATE 1 DECISION.** Count committed beta merchants. Update CRM. If proceeding, send "welcome to beta" emails with timeline. | Gate 1 verdict |

**Beta Merchant Qualification Criteria (accept if ALL met):**
1. Active Shopify store, $10K+/mo revenue
2. Willing to connect via Shopify OAuth
3. Will use the tool at least 1x/week for 4 weeks
4. Will do a 15-min feedback call at week 2 and week 4 of beta
5. NOT a competing app developer

---

### DECISION GATE 1 -- April 1, 2026

| Result | Action |
|--------|--------|
| **7+ committed beta merchants** | PROCEED to build phase |
| **4-6 committed** | Extend discovery 1 more week. Run $50 Facebook ad. Post on Indie Hackers. |
| **0-3 committed** | **STOP.** The market signal is too weak. Reassess the entire approach before writing any code. |

**What "committed" means:** They said yes to connecting their Shopify store, agreed to weekly usage and feedback calls, and responded to the "welcome to beta" email.

---

## Phase 2: BUILD (Weeks 3-5, April 2-22)

**Goal:** Working product that answers the 5 questions for real Shopify stores.

**Founder time split:** 80% build, 20% community engagement (stay warm in forums, reply to threads, maintain beta merchant relationships).

### Week 3 (April 2-8): Foundation

- Shopify OAuth integration (Partner account setup, app registration, OAuth flow)
- Shopify API data sync: orders, products, refunds, transactions
- COGS manual entry form (per-product cost input)
- Database schema for Shopify data (extend existing Neon DB)
- Write blog post #2: "The Hidden Costs Shopify Doesn't Show You" (SEO: "shopify hidden costs")
- Publish comparison blog post: "TrueProfit vs Spreadsheets vs [Our App]" (SEO: "trueprofit alternative") -- highest-intent keyword, write it NOW

### Week 4 (April 9-15): Profit Engine

- Profit calculation engine (Revenue - COGS - Shopify fees - shipping - returns - ad spend)
- Precomputed answer cache for all 5 questions
- Chat UI refactored from generic to profit-focused (suggested questions = the 5 killers)
- Build the "What's Eating Your Profit?" calculator (lead magnet + SEO asset)
- Gate the detailed breakdown behind email capture; show top-line number free

### Week 5 (April 16-22): Polish + Beta Prep

- End-to-end testing with real Shopify test store data
- Onboarding flow: OAuth connect -> COGS entry -> first profit number (target: under 3 minutes)
- Error handling, loading states, edge cases (no orders, missing COGS, etc.)
- Stripe billing integration ($19/mo, with free beta period)
- Weekly email digest via Resend + Vercel Cron
- Pitch 3 YouTube/podcast creators: Curious Themes, Product Powerhouse, Ecommerce Coffee Break -- give them early access for honest review
- App Store listing draft: name, icon, screenshots, keywords, description (do NOT wait until Week 8)

---

## Phase 3: BETA (Weeks 6-7, April 23 -- May 6)

**Goal:** 10 merchants using the product. 3+ actively returning. Pricing validated.

**Founder time split:** 40% product fixes, 30% merchant support/calls, 20% content, 10% admin.

### Week 6 (April 23-29): Onboard Beta Merchants

- Onboard all 10 beta merchants (stagger: 3 on Day 1, 3 on Day 2, 4 on Day 3)
- Monitor every session: where they get stuck, what questions they ask that the app can't answer, how long until they see their profit number
- Daily check-ins with first 3 merchants (quick Slack/email: "How's it going? Anything confusing?")
- Fix critical bugs same-day
- Start collecting Shopify App Store reviews from merchants who had good experiences
- Publish blog post: "I Talked to 10 Shopify Store Owners About Profit. Here's What I Learned."
- Begin App Store submission process (review takes 3-7 business days)

### Week 7 (April 30 -- May 6): Validate + Iterate

- Week 2 feedback calls with all beta merchants (15 min each)
- Key questions: "Would you pay $19/mo for this? What's missing? Would you recommend it to another store owner?"
- Pricing conversation: gauge reaction to $19/mo vs $29/mo
- Iterate on top 3 feedback items
- Finalize App Store listing (screenshots with real UI, video walkthrough)
- Write case study: "How [Beta Store] Discovered They Were Losing $X/Month on [Category]"
- Confirm influencer review timing (aim for reviews to publish Week 8-9)

---

### DECISION GATE 2 -- May 6, 2026

| Result | Action |
|--------|--------|
| **3+ active beta users** (used it 2+ times in the last week) **AND** positive pricing signal | PROCEED to launch |
| **1-2 active users**, mixed pricing feedback | Extend beta 2 weeks. Dig into why others churned. |
| **0 active users** or strong pricing resistance | **STOP.** Product-market fit is not there. Pivot or kill. |

**What "active" means:** Logged in and asked at least 2 questions in the past 7 days.

**What "positive pricing signal" means:** At least 2 merchants say they would pay $19/mo, or 1 merchant says they would pay $29/mo.

---

## Phase 4: LAUNCH (Week 8, May 7-13)

**Goal:** Public launch on Shopify App Store. First organic installs. Revenue starts.

### Week 8 (May 7-13): Go Live

- App Store goes live (should be approved by now; if not, follow up with Shopify)
- Notify all beta merchants to install via App Store (boosts install count)
- Convert beta merchants to paid ($19/mo, grandfathered for life)
- Launch announcement posts:
  - r/shopify, r/ecommerce, r/SideProject -- frame as founder story, not ad
  - Indie Hackers launch story with revenue/progress update
  - Shopify Community forums
  - All 3 Facebook groups
- Email waitlist (built from calculator lead magnet + beta recruitment)
- Publish influencer reviews (coordinate with Curious Themes, Product Powerhouse, Ecommerce Coffee Break)
- Do NOT launch on Product Hunt (Shopify merchants are not there)
- Monitor App Store reviews. Respond to every single one within 24 hours.

---

### DECISION GATE 3 -- June 10, 2026 (End of Week 12)

| Result | Action |
|--------|--------|
| **$200+ MRR** (11+ paying customers at $19/mo) | **INVEST.** Double down on ASO, content, and influencer partnerships. |
| **$50-$200 MRR** with positive trajectory | **CONTINUE** with caution. Identify the bottleneck (acquisition? activation? retention?) and fix it. |
| **<$50 MRR** after 4 weeks live | **KILL or PIVOT.** The market has spoken. |

---

## Jira Integration

Project tracking is managed in Jira under the **PDM** project.

### Epic Structure

| Epic Key | Epic Name | Phase | Weeks |
|----------|-----------|-------|-------|
| PDM-4 | Customer Discovery & Validation | Phase 1: Discovery | 1-2 |
| PDM-5 | Core Product Build | Phase 2: Build | 3-5 |
| PDM-6 | Beta Testing & Iteration | Phase 3: Beta | 6-7 |
| PDM-7 | Shopify App Store Launch | Phase 4: Launch | 8 |

### Task Breakdown (13 Week 1-2 Tasks)

Tasks for Weeks 1-2 are fully scoped in Jira under epic PDM-4 (Customer Discovery & Validation). These cover the outreach blitz, community engagement, discovery calls, CRM setup, naming decision, direct email outreach, blog content, and Gate 1 evaluation.

Build, Beta, and Launch phase tasks will be created upon passing each preceding gate.

---

## Weekly Time Allocation by Phase

### Weeks 1-2 (Discovery)

| Activity | % of Time | ~Hours/Week |
|----------|----------|-------------|
| Outreach + community engagement | 40% | 10h |
| Discovery calls | 25% | 6h |
| Content creation (blog, landing page) | 20% | 5h |
| Admin (CRM, follow-ups, planning) | 15% | 4h |

### Weeks 3-5 (Build)

| Activity | % of Time | ~Hours/Week |
|----------|----------|-------------|
| Product development | 80% | 20h |
| Community engagement (stay warm) | 10% | 2.5h |
| Content (blog posts, calculator) | 10% | 2.5h |

### Weeks 6-7 (Beta)

| Activity | % of Time | ~Hours/Week |
|----------|----------|-------------|
| Product fixes + iteration | 40% | 10h |
| Merchant support + feedback calls | 30% | 7.5h |
| Content + influencer outreach | 20% | 5h |
| Admin | 10% | 2.5h |

### Week 8 (Launch)

| Activity | % of Time | ~Hours/Week |
|----------|----------|-------------|
| Launch execution + monitoring | 50% | 12.5h |
| Content + community posts | 25% | 6h |
| Merchant support | 15% | 4h |
| Admin | 10% | 2.5h |

---

## Quick Reference Calendar

| Week | Dates | Phase | Key Deliverable | Gate? |
|------|-------|-------|----------------|-------|
| 1 | Mar 19-25 | Discovery | Outreach blitz, 8-12 conversations | -- |
| 2 | Mar 26-Apr 1 | Discovery | Close 10 beta commitments, choose name | **GATE 1:** 7+ committed? |
| 3 | Apr 2-8 | Build | Shopify OAuth, data sync, COGS form | -- |
| 4 | Apr 9-15 | Build | Profit engine, precompute cache, chat UI | -- |
| 5 | Apr 16-22 | Build | E2E testing, onboarding flow, billing, influencer outreach | -- |
| 6 | Apr 23-29 | Beta | Onboard 10 merchants, start App Store submission | -- |
| 7 | Apr 30-May 6 | Beta | Feedback calls, iterate, finalize App Store listing | **GATE 2:** 3+ active? |
| 8 | May 7-13 | Launch | App Store live, launch announcements, first revenue | -- |
| 9-12 | May 14-Jun 10 | Growth | ASO optimization, content, influencer reviews | **GATE 3:** $200+ MRR? |

---

## Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | Can't find 10 beta merchants in 2 weeks | Medium | High (blocks everything) | Escalation: Facebook ads ($50), Indie Hackers, r/Entrepreneur. If stuck after 3 weeks, problem may not be painful enough. |
| 2 | Shopify OAuth / API complexity | Medium | High (blocks build) | Start with simplest OAuth scope. Use Shopify Node.js library. Budget 5 days, not 2. Upwork backup ($2hr). |
| 3 | Profit calculation accuracy | Medium | High (trust killer) | Start with 3 most reliable data sources. Show "estimated" label. Never show a number you can't explain. |
| 4 | Distribution is the #1 overall risk | High | Critical | App Store ASO is long-term play. Short-term: organic community + 3 influencer deals. Calculator lead magnet builds email list. |
| 5 | Solo founder capacity (3-4 hrs/day) | High | Medium | Ruthless scope control. The 5 questions are the ONLY V1 scope. Nothing else. |
| 6 | TrueProfit copies conversational approach | Low | Medium | Speed advantage: 8-week launch vs their months. Their incentive is to defend the dashboard. |
| 7 | Shopify App Store rejection | Low | High (delays launch) | Submit early (Week 6). Follow all listing guidelines. Budget 3-7 days for review. |
| 8 | Merchants don't enter COGS data | Medium | High (garbage in/out) | Dead simple entry UX. Bulk CSV. Show profit gap with/without COGS. Default to Shopify cost field. |
