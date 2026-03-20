'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ChatArea from '@/components/chat-area';
import type { ChatAreaHandle } from '@/components/chat-area';

// ── Types ────────────────────────────────────────────────────────────────────

interface SnapshotData {
  healthScore: number;
  netProfit: number;
  margin: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  "What's my real profit?",
  'Which products make money?',
  'Am I wasting ad spend?',
  'Margins by channel?',
  'What if I raise prices?',
];

const SUGGESTED_QUESTIONS = [
  "What's my real profit this month?",
  'Which products are actually making me money?',
  'How much did I spend on ads vs. what they brought in?',
  'What are my margins by order channel?',
  'What happens to my profit if I raise prices by $5?',
];

// ── Mini Health Score Circle ─────────────────────────────────────────────────

function MiniHealthScore({ score }: { score: number }) {
  const color =
    score <= 40
      ? 'var(--color-danger)'
      : score <= 70
        ? 'var(--color-warning)'
        : 'var(--brand-primary)';

  return (
    <div
      className="flex items-center justify-center rounded-full text-sm font-bold tabular-nums flex-shrink-0"
      style={{
        width: 40,
        height: 40,
        backgroundColor: color,
        color: 'var(--text-inverse)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {score}
    </div>
  );
}

// ── Sidebar Question Chip ────────────────────────────────────────────────────

function QuestionChip({
  question,
  onClick,
}: {
  question: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left text-xs px-3 py-2 rounded-full transition-colors duration-100 cursor-pointer w-full"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--brand-primary)';
        (e.currentTarget as HTMLButtonElement).style.color =
          'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.color =
          'var(--text-secondary)';
      }}
    >
      {question}
    </button>
  );
}

// ── Navigation Header ────────────────────────────────────────────────────────

function NavHeader({
  clientId,
  storeName,
  activePage,
}: {
  clientId: string;
  storeName: string;
  activePage: 'dashboard' | 'chat' | 'settings';
}) {
  const navLinks = [
    { label: 'Dashboard', href: `/${clientId}`, key: 'dashboard' as const },
    { label: 'Ask ProfitSight', href: `/${clientId}/chat`, key: 'chat' as const },
    { label: 'Settings', href: `/${clientId}/settings`, key: 'settings' as const },
  ];

  return (
    <header
      className="flex items-center justify-between px-6 py-3 flex-shrink-0"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'var(--brand-primary)',
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
          }}
        />
        <span
          className="font-semibold text-[15px]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
        >
          ProfitSight
        </span>
      </div>

      {/* Center/right: Nav links */}
      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-100"
            style={{
              color:
                activePage === link.key
                  ? 'var(--brand-primary)'
                  : 'var(--text-secondary)',
              backgroundColor:
                activePage === link.key
                  ? 'var(--brand-primary-subtle)'
                  : 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Far right: Store name + avatar */}
      <div className="flex items-center gap-3">
        <span
          className="text-[13px] hidden sm:inline"
          style={{ color: 'var(--text-secondary)' }}
        >
          {storeName}
        </span>
        <div
          className="flex items-center justify-center text-[11px] font-semibold"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--brand-primary-subtle)',
            color: 'var(--brand-primary)',
          }}
        >
          {storeName[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  );
}

// ── Chat Inner (uses useSearchParams) ────────────────────────────────────────

function ChatInner() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('q') || undefined;

  const [storeName, setStoreName] = useState('');
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const chatRef = useRef<ChatAreaHandle>(null);

  // Derive store name from clientId
  useEffect(() => {
    if (clientId) {
      const formatted = clientId
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setStoreName(formatted);
    }
  }, [clientId]);

  // Auth check + fetch mini snapshot
  useEffect(() => {
    if (!clientId) return;

    fetch(`/api/${clientId}/dashboard`)
      .then((res) => {
        if (res.status === 401) {
          router.push(`/${clientId}/login`);
          return null;
        }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSnapshot({
            healthScore: data.healthScore,
            netProfit: data.netProfit,
            margin: data.margin,
          });
        }
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, [clientId, router]);

  const handleSidebarQuestion = useCallback((question: string) => {
    chatRef.current?.sendMessage(question);
  }, []);

  if (!authChecked) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          height: '100vh',
          backgroundColor: 'var(--bg)',
          color: 'var(--text-secondary)',
          fontSize: 15,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', backgroundColor: 'var(--bg)' }}
    >
      <NavHeader clientId={clientId} storeName={storeName} activePage="chat" />

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        {/* Left Sidebar — hidden on mobile */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0 overflow-y-auto"
          style={{
            width: 260,
            backgroundColor: 'var(--bg-subtle)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Mini Snapshot Card */}
          <div
            className="p-4"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            {snapshot ? (
              <div className="flex items-center gap-3">
                <MiniHealthScore score={snapshot.healthScore} />
                <div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{
                      color: 'var(--brand-primary)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    $
                    {snapshot.netProfit.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Net Profit
                  </p>
                  <p
                    className="text-xs tabular-nums"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Margin: {snapshot.margin}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="rounded-full flex-shrink-0 animate-pulse"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--border)',
                  }}
                />
                <div className="flex flex-col gap-1">
                  <div
                    className="rounded animate-pulse"
                    style={{
                      width: 80,
                      height: 14,
                      backgroundColor: 'var(--border)',
                    }}
                  />
                  <div
                    className="rounded animate-pulse"
                    style={{
                      width: 60,
                      height: 10,
                      backgroundColor: 'var(--border-light)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div className="p-4 flex flex-col gap-2 flex-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Quick Questions
            </p>
            {QUICK_QUESTIONS.map((q) => (
              <QuestionChip
                key={q}
                question={q}
                onClick={() => handleSidebarQuestion(q)}
              />
            ))}
          </div>

          {/* Back to Dashboard link at bottom */}
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <Link
              href={`/${clientId}`}
              className="text-[13px] font-medium transition-opacity duration-100 hover:opacity-80"
              style={{ color: 'var(--brand-primary)' }}
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <ChatArea
            ref={chatRef}
            clientId={clientId}
            suggestedQuestions={SUGGESTED_QUESTIONS}
            initialQuestion={initialQuestion}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page Export (wrapped in Suspense for useSearchParams) ─────────────────────

export default function ClientChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center"
          style={{
            height: '100vh',
            backgroundColor: 'var(--bg)',
            color: 'var(--text-secondary)',
            fontSize: 15,
          }}
        >
          Loading chat...
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
