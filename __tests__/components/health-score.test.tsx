import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { HealthScore } from '@/components/shared/health-score';

expect.extend(matchers);

describe('HealthScore', () => {
  it('renders score, title, and description', () => {
    render(
      <HealthScore
        score={75}
        title="Profit Health"
        description="Your margins are above target"
      />
    );
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Profit Health')).toBeInTheDocument();
    expect(screen.getByText('Your margins are above target')).toBeInTheDocument();
  });

  it('renders a low score (0-40 danger range)', () => {
    render(
      <HealthScore
        score={30}
        title="Critical"
        description="Margins need attention"
      />
    );
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders a medium score (41-70 warning range)', () => {
    render(
      <HealthScore
        score={55}
        title="Moderate"
        description="Some room for improvement"
      />
    );
    expect(screen.getByText('55')).toBeInTheDocument();
  });
});
