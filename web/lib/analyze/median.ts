import { TeamStats } from '../types';

/**
 * Calculates median score for each week of the season
 *
 * @param teams - Array of team statistics
 * @returns Array of median scores, one per week
 */
export function calculateWeeklyMedians(teams: TeamStats[], maxWeek?: number): number[] {
  const totalWeeks = teams[0]?.weeklyScores.length || 0;
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, totalWeeks) : totalWeeks;
  const medians: number[] = [];

  for (let week = 0; week < numWeeks; week++) {
    const weekScores = teams
      .map((team) => team.weeklyScores[week] || 0)
      .sort((a, b) => a - b);

    const mid = Math.floor(weekScores.length / 2);
    const median =
      weekScores.length % 2 === 0
        ? (weekScores[mid - 1] + weekScores[mid]) / 2
        : weekScores[mid];

    medians.push(median);
  }

  return medians;
}

/**
 * Calculates cumulative difference from median for each team
 *
 * Shows how far above or below the cumulative median each team is performing
 * at each point in the season. Positive values = above median.
 *
 * @param teams - Array of team statistics
 * @returns Object mapping usernames to arrays of cumulative differences
 */
export function calculateDifferenceFromMedian(teams: TeamStats[], maxWeek?: number): Record<string, number[]> {
  const totalWeeks = teams[0]?.weeklyScores.length || 0;
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, totalWeeks) : totalWeeks;
  const differences: Record<string, number[]> = {};

  teams.forEach((team) => {
    differences[team.username] = [];
  });

  const cumulativeScoresByTeam = teams.map((team) => {
    let cumulativeScore = 0;
    return team.weeklyScores.slice(0, numWeeks).map((score) => {
      cumulativeScore += score;
      return cumulativeScore;
    });
  });

  for (let week = 0; week < numWeeks; week++) {
    const weekScores = cumulativeScoresByTeam
      .map((scores) => scores[week] ?? 0)
      .sort((a, b) => a - b);

    const mid = Math.floor(weekScores.length / 2);
    const median =
      weekScores.length % 2 === 0
        ? (weekScores[mid - 1] + weekScores[mid]) / 2
        : weekScores[mid];

    teams.forEach((team, index) => {
      const cumulativeScore = cumulativeScoresByTeam[index][week] ?? 0;
      differences[team.username].push(cumulativeScore - median);
    });
  }

  return differences;
}
