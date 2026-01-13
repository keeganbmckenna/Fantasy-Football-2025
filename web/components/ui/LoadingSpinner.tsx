'use client';

interface LoadingSpinnerProps {
  message?: string;
}

/**
 * Reusable loading spinner component
 * Displays a centered spinner with optional message
 *
 * @example
 * ```tsx
 * <LoadingSpinner message="Loading league data..." />
 * ```
 */
export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--accent)] mx-auto"></div>
        <p className="mt-4 text-[var(--muted)] text-lg">{message}</p>
      </div>
    </div>
  );
}
