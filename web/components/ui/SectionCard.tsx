'use client';

import { ReactNode } from 'react';
import { GRADIENT_STYLES } from '@/lib/constants';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  gradientType?: keyof typeof GRADIENT_STYLES;
  footer?: ReactNode;
}

/**
 * Reusable card component with gradient header
 * Provides consistent styling across all sections
 *
 * @example
 * ```tsx
 * <SectionCard
 *   title="Weekly Scores"
 *   subtitle="Points scored each week"
 *   gradientType="secondary"
 * >
 *   <YourContent />
 * </SectionCard>
 * ```
 */
export default function SectionCard({
  title,
  subtitle,
  children,
  gradientType = 'primary',
  footer,
}: SectionCardProps) {
  const gradientClass = GRADIENT_STYLES[gradientType];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradientClass} px-6 py-4`}>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-white/90 text-sm mt-1">{subtitle}</p>}
      </div>

      {/* Content */}
      {children}

      {/* Footer */}
      {footer && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
}
