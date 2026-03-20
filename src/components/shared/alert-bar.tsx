import Link from 'next/link';

interface AlertBarProps {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  action?: { label: string; href: string };
}

const typeStyles: Record<
  AlertBarProps['type'],
  { bg: string; border: string; actionColor: string }
> = {
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success)',
    actionColor: 'var(--color-success)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning)',
    actionColor: 'var(--color-warning)',
  },
  danger: {
    bg: 'var(--color-danger-subtle)',
    border: 'var(--color-danger)',
    actionColor: 'var(--color-danger)',
  },
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'var(--color-info)',
    actionColor: 'var(--color-info)',
  },
};

export function AlertBar({ type, message, action }: AlertBarProps) {
  const styles = typeStyles[type];

  return (
    <div
      className="flex items-center justify-between rounded-md py-3 px-4 text-sm font-medium border-l-4"
      style={{
        backgroundColor: styles.bg,
        borderLeftColor: styles.border,
        color: 'var(--text-primary)',
      }}
    >
      <span>{message}</span>
      {action && (
        <Link
          href={action.href}
          className="ml-4 whitespace-nowrap transition-opacity duration-100 hover:opacity-80"
          style={{ color: styles.actionColor }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
