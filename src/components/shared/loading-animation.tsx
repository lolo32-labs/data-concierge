'use client';

import { useEffect, useState } from 'react';

interface LoadingAnimationProps {
  storeName?: string;
  onComplete: () => void;
}

const STEPS = [
  { label: 'Connected to store', delay: 0 },
  { label: 'Pulling orders...', delay: 500 },
  { label: 'Pulling products...', delay: 900 },
  { label: 'Calculating profit...', delay: 1300 },
];

const COMPLETE_DELAY = 1800;

export function LoadingAnimation({
  storeName = 'Demo Apparel Co',
  onComplete,
}: LoadingAnimationProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setVisibleCount(index + 1);
      }, step.delay);
      timers.push(timer);
    });

    const completeTimer = setTimeout(() => {
      onComplete();
    }, COMPLETE_DELAY);
    timers.push(completeTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <p
        className="mb-8 text-[28px] font-bold"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Analyzing {storeName}...
      </p>

      <ul className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className="flex items-center gap-3 text-[15px] transition-opacity duration-300"
            style={{
              opacity: index < visibleCount ? 1 : 0,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="text-[16px] font-semibold"
              style={{ color: 'var(--brand-primary)' }}
            >
              ✓
            </span>
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
