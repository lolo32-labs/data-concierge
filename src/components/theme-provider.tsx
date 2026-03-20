'use client';

import { useEffect } from 'react';
import { getTheme } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return <>{children}</>;
}
