import Link from 'next/link';

// ── Logo mark shared between nav and footer ──────────────────────────────────
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
        borderRadius: 'var(--radius-md)',
        flexShrink: 0,
      }}
    />
  );
}

// ── Navigation Bar ───────────────────────────────────────────────────────────
function NavBar() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={28} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            ProfitSight
          </span>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/demo/snapshot"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Try Demo
          </Link>
          <Link
            href="/connect"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-inverse)',
              background: 'var(--brand-primary)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Connect Store
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero Section ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      style={{
        padding: '96px 24px',
        textAlign: 'center',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 52px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Know your real Shopify profit.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--brand-primary)',
            margin: '8px 0 0',
          }}
        >
          Not revenue. Profit.
        </p>

        <p
          style={{
            marginTop: 28,
            fontSize: 17,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          ProfitSight connects to your store and answers your profit questions in plain
          English. No spreadsheets. No 30-minute setup.
        </p>

        {/* CTA buttons */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <Link
            href="/connect"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-inverse)',
              background: 'var(--brand-primary)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              border: '1px solid transparent',
            }}
          >
            Connect Your Store — Free
          </Link>
          <Link
            href="/demo/snapshot"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            Try the Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Value Props ──────────────────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    icon: '💰',
    title: 'Real Profit, Not Revenue',
    description:
      'See your actual take-home after COGS, ads, Shopify fees, and shipping.',
  },
  {
    icon: '💬',
    title: 'Ask, Don\'t Calculate',
    description:
      "Type 'Which products lose money?' and get the answer. No dashboards to learn.",
  },
  {
    icon: '⚡',
    title: '60-Second Setup',
    description:
      'Connect Shopify. We pull your data. You see profit instantly.',
  },
];

function ValueProps() {
  return (
    <section
      style={{
        padding: '0 24px 80px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {VALUE_PROPS.map((prop) => (
          <div
            key={prop.title}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 16 }}>{prop.icon}</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 10px',
              }}
            >
              {prop.title}
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              {prop.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 5 Killer Questions ───────────────────────────────────────────────────────
const KILLER_QUESTIONS = [
  {
    question: "What's my real profit this month?",
    answer: 'Your net profit is $4,230 after all costs.',
  },
  {
    question: 'Which products are actually making me money?',
    answer: 'Your top 3 products account for 78% of net profit.',
  },
  {
    question: 'How much did I spend on ads vs. what they brought in?',
    answer: 'Your ad ROAS is 2.4x — you spent $1,800 and earned $4,320.',
  },
  {
    question: "What are my margins by order channel?",
    answer: 'Organic orders average 38% margin vs. 19% for paid traffic.',
  },
  {
    question: 'What happens to my profit if I raise prices by $5?',
    answer: 'At current volume, a $5 price increase adds ~$2,100/month.',
  },
];

function KillerQuestions() {
  return (
    <section
      style={{
        padding: '80px 24px',
        background: 'var(--bg-subtle)',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: 12,
            letterSpacing: '-0.015em',
          }}
        >
          ProfitSight answers the 5 questions every store owner asks
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: 16,
            marginBottom: 48,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Stop digging through reports. Just ask.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {KILLER_QUESTIONS.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 28px',
                boxShadow: 'var(--shadow-sm)',
                gridColumn: i === 4 ? '1 / -1' : undefined,
                maxWidth: i === 4 ? 520 : undefined,
                marginLeft: i === 4 ? 'auto' : undefined,
                marginRight: i === 4 ? 'auto' : undefined,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 10px',
                  lineHeight: 1.4,
                }}
              >
                {item.question}
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                  paddingLeft: 12,
                  borderLeft: '3px solid var(--brand-primary-subtle)',
                }}
              >
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing Section ──────────────────────────────────────────────────────────
const PRICING_FEATURES = [
  'Unlimited questions',
  'All 5 profit reports',
  'Shopify sync',
  'Ad spend tracking',
];

function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: '80px 24px',
        background: 'var(--bg)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '48px 40px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Crossed-out original price */}
          <p
            style={{
              fontSize: 18,
              color: 'var(--text-tertiary)',
              textDecoration: 'line-through',
              margin: '0 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            $29/mo
          </p>

          {/* Launch price */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: 4,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--brand-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
              }}
            >
              $19
            </span>
            <span
              style={{
                fontSize: 18,
                color: 'var(--text-secondary)',
                alignSelf: 'flex-end',
                paddingBottom: 10,
              }}
            >
              /mo
            </span>
          </div>

          <p
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              marginBottom: 32,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            Launch pricing — limited time
          </p>

          {/* Feature list */}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {PRICING_FEATURES.map((feature) => (
              <li
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 11,
                    color: 'var(--brand-primary)',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/connect"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-inverse)',
              background: 'var(--brand-primary)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              border: '1px solid transparent',
            }}
          >
            Start Free — Connect Your Store
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        padding: '48px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoMark size={22} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--text-tertiary)',
            }}
          >
            ProfitSight
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-tertiary)',
            margin: 0,
          }}
        >
          Built by a merchant, for merchants.
        </p>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main>
      <NavBar />
      <Hero />
      <ValueProps />
      <KillerQuestions />
      <Pricing />
      <Footer />
    </main>
  );
}
