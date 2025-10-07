'use client';

import { useMemo } from 'react';
import { TEAM_COLORS } from '@/lib/constants';
import type { TeamStats } from '@/lib/types';

export interface TeamColorMapping {
  username: string;
  teamName: string;
  color: string;
}

/**
 * Hook to generate consistent color mappings for teams
 * Memoized to prevent recalculation on every render
 *
 * @param teams - Array of team statistics
 * @param usernames - Optional array of usernames to generate colors for (defaults to all teams)
 * @returns Array of team color mappings
 *
 * @example
 * ```tsx
 * const teamColors = useTeamColors(teams);
 * // Returns: [{ username: "user1", teamName: "Team 1", color: "#3b82f6" }, ...]
 * ```
 */
export function useTeamColors(
  teams: TeamStats[],
  usernames?: string[]
): TeamColorMapping[] {
  return useMemo(() => {
    const usernameList = usernames || teams.map((t) => t.username);

    return usernameList.map((username, index) => {
      const team = teams.find((t) => t.username === username);
      return {
        username,
        teamName: team?.teamName || username,
        color: TEAM_COLORS[index % TEAM_COLORS.length],
      };
    });
  }, [teams, usernames]);
}
