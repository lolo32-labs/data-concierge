'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DemoBanner } from '@/components/shared';
import ChatArea from '@/components/chat-area';
import type { ChatAreaHandle } from '@/components/chat-area';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SnapshotData {
  healthScore: number;
  netProfit: number;
  margin: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  "What's my real profit this month?",
  'Which products are actually making me money?',
  'How much did I spend on ads vs. what they brought in?',
  'What are my margins by order channel?',
  'What if I raise all prices by 10%?',
];

const SUGGESTED_QUESTIONS = [
  "What's my real profit this month?",
  'Which products are actually making me money?',
  'How much did I spend on ads vs. what they brought in?',
  'What are my margins by order channel?',
  'What is my average order value by channel?',
];

// ── Mini Health Score Circle ──────────────────────────────────────────────────

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

// ── Sidebar Question Chip ─────────────────────────────────────────────────────

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

// ── Conversion Nudge Banner ───────────────────────────────────────────────────

function ConversionNudge() {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs"
      style={{
        backgroundColor: 'var(--brand-primary-subtle)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>
        Enjoying the demo? Connect your real store to see your own numbers.
      </span>
      <Link
        href="/"
        className="ml-3 whitespace-nowrap font-medium transition-opacity duration-100 hover:opacity-80"
        style={{ color: 'var(--brand-primary)' }}
      >
        Connect Store
      </Link>
    </div>
  );
}

// ── Inner component that uses useSearchParams (must be in Suspense) ───────────

function DemoChatInner() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('q') || undefined;

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const chatRef = useRef<ChatAreaHandle>(null);

  // Fetch mini snapshot on mount
  useEffect(() => {
    fetch('/api/demo/snapshot')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SnapshotData | null) => {
        if (data) setSnapshot(data);
      })
      .catch(() => {
        /* ignore — sidebar just won't show data */
      });
  }, []);

  const handleMessageCountChange = useCallback((count: number) => {
    setUserMessageCount(count);
  }, []);

  const handleSidebarQuestion = useCallback((question: string) => {
    chatRef.current?.sendMessage(question);
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', backgroundColor: 'var(--bg)' }}
    >
      {/* Demo Banner — full width at top */}
      <DemoBanner storeName="Demo Apparel Co" connectHref="/" />

      {/* Below banner: sidebar + chat */}
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

          {/* Connect Your Store link at bottom */}
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <Link
              href="/"
              className="text-[13px] font-medium transition-opacity duration-100 hover:opacity-80"
              style={{ color: 'var(--brand-primary)' }}
            >
              Connect Your Store &rarr;
            </Link>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          {/* Conversion nudge after 3+ user messages */}
          {userMessageCount >= 3 && <ConversionNudge />}

          <ChatArea
            ref={chatRef}
            clientId="demo"
            suggestedQuestions={SUGGESTED_QUESTIONS}
            initialQuestion={initialQuestion}
            onMessageCountChange={handleMessageCountChange}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page Export (wrapped in Suspense for useSearchParams) ──────────────────────

export default function DemoChatPage() {
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
      <DemoChatInner />
    </Suspense>
  );
}
