'use client';

import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/lib/theme';

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Theme
      </span>
      <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-sm">
        {(['light', 'dark', 'system'] as ThemePreference[]).map((value) => {
          const isActive = preference === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                isActive
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'text-[var(--muted)] hover:bg-[var(--surface)]'
              }`
}
              aria-pressed={isActive}
            >
              {THEME_LABELS[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
