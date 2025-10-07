'use client';

import { useState } from 'react';

/**
 * Hook to manage hover state for chart elements
 * Provides consistent hover behavior across all charts
 *
 * @returns Object with hoveredItem state and setter functions
 *
 * @example
 * ```tsx
 * const { hoveredItem, setHoveredItem, clearHovered } = useChartHover();
 *
 * <Legend
 *   onMouseEnter={(e) => setHoveredItem(e.dataKey)}
 *   onMouseLeave={clearHovered}
 * />
 * ```
 */
export function useChartHover<T = string>() {
  const [hoveredItem, setHoveredItem] = useState<T | null>(null);

  const clearHovered = () => setHoveredItem(null);

  return {
    hoveredItem,
    setHoveredItem,
    clearHovered,
    isHovered: (item: T) => hoveredItem === item,
    isOtherHovered: (item: T) => hoveredItem !== null && hoveredItem !== item,
  };
}
