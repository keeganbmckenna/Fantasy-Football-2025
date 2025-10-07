/**
 * Shared constants used across the application
 */

/**
 * Color palette for team visualizations
 * Used consistently across all charts and graphs
 */
export const TEAM_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#06b6d4', // Cyan
  '#a855f7', // Purple
] as const;

/**
 * Gradient header styles for different section types
 */
export const GRADIENT_STYLES = {
  primary: 'from-blue-600 to-blue-800',
  secondary: 'from-purple-600 to-purple-800',
  accent: 'from-indigo-600 to-indigo-800',
  success: 'from-teal-600 to-teal-800',
  warning: 'from-orange-600 to-orange-800',
} as const;

/**
 * Chart configuration defaults
 */
export const CHART_CONFIG = {
  defaultHeight: 500,
  strokeWidth: {
    default: 2,
    hovered: 4,
    median: 3,
    medianHovered: 5,
  },
  dotRadius: {
    default: 3,
    hovered: 5,
    active: 5,
    medianActive: 6,
  },
  opacity: {
    default: 1,
    dimmed: 0.2,
    median: 0.4,
  },
} as const;

/**
 * Color utility to get ranking-based colors for heatmaps
 */
export const getRankingColor = (ranking: number, totalTeams: number): string => {
  const ratio = (ranking - 1) / (totalTeams - 1);

  if (ratio < 0.25) return 'bg-green-500 text-white';
  if (ratio < 0.5) return 'bg-green-300 text-gray-900';
  if (ratio < 0.75) return 'bg-yellow-300 text-gray-900';
  return 'bg-red-400 text-white';
};
