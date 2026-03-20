interface HealthScoreProps {
  score: number;
  title: string;
  description: string;
}

export function HealthScore({ score, title, description }: HealthScoreProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const progressColor =
    score <= 40
      ? 'var(--color-danger)'
      : score <= 70
      ? 'var(--color-warning)'
      : 'var(--brand-primary)';

  return (
    <div
      className="flex items-center gap-5 rounded-xl p-6"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Circular gauge */}
      <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
        <svg
          width={88}
          height={88}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={44}
            cy={44}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={6}
          />
          {/* Progress arc */}
          <circle
            cx={44}
            cy={44}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Centered score number */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[20px] font-bold tabular-nums"
          style={{ color: progressColor, fontFamily: 'var(--font-display)' }}
        >
          {score}
        </div>
      </div>

      {/* Text content */}
      <div>
        <p
          className="text-[20px] font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </p>
        <p
          className="mt-1 text-[13px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
