import { TeamStats } from '../types';

/**
 * Calculates hypothetical "play everyone" statistics
 *
 * Determines how each team would perform if they played all other teams
 * every week, comparing actual wins to hypothetical wins.
 *
 * @param teams - Array of team statistics
 * @param maxWeek - Optional maximum week to consider (only count completed weeks)
 * @returns Array of play-everyone statistics sorted by difference
 */
export function calculatePlayEveryoneStats(teams: TeamStats[], maxWeek?: number): Array<{
  username: string;
  teamName: string;
  actualWins: number;
  actualLosses: number;
  playAllWins: number;
  playAllLosses: number;
  difference: number;
}> {
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, teams[0]?.weeklyScores.length || 0) : teams[0]?.weeklyScores.length || 0;
  const results: Array<{
    username: string;
    teamName: string;
    actualWins: number;
    actualLosses: number;
    playAllWins: number;
    playAllLosses: number;
    difference: number;
  }> = [];

  teams.forEach((team) => {
    let playAllWins = 0;
    let playAllLosses = 0;

    // For each week, compare this team's score against all other teams
    for (let week = 0; week < numWeeks; week++) {
      const teamScore = team.weeklyScores[week] || 0;

      teams.forEach((opponent) => {
        if (opponent.username !== team.username) {
          const opponentScore = opponent.weeklyScores[week] || 0;
          if (teamScore > opponentScore) {
            playAllWins++;
          } else if (teamScore < opponentScore) {
            playAllLosses++;
          }
          // Ties are ignored in this calculation
        }
      });
    }

    results.push({
      username: team.username,
      teamName: team.teamName,
      actualWins: team.wins,
      actualLosses: team.losses,
      playAllWins,
      playAllLosses,
      difference: team.wins - playAllWins / (teams.length - 1), // Normalize to per-week basis
    });
  });

  return results;
}

/**
 * Calculates detailed weekly play-all statistics
 *
 * For each week, determines how each team would perform if they played
 * all other teams, including win percentage and record.
 *
 * @param teams - Array of team statistics
 * @param maxWeek - Optional maximum week to consider (only count completed weeks)
 * @returns Array of weekly play-all stats sorted by overall win percentage
 */
export function calculateWeeklyPlayAll(teams: TeamStats[], maxWeek?: number): Array<{
  username: string;
  teamName: string;
  weeklyRecords: Array<{
    week: number;
    wins: number;
    losses: number;
    winPct: number;
    actualResult?: 'W' | 'L' | 'T' | null;
  }>;
  totalWins: number;
  totalLosses: number;
  overallWinPct: number;
}> {
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, teams[0]?.weeklyScores.length || 0) : teams[0]?.weeklyScores.length || 0;

  const results = teams.map((team) => {
    const weeklyRecords = [];
    let totalWins = 0;
    let totalLosses = 0;

    // For each week, calculate this team's record against all other teams
    for (let week = 0; week < numWeeks; week++) {
      const teamScore = team.weeklyScores[week] || 0;
      let weekWins = 0;
      let weekLosses = 0;

      teams.forEach((opponent) => {
        if (opponent.username !== team.username) {
          const opponentScore = opponent.weeklyScores[week] || 0;
          if (teamScore > opponentScore) {
            weekWins++;
          } else if (teamScore < opponentScore) {
            weekLosses++;
          }
          // Ties are not counted
        }
      });

      const totalGames = weekWins + weekLosses;
      const winPct = totalGames > 0 ? weekWins / totalGames : 0;

      weeklyRecords.push({
        week: week + 1,
        wins: weekWins,
        losses: weekLosses,
        winPct,
        actualResult: team.weeklyResults?.[week] ?? null,
      });

      totalWins += weekWins;
      totalLosses += weekLosses;
    }

    const totalGames = totalWins + totalLosses;
    const overallWinPct = totalGames > 0 ? totalWins / totalGames : 0;

    return {
      username: team.username,
      teamName: team.teamName,
      weeklyRecords,
      totalWins,
      totalLosses,
      overallWinPct,
    };
  });

  // Sort by overall win percentage (descending)
  return results.sort((a, b) => b.overallWinPct - a.overallWinPct);
}
