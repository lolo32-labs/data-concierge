import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { MetricCard } from '@/components/shared/metric-card';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Net Profit" value="$12,345" />);
    expect(screen.getByText('Net Profit')).toBeInTheDocument();
    expect(screen.getByText('$12,345')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<MetricCard label="Revenue" value="$50,000" trend="+12% vs last month" />);
    expect(screen.getByText('+12% vs last month')).toBeInTheDocument();
  });

  it('does not render trend element when trend is not provided', () => {
    render(<MetricCard label="Revenue" value="$50,000" />);
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it('applies profit color CSS variable for type=profit', () => {
    render(<MetricCard label="Net Profit" value="$5,000" type="profit" />);
    const valueEl = screen.getByText('$5,000');
    expect(valueEl).toHaveStyle({ color: 'var(--brand-primary)' });
  });

  it('applies loss color CSS variable for type=loss', () => {
    render(<MetricCard label="Total Costs" value="$3,000" type="loss" />);
    const valueEl = screen.getByText('$3,000');
    expect(valueEl).toHaveStyle({ color: 'var(--color-danger)' });
  });

  it('applies neutral color CSS variable for type=neutral', () => {
    render(<MetricCard label="Revenue" value="$8,000" type="neutral" />);
    const valueEl = screen.getByText('$8,000');
    expect(valueEl).toHaveStyle({ color: 'var(--text-primary)' });
  });
});
