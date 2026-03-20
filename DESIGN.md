# Design System — ProfitSight

## Product Context
- **What this is:** Shopify profit tracking AI advisor — conversational interface that answers profit questions in plain English
- **Who it's for:** Solo Shopify merchants, $10K-$500K/mo revenue
- **Space/industry:** Shopify analytics / profit tracking (competitors: TrueProfit, ShopSense AI, BeProfit)
- **Project type:** Web app — dashboard + conversational AI chat + settings

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with Refined touches — function-first, trustworthy, approachable
- **Decoration level:** Intentional — subtle shadows, clean borders, no illustrations or gradients (except logo mark)
- **Mood:** "The smart friend who manages money well" — not cold corporate, not playful startup
- **Multi-theme:** 5 selectable themes, all sharing the same component structure but different color/font palettes
- **Default theme:** Classic (Shopify Native Elevated)

## Multi-Theme Architecture

All components use CSS custom properties. Themes are applied by setting variables on `:root` (or a `data-theme` attribute on `<html>`). Components never reference hardcoded colors — always `var(--color-name)`.

### Theme Provider Pattern

```tsx
// src/lib/theme.ts
export type ThemeId = 'classic' | 'midnight' | 'studio' | 'terminal' | 'heritage';

export const THEMES: Record<ThemeId, Theme> = { ... };

// Store preference: localStorage for instant load, DB for persistence
export function getTheme(): ThemeId {
  return (localStorage.getItem('profitsight-theme') as ThemeId) || 'classic';
}

export function setTheme(id: ThemeId) {
  localStorage.setItem('profitsight-theme', id);
  document.documentElement.setAttribute('data-theme', id);
}
```

```tsx
// src/components/theme-provider.tsx
'use client';
import { useEffect } from 'react';
import { getTheme, THEMES } from '@/lib/theme';

export function ThemeProvider({ children }) {
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }, []);
  return <>{children}</>;
}
```

### CSS Variable Contract

Every theme MUST define all of these variables. Components reference ONLY these variables.

```css
/* Background & Surface */
--bg                  /* Page background */
--bg-subtle           /* Subtle background (hover states, alternating rows) */
--surface             /* Card/panel background */
--surface-raised      /* Elevated surface (popovers, dropdowns) */

/* Border */
--border              /* Default border */
--border-light        /* Subtle border (between rows, sections) */

/* Text */
--text-primary        /* Headings, primary content */
--text-secondary      /* Supporting text, labels */
--text-tertiary       /* Placeholder, disabled, metadata */
--text-inverse        /* Text on colored backgrounds */

/* Brand */
--brand-primary       /* Primary action color, profit numbers */
--brand-primary-hover /* Hover state for primary */
--brand-primary-subtle /* Light tint for badges, backgrounds */
--brand-secondary     /* Secondary accent (headers, emphasis) */

/* Semantic */
--color-success       /* Positive margins, gains */
--color-success-subtle
--color-danger        /* Losses, negative margins */
--color-danger-subtle
--color-warning       /* Alerts, attention needed */
--color-warning-subtle
--color-info          /* Informational */
--color-info-subtle

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg

/* Font Families */
--font-display        /* Headlines, hero numbers */
--font-body           /* Body text, UI elements */
--font-mono           /* Code, technical display */

/* Border Radius */
--radius-sm           /* Small elements: badges, chips */
--radius-md           /* Buttons, inputs, small cards */
--radius-lg           /* Cards, panels */
--radius-xl           /* Large cards, modals */
--radius-full         /* Pills, avatars */
```

---

## Theme Definitions

### Theme 1: Classic (Default) — Shopify Native Elevated

**User-facing name:** Classic
**Vibe:** Clean, familiar, feels like Shopify admin but elevated

```css
[data-theme="classic"] {
  --bg: #F6F6F7;
  --bg-subtle: #EDEEEF;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --border: #E1E3E5;
  --border-light: #EDEEEF;

  --text-primary: #202223;
  --text-secondary: #6D7175;
  --text-tertiary: #8C9196;
  --text-inverse: #FFFFFF;

  --brand-primary: #008060;
  --brand-primary-hover: #006E52;
  --brand-primary-subtle: #E3F1DF;
  --brand-secondary: #1A3C34;

  --color-success: #008060;
  --color-success-subtle: #E3F1DF;
  --color-danger: #D72C0D;
  --color-danger-subtle: #FFF4F4;
  --color-warning: #B98900;
  --color-warning-subtle: #FFF8DB;
  --color-info: #005BD3;
  --color-info-subtle: #EBF3FF;

  --shadow-sm: 0 1px 0 rgba(0,0,0,0.04);
  --shadow-md: 0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.08);

  --font-display: 'General Sans', -apple-system, sans-serif;
  --font-body: 'General Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

**Font loading:** Fontshare CDN — `General Sans` (not on Google Fonts, use https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap)
**Logo mark:** Solid `--brand-primary` with rounded-lg

---

### Theme 2: Midnight — Deep Sky + Warm Glow

**User-facing name:** Midnight
**Vibe:** Premium fintech, Mercury-inspired, amber profit glow on navy

```css
[data-theme="midnight"] {
  --bg: #0A0E1A;
  --bg-subtle: #0F1425;
  --surface: #111827;
  --surface-raised: #1A2236;
  --border: #1E2A3F;
  --border-light: #161E30;

  --text-primary: #E2E8F0;
  --text-secondary: #7A8599;
  --text-tertiary: #4A5568;
  --text-inverse: #0A0E1A;

  --brand-primary: #E8A838;
  --brand-primary-hover: #D4943A;
  --brand-primary-subtle: rgba(232,168,56,0.15);
  --brand-secondary: #3B82F6;

  --color-success: #34D399;
  --color-success-subtle: rgba(52,211,153,0.1);
  --color-danger: #EF4444;
  --color-danger-subtle: rgba(239,68,68,0.1);
  --color-warning: #FBBF24;
  --color-warning-subtle: rgba(251,191,36,0.1);
  --color-info: #60A5FA;
  --color-info-subtle: rgba(96,165,250,0.1);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.4);
  --shadow-lg: 0 4px 20px rgba(0,0,0,0.5);

  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

**Font loading:** Google Fonts — `Instrument+Serif` + `Plus+Jakarta+Sans:wght@400;500;600;700`
**Logo mark:** Gradient `--brand-primary` to `#D4943A` with rounded-md
**Signature:** Amber profit numbers with subtle `text-shadow: 0 0 20px rgba(232,168,56,0.25)`

---

### Theme 3: Studio — White Canvas + Terracotta

**User-facing name:** Studio
**Vibe:** Bold and restrained, Brex-inspired, one warm accent on pure white

```css
[data-theme="studio"] {
  --bg: #FAFAFA;
  --bg-subtle: #F0F0F0;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --border: #E5E5E5;
  --border-light: #F0F0F0;

  --text-primary: #0A0A0A;
  --text-secondary: #737373;
  --text-tertiary: #A3A3A3;
  --text-inverse: #FFFFFF;

  --brand-primary: #D4634B;
  --brand-primary-hover: #BF5640;
  --brand-primary-subtle: #FDF2EF;
  --brand-secondary: #0A0A0A;

  --color-success: #16A34A;
  --color-success-subtle: #F0FFF4;
  --color-danger: #DC2626;
  --color-danger-subtle: #FFF5F5;
  --color-warning: #D97706;
  --color-warning-subtle: #FFFBEB;
  --color-info: #2563EB;
  --color-info-subtle: #EFF6FF;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.08);

  --font-display: 'Cabinet Grotesk', 'Satoshi', -apple-system, sans-serif;
  --font-body: 'Satoshi', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-full: 9999px;
}
```

**Font loading:** Fontshare CDN — `Cabinet Grotesk` + `Satoshi` (not on Google Fonts, use https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@400,500,700&display=swap)
**Logo mark:** Solid `--brand-primary` with rounded-md
**Signature:** Heavy `font-weight: 800` on display text, `letter-spacing: -0.03em`

---

### Theme 4: Terminal — Dark Precision + Neon Mint

**User-facing name:** Terminal
**Vibe:** Linear energy, Bloomberg terminal meets AI, surgical precision

```css
[data-theme="terminal"] {
  --bg: #0A0A0A;
  --bg-subtle: #111111;
  --surface: #141414;
  --surface-raised: #1C1C1C;
  --border: #262626;
  --border-light: #1A1A1A;

  --text-primary: #E5E5E5;
  --text-secondary: #6B6B6B;
  --text-tertiary: #444444;
  --text-inverse: #0A0A0A;

  --brand-primary: #00FFB2;
  --brand-primary-hover: #00E6A0;
  --brand-primary-subtle: rgba(0,255,178,0.1);
  --brand-secondary: #E5E5E5;

  --color-success: #00FFB2;
  --color-success-subtle: rgba(0,255,178,0.08);
  --color-danger: #FF4D4D;
  --color-danger-subtle: rgba(255,77,77,0.08);
  --color-warning: #FFD60A;
  --color-warning-subtle: rgba(255,214,10,0.08);
  --color-info: #4DA6FF;
  --color-info-subtle: rgba(77,166,255,0.08);

  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: 0 0 1px rgba(255,255,255,0.1);

  --font-display: 'Geist', -apple-system, sans-serif;
  --font-body: 'Geist', -apple-system, sans-serif;
  --font-mono: 'Geist Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;
  --radius-full: 9999px;
}
```

**Font loading:** Google Fonts — `Geist:wght@400;500;600;700` + `Geist+Mono:wght@400;500`
**Logo mark:** Solid `--brand-primary` with rounded-sm (sharp corners)
**Signature:** No shadows (borders only), tight spacing, monospace labels, lowercase UI text

---

### Theme 5: Heritage — Parchment + Sapphire

**User-facing name:** Heritage
**Vibe:** Warm paper, jewel blue, premium accounting firm with taste

```css
[data-theme="heritage"] {
  --bg: #F7F3ED;
  --bg-subtle: #EDE8DF;
  --surface: #FFFDF9;
  --surface-raised: #FFFFFF;
  --border: #E5DFD4;
  --border-light: #EDE8DF;

  --text-primary: #2D2A26;
  --text-secondary: #8C857A;
  --text-tertiary: #B5AFA5;
  --text-inverse: #FFFFFF;

  --brand-primary: #2843B2;
  --brand-primary-hover: #1E3599;
  --brand-primary-subtle: #EEF1FB;
  --brand-secondary: #1A1A1A;

  --color-success: #2E7D32;
  --color-success-subtle: #F1F8E9;
  --color-danger: #C62828;
  --color-danger-subtle: #FFF5F5;
  --color-warning: #E65100;
  --color-warning-subtle: #FFF8E1;
  --color-info: #1565C0;
  --color-info-subtle: #E8F0FE;

  --shadow-sm: 0 1px 3px rgba(45,42,38,0.04);
  --shadow-md: 0 2px 8px rgba(45,42,38,0.06);
  --shadow-lg: 0 4px 16px rgba(45,42,38,0.08);

  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Source Sans 3', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-full: 9999px;
}
```

**Font loading:** Google Fonts — `Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400` + `Source+Sans+3:wght@400;500;600;700`
**Logo mark:** Solid `--brand-primary` with rounded-md
**Signature:** Paper-grain background texture (SVG noise at 3% opacity), italic serif for emphasis
**Background texture CSS:**
```css
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
```

---

## Typography

### Scale (consistent across all themes)

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 40-48px | Per theme | Landing hero, page titles |
| `h1` | 28-32px | 600-700 | Section headers, dashboard title |
| `h2` | 22-26px | 600 | Card titles, subsections |
| `h3` | 18px | 600 | Metric labels (large), widget titles |
| `body` | 15px | 400 | Body text, chat messages |
| `body-sm` | 13px | 400-500 | Secondary text, table cells |
| `caption` | 11px | 600 | Labels, badges, overlines (uppercase + tracking) |
| `mono` | 13px | 400 | Code, SQL, technical display |

### Number Display Rules
- All monetary values: `font-variant-numeric: tabular-nums` — numbers must align in columns
- Profit numbers use `var(--brand-primary)` color (each theme makes this the signature)
- Loss numbers always use `var(--color-danger)`
- Large metric numbers (dashboard cards): `font-family: var(--font-display)` with `font-weight: 700`

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:**

| Token | Value | Use |
|-------|-------|-----|
| `2xs` | 2px | Inline spacing, icon gaps |
| `xs` | 4px | Tight element spacing |
| `sm` | 8px | Within components, chip padding |
| `md` | 16px | Default padding, card internal |
| `lg` | 24px | Card padding, section gaps |
| `xl` | 32px | Between cards in a grid |
| `2xl` | 48px | Section spacing |
| `3xl` | 64px | Page section breaks |

### Layout Rules
- Cards: `padding: var(--lg)` (24px)
- Card grids: `gap: var(--md)` (16px) on dense layouts, `gap: var(--lg)` (24px) on spacious
- Section spacing: `margin-bottom: var(--2xl)` (48px)
- Max content width: `1120px`
- Sidebar width: `260px` (collapsible on mobile)

---

## Layout

- **Approach:** Grid-disciplined
- **Breakpoints:** `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **Grid:** 12 columns at `lg+`, single column at `sm`
- **Max content width:** 1120px
- **Page structure:** Sidebar (260px, optional) + Main content area

---

## Motion

- **Approach:** Minimal-functional
- **Easing:** enter(`ease-out`) exit(`ease-in`) move(`ease-in-out`)
- **Duration:** micro(`100ms`) short(`150ms`) medium(`250ms`) long(`400ms`)
- **Transitions on:** hover states, focus rings, sidebar collapse, page transitions
- **Not used:** Bounce, spring physics, scroll-driven animation, parallax
- **Loading states:** Skeleton shimmer (gray pulsing blocks), not spinners
- **Special:** Profit number on first load uses a brief count-up animation (`400ms`)

---

## Component Patterns

### Buttons
```
Primary:   bg: var(--brand-primary), text: var(--text-inverse), hover: var(--brand-primary-hover)
Secondary: bg: var(--brand-secondary), text: var(--text-inverse)
Ghost:     bg: transparent, border: var(--border), text: var(--text-primary)
Danger:    bg: var(--color-danger), text: var(--text-inverse)
Sizes:     sm(6px 14px, 13px), md(10px 20px, 14px), lg(14px 28px, 15px)
Radius:    var(--radius-md)
```

### Cards
```
bg: var(--surface), border: 1px solid var(--border), radius: var(--radius-lg)
shadow: var(--shadow-sm)
padding: 24px
hover (if clickable): bg: var(--bg-subtle), cursor: pointer
```

### Inputs
```
bg: var(--bg), border: 1px solid var(--border), radius: var(--radius-md)
padding: 10px 14px, font-size: 14px
focus: border-color: var(--brand-primary), ring: 0 0 0 3px var(--brand-primary-subtle)
placeholder: var(--text-tertiary)
```

### Alerts
```
Success: bg: var(--color-success-subtle), border: var(--color-success), text: appropriate dark shade
Warning: bg: var(--color-warning-subtle), border: var(--color-warning)
Danger:  bg: var(--color-danger-subtle), border: var(--color-danger)
Info:    bg: var(--color-info-subtle), border: var(--color-info)
```

### Metric Cards
```
bg: var(--surface), border: 1px solid var(--border), radius: var(--radius-lg)
Label: caption style (11px, uppercase, tracking, var(--text-tertiary))
Value: display font, 28px, bold, tabular-nums
  - Profit value: var(--brand-primary)
  - Loss value: var(--color-danger)
Trend: 11px, var(--text-tertiary) or semantic color
```

### Chat Messages
```
User: bg: var(--brand-primary), text: var(--text-inverse), radius: 14px 14px 4px 14px
AI:   bg: var(--surface), border: 1px solid var(--border), radius: 14px 14px 14px 4px
  - Bold numbers: var(--brand-primary) color
  - Tables: standard table styling with var(--border)
  - Code: var(--font-mono), bg: var(--bg-subtle)
```

### Health Score Gauge
```
Circle: 72-88px, stroke: var(--brand-primary), background-stroke: var(--border)
Number: center, font-display, bold, var(--brand-primary)
Score ranges: 0-40 var(--color-danger), 41-70 var(--color-warning), 71-100 var(--brand-primary)
```

---

## Theme Switcher UI

Located in Settings page. Shows 5 cards in a row, each with:
- Theme name
- Small color palette preview (3-4 dots)
- "Active" indicator on current theme
- Click to switch (instant, no page reload)

Also: a small theme icon in the top-right header area (optional) for quick switching.

---

## Anti-Patterns (Never Do This)

- Purple/violet gradients as accent
- 3-column grid with icons in colored circles (generic SaaS slop)
- Centered everything with uniform spacing
- Uniform bubbly border-radius on all elements
- Gradient buttons as default CTA
- Stock photo hero sections
- Using `Inter`, `Roboto`, `Poppins`, or `Montserrat` as primary fonts
- Hardcoded color values in components (always use CSS variables)
- Different visual patterns for the same component type across pages

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Multi-theme system with 5 options | Founder wants personalization + distinctive brand. CSS variables make it near-zero cost. |
| 2026-03-20 | Classic (Shopify Native) as default | Most familiar for target users (Shopify merchants). Reduces friction on first use. |
| 2026-03-20 | Light theme for default, dark as options | Competitors split dark/light. Shopify admin itself is light. Follow the platform. |
| 2026-03-20 | No illustrations, no stock photos | Competitors use generic illustrations. Our differentiator is data and typography. |
| 2026-03-20 | Per-theme display fonts | Each theme has its own personality through typography. Classic=General Sans, Midnight=Instrument Serif, Studio=Cabinet Grotesk, Terminal=Geist, Heritage=Fraunces. |
