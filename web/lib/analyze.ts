/**
 * Fantasy Football Analytics - Data Analysis Functions
 *
 * This module contains all calculation and data transformation logic
 * for fantasy football league statistics and visualizations.
 */

import { LeagueData, TeamStats, WeekMatchup, SleeperMatchup, SleeperUser, DivisionStanding, WildCardStanding, ScheduleLuckSimulation } from './types';

/**
 * Gets the best avatar URL for a user
 * Prioritizes metadata.avatar (full URL) over avatar ID
 *
 * @param user - Sleeper user object
 * @returns Avatar URL or null if no avatar available
 */
export function getAvatarUrl(user: SleeperUser | undefined): string | null {
  if (!user) return null;

  // Prefer full URL from metadata
  if (user.metadata?.avatar) {
    return user.metadata.avatar;
  }

  // Fall back to avatar ID
  if (user.avatar) {
    return `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
  }

  return null;
}

/**
 * Gets custom team name from metadata or falls back to display name
 *
 * @param user - Sleeper user object
 * @param fallback - Fallback name if no custom name found
 * @returns Custom team name or fallback
 */
export function getCustomTeamName(user: SleeperUser | undefined, fallback: string): string {
  if (!user) return fallback;
  return user.metadata?.team_name || user.display_name || fallback;
}

/**
 * Retrieves the display name and username for a team by roster ID
 *
 * @param rosterId - The Sleeper roster ID
 * @param data - Complete league data including user mappings
 * @returns Object containing the team's display name and username
 *
 * @example
 * ```ts
 * const { name, username } = getTeamName(1, leagueData);
 * // { name: "John's Team", username: "john123" }
 * ```
 */
export function getTeamName(
  rosterId: number,
  data: LeagueData
): { name: string; username: string } {
  const userId = data.rosterToUserMap[rosterId];
  if (userId) {
    const user = data.userMap[userId];
    return {
      name: user?.display_name || `Team ${rosterId}`,
      username: user?.display_name || `Team ${rosterId}`,
    };
  }
  return { name: `Team ${rosterId}`, username: `Team ${rosterId}` };
}

/**
 * Calculates comprehensive statistics for all teams in the league
 *
 * Processes roster data and matchup results to generate:
 * - Win/loss records
 * - Total and average points
 * - Points against
 * - Weekly scores and results
 * - League standings
 *
 * @param data - Complete league data from Sleeper API
 * @param lastScoredWeek - Optional last completed week for performance metrics
 * @returns Array of team statistics sorted by standings
 *
 * @example
 * ```ts
 * const teamStats = calculateTeamStats(leagueData);
 * // Returns teams sorted by standing with full statistics
 * ```
 */
export function calculateTeamStats(data: LeagueData, lastScoredWeek?: number): TeamStats[] {
  const stats: Record<number, TeamStats> = {};
  // Track opponent scores for margin calculations
  const weeklyOpponentScores: Record<number, number[]> = {};

  // Initialize stats from rosters
  data.rosters.forEach((roster) => {
    const { name, username } = getTeamName(roster.roster_id, data);
    const user = data.userMap[roster.owner_id];
    const customName = getCustomTeamName(user, name);

    const division = roster.settings.division;
    stats[roster.roster_id] = {
      teamName: customName,
      username,
      wins: roster.settings.wins,
      losses: roster.settings.losses,
      ties: roster.settings.ties,
      totalPoints: roster.settings.fpts + (roster.settings.fpts_decimal || 0) / 100,
      pointsAgainst:
        (roster.settings.fpts_against || 0) +
        ((roster.settings.fpts_against_decimal || 0) / 100),
      avgPoints: 0,
      weeklyScores: [],
      weeklyResults: [],
      weeklyOpponentScores: [],
      standing: 0,
      standingValue: 0,
      division,
      divisionName: data.divisionNames?.[division || 0],
      avatarUrl: getAvatarUrl(user),
    };
    weeklyOpponentScores[roster.roster_id] = [];
  });

  // Calculate weekly scores and results
  Object.entries(data.matchups).forEach(([, matchups]) => {
    // Group matchups by matchup_id
    const matchupGroups: Record<number, SleeperMatchup[]> = {};
    matchups.forEach((matchup) => {
      if (!matchupGroups[matchup.matchup_id]) {
        matchupGroups[matchup.matchup_id] = [];
      }
      matchupGroups[matchup.matchup_id].push(matchup);
    });

    // Determine winners for each matchup
    Object.values(matchupGroups).forEach((teams) => {
      if (teams.length === 2) {
        const [team1, team2] = teams;
        const points1 = team1.points;
        const points2 = team2.points;

        // Add weekly scores
        stats[team1.roster_id].weeklyScores.push(points1);
        stats[team2.roster_id].weeklyScores.push(points2);

        // Track opponent scores for margin calculations (both in local map and TeamStats)
        weeklyOpponentScores[team1.roster_id].push(points2);
        weeklyOpponentScores[team2.roster_id].push(points1);
        stats[team1.roster_id].weeklyOpponentScores.push(points2);
        stats[team2.roster_id].weeklyOpponentScores.push(points1);

        // Determine result
        if (points1 > points2) {
          stats[team1.roster_id].weeklyResults.push('W');
          stats[team2.roster_id].weeklyResults.push('L');
        } else if (points2 > points1) {
          stats[team1.roster_id].weeklyResults.push('L');
          stats[team2.roster_id].weeklyResults.push('W');
        } else {
          stats[team1.roster_id].weeklyResults.push('T');
          stats[team2.roster_id].weeklyResults.push('T');
        }
      }
    });
  });

  // Calculate averages and standing values
  const teamStatsArray = Object.values(stats);
  teamStatsArray.forEach((team) => {
    if (team.weeklyScores.length > 0) {
      team.avgPoints = team.totalPoints / team.weeklyScores.length;
    }

    // Calculate performance breakdown metrics (only for completed weeks)
    const winScores: number[] = [];
    const lossScores: number[] = [];
    const winMargins: number[] = [];
    const lossMargins: number[] = [];

    // Find the roster_id for this team
    const rosterId = Object.keys(stats).find(key => stats[parseInt(key)].username === team.username);
    if (rosterId) {
      const opponentScores = weeklyOpponentScores[parseInt(rosterId)];

      // Determine how many weeks to analyze
      const weeksToAnalyze = lastScoredWeek !== undefined
        ? Math.min(lastScoredWeek, team.weeklyResults.length)
        : team.weeklyResults.length;

      // Only loop through completed weeks
      for (let index = 0; index < weeksToAnalyze; index++) {
        const result = team.weeklyResults[index];
        const score = team.weeklyScores[index];
        const opponentScore = opponentScores[index];

        if (result === 'W') {
          winScores.push(score);
          winMargins.push(score - opponentScore);
        } else if (result === 'L') {
          lossScores.push(score);
          lossMargins.push(score - opponentScore); // Will be negative
        }
      }

      // Calculate means and medians
      if (winScores.length > 0) {
        team.avgPointsInWins = winScores.reduce((a, b) => a + b, 0) / winScores.length;
        const sortedWinScores = [...winScores].sort((a, b) => a - b);
        team.medianPointsInWins = sortedWinScores[Math.floor(sortedWinScores.length / 2)];

        team.avgWinMargin = winMargins.reduce((a, b) => a + b, 0) / winMargins.length;
        const sortedWinMargins = [...winMargins].sort((a, b) => a - b);
        team.medianWinMargin = sortedWinMargins[Math.floor(sortedWinMargins.length / 2)];
      }

      if (lossScores.length > 0) {
        team.avgPointsInLosses = lossScores.reduce((a, b) => a + b, 0) / lossScores.length;
        const sortedLossScores = [...lossScores].sort((a, b) => a - b);
        team.medianPointsInLosses = sortedLossScores[Math.floor(sortedLossScores.length / 2)];

        team.avgLossMargin = lossMargins.reduce((a, b) => a + b, 0) / lossMargins.length;
        const sortedLossMargins = [...lossMargins].sort((a, b) => a - b);
        team.medianLossMargin = sortedLossMargins[Math.floor(sortedLossMargins.length / 2)];
      }
    }
  });

  // Calculate standing value (wins + decimal from total points)
  const maxPoints = Math.max(...teamStatsArray.map((t) => t.totalPoints));
  teamStatsArray.forEach((team) => {
    team.standingValue = team.wins + (team.totalPoints / maxPoints) * 0.999999;
  });

  // Sort by standing value and assign standings
  teamStatsArray.sort((a, b) => b.standingValue - a.standingValue);
  teamStatsArray.forEach((team, index) => {
    team.standing = index + 1;
  });

  return teamStatsArray;
}

/**
 * Organizes matchup data by week with team names and results
 *
 * @param data - Complete league data from Sleeper API
 * @returns Object mapping week numbers to arrays of matchup details
 *
 * @example
 * ```ts
 * const matchups = getWeeklyMatchups(leagueData);
 * const week1 = matchups[1]; // Array of matchups for week 1
 * ```
 */
export function getWeeklyMatchups(data: LeagueData): Record<number, WeekMatchup[]> {
  const weeklyMatchups: Record<number, WeekMatchup[]> = {};

  Object.entries(data.matchups).forEach(([weekNum, matchups]) => {
    const week = parseInt(weekNum);
    const weekMatchupsArray: WeekMatchup[] = [];

    // Group matchups by matchup_id
    const matchupGroups: Record<number, SleeperMatchup[]> = {};
    matchups.forEach((matchup) => {
      if (!matchupGroups[matchup.matchup_id]) {
        matchupGroups[matchup.matchup_id] = [];
      }
      matchupGroups[matchup.matchup_id].push(matchup);
    });

    // Create matchup objects
    Object.entries(matchupGroups).forEach(([matchupId, teams]) => {
      if (teams.length === 2) {
        const [team1Data, team2Data] = teams;
        const team1 = getTeamName(team1Data.roster_id, data);
        const team2 = getTeamName(team2Data.roster_id, data);

        let winner: 'team1' | 'team2' | 'tie' | undefined;
        if (team1Data.points > team2Data.points) {
          winner = 'team1';
        } else if (team2Data.points > team1Data.points) {
          winner = 'team2';
        } else {
          winner = 'tie';
        }

        weekMatchupsArray.push({
          week,
          matchupId: parseInt(matchupId),
          team1: {
            name: team1.name,
            username: team1.username,
            points: team1Data.points,
            rosterId: team1Data.roster_id,
          },
          team2: {
            name: team2.name,
            username: team2.username,
            points: team2Data.points,
            rosterId: team2Data.roster_id,
          },
          winner,
        });
      }
    });

    weeklyMatchups[week] = weekMatchupsArray;
  });

  return weeklyMatchups;
}

/**
 * Calculates cumulative win totals for each team over the season
 *
 * @param teams - Array of team statistics
 * @returns Object mapping usernames to arrays of cumulative wins by week
 */
export function calculateCumulativeWins(teams: TeamStats[]): Record<string, number[]> {
  const cumulativeWins: Record<string, number[]> = {};

  teams.forEach((team) => {
    cumulativeWins[team.username] = [];
    let totalWins = 0;

    team.weeklyResults.forEach((result) => {
      if (result === 'W') totalWins++;
      cumulativeWins[team.username].push(totalWins);
    });
  });

  return cumulativeWins;
}

/**
 * Calculates cumulative point totals for each team over the season
 *
 * @param teams - Array of team statistics
 * @returns Object mapping usernames to arrays of cumulative scores by week
 */
export function calculateCumulativeScores(teams: TeamStats[], maxWeek?: number): Record<string, number[]> {
  const cumulativeScores: Record<string, number[]> = {};
  const totalWeeks = teams[0]?.weeklyScores.length || 0;
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, totalWeeks) : totalWeeks;

  teams.forEach((team) => {
    cumulativeScores[team.username] = [];
    let totalScore = 0;

    team.weeklyScores.slice(0, numWeeks).forEach((score) => {
      totalScore += score;
      cumulativeScores[team.username].push(totalScore);
    });
  });

  return cumulativeScores;
}

/**
 * Calculates historical standings position for each week
 *
 * Determines each team's standing (1st, 2nd, etc.) for every week of the season
 * based on wins and total points at that point in time.
 *
 * @param teams - Array of team statistics
 * @param maxWeek - Optional maximum week to consider (only count completed weeks)
 * @returns Object mapping usernames to arrays of standings by week
 */
export function calculateStandingsOverTime(teams: TeamStats[], maxWeek?: number): Record<string, number[]> {
  const standingsOverTime: Record<string, number[]> = {};
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, teams[0]?.weeklyScores.length || 0) : teams[0]?.weeklyScores.length || 0;

  // Initialize
  teams.forEach((team) => {
    standingsOverTime[team.username] = [];
  });

  // For each week, calculate standings
  for (let week = 0; week < numWeeks; week++) {
    // Calculate standing value for each team at this week
    const weekStandings: Array<{ username: string; value: number }> = [];

    teams.forEach((team) => {
      let wins = 0;
      let points = 0;

      for (let w = 0; w <= week; w++) {
        if (team.weeklyResults[w] === 'W') wins++;
        points += team.weeklyScores[w] || 0;
      }

      weekStandings.push({ username: team.username, value: wins + points * 0.000001 });
    });

    // Sort by standing value
    weekStandings.sort((a, b) => b.value - a.value);

    // Assign standings
    weekStandings.forEach((standing, index) => {
      standingsOverTime[standing.username].push(index + 1);
    });
  }

  return standingsOverTime;
}

/**
 * Calculates weekly performance rankings based on points scored
 *
 * Ranks teams 1-N for each week based solely on points scored that week
 * (not cumulative standings).
 *
 * @param teams - Array of team statistics
 * @param maxWeek - Optional maximum week to consider (only count completed weeks)
 * @returns Object mapping usernames to arrays of weekly rankings
 */
export function calculateWeeklyRankings(teams: TeamStats[], maxWeek?: number): Record<string, number[]> {
  const weeklyRankings: Record<string, number[]> = {};
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, teams[0]?.weeklyScores.length || 0) : teams[0]?.weeklyScores.length || 0;

  // Initialize
  teams.forEach((team) => {
    weeklyRankings[team.username] = [];
  });

  // For each week, rank teams by their score
  for (let week = 0; week < numWeeks; week++) {
    const weekScores: Array<{ username: string; score: number }> = [];

    teams.forEach((team) => {
      weekScores.push({
        username: team.username,
        score: team.weeklyScores[week] || 0,
      });
    });

    // Sort by score (highest first)
    weekScores.sort((a, b) => b.score - a.score);

    // Assign rankings
    weekScores.forEach((item, index) => {
      weeklyRankings[item.username].push(index + 1);
    });
  }

  return weeklyRankings;
}

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

const BYE_TEAM = -1;

const shuffleArray = <T>(items: T[], random: () => number = Math.random): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const buildRoundRobinSchedule = (teamIds: number[]): number[][][] => {
  const teams = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, BYE_TEAM];
  const totalTeams = teams.length;
  const half = totalTeams / 2;
  const weeks: number[][][] = [];
  let rotation = [...teams];

  for (let week = 0; week < totalTeams - 1; week++) {
    const matchups: number[][] = [];

    for (let index = 0; index < half; index++) {
      const home = rotation[index];
      const away = rotation[totalTeams - 1 - index];
      if (home !== BYE_TEAM && away !== BYE_TEAM) {
        matchups.push([home, away]);
      }
    }

    weeks.push(matchups);
    rotation = [rotation[0], rotation[totalTeams - 1], ...rotation.slice(1, totalTeams - 1)];
  }

  return weeks;
};

const getActualWins = (team: TeamStats) => team.wins + (team.ties || 0) * 0.5;

const buildSimulationSchedule = (baseSchedule: number[][][], totalWeeks: number) => {
  if (totalWeeks <= baseSchedule.length) {
    return baseSchedule.slice(0, totalWeeks);
  }

  const schedule = [...baseSchedule];
  const repeatsNeeded = totalWeeks - baseSchedule.length;

  for (let index = 0; index < repeatsNeeded; index++) {
    schedule.push(baseSchedule[index % baseSchedule.length]);
  }

  return schedule;
};

/**
 * Simulates randomized schedules and returns win distributions per team.
 *
 * Uses a round-robin schedule, then repeats early weeks if needed.
 */
export function simulateScheduleLuck(
  teams: TeamStats[],
  simulations: number = 5000,
  maxWeek?: number
): ScheduleLuckSimulation {
  if (teams.length === 0) {
    return { simulations, weeksSimulated: 0, teams: [] };
  }

  const totalWeeks = teams[0]?.weeklyScores.length || 0;
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, totalWeeks) : totalWeeks;
  const teamIds = teams.map((_, index) => index);
  const actualWins = teams.map(getActualWins);
  const distributions = teamIds.map(() => new Map<number, number>());

  for (let sim = 0; sim < simulations; sim++) {
    const shuffledTeams = shuffleArray(teamIds);
    const baseSchedule = buildRoundRobinSchedule(shuffledTeams);
    const schedule = buildSimulationSchedule(baseSchedule, numWeeks);
    const wins = new Array(teamIds.length).fill(0);

    for (let week = 0; week < numWeeks; week++) {
      const matchups = schedule[week] ?? [];
      matchups.forEach(([home, away]) => {
        const homeScore = teams[home].weeklyScores[week] ?? 0;
        const awayScore = teams[away].weeklyScores[week] ?? 0;

        if (homeScore > awayScore) {
          wins[home] += 1;
        } else if (awayScore > homeScore) {
          wins[away] += 1;
        } else {
          wins[home] += 0.5;
          wins[away] += 0.5;
        }
      });
    }

    wins.forEach((winTotal, index) => {
      const current = distributions[index].get(winTotal) ?? 0;
      distributions[index].set(winTotal, current + 1);
    });
  }

  const teamsWithDistributions = teams.map((team, index) => {
    const outcomes = Array.from(distributions[index].entries())
      .map(([wins, count]) => ({
        wins,
        count,
        frequency: count / simulations,
      }))
      .sort((a, b) => a.wins - b.wins);

    return {
      username: team.username,
      teamName: team.teamName,
      actualWins: actualWins[index],
      outcomes,
    };
  });

  return {
    simulations,
    weeksSimulated: numWeeks,
    teams: teamsWithDistributions,
  };
}

/**
 * Calculates division standings with leaders and games back
 *
 * Groups teams by division, identifies division leaders, and calculates
 * games behind the division leader for each team.
 *
 * @param teams - Array of team statistics
 * @returns Array of division standings sorted by division number
 */
export function calculateDivisionStandings(teams: TeamStats[]): DivisionStanding[] {
  const divisionMap: Record<number, TeamStats[]> = {};

  // Group teams by division
  teams.forEach((team) => {
    const div = team.division || 0;
    if (!divisionMap[div]) divisionMap[div] = [];
    divisionMap[div].push(team);
  });

  // Process each division
  const divisions: DivisionStanding[] = [];

  Object.keys(divisionMap).forEach((divKey) => {
    const div = parseInt(divKey);
    const divTeams = divisionMap[div];

    // Sort by standing value (same as overall standings)
    divTeams.sort((a, b) => b.standingValue - a.standingValue);

    // Assign division ranks and games back
    const leader = divTeams[0];
    leader.isDivisionLeader = true;
    leader.divisionRank = 1;
    leader.gamesBack = 0;

    for (let i = 1; i < divTeams.length; i++) {
      divTeams[i].divisionRank = i + 1;
      divTeams[i].isDivisionLeader = false;

      // Calculate games back from leader
      const winDiff = leader.wins - divTeams[i].wins;
      const lossDiff = divTeams[i].losses - leader.losses;
      const gamesBack = -(winDiff + lossDiff) / 2;

      divTeams[i].gamesBack = gamesBack;
    }

    divisions.push({
      division: div,
      divisionName: leader.divisionName || `Division ${div}`,
      teams: divTeams,
      leader,
    });
  });

  // Sort divisions by division number
  return divisions.sort((a, b) => a.division - b.division);
}

/**
 * Calculates wild card standings (non-division leaders)
 *
 * Determines which non-division leaders would make the playoffs
 * and how far teams are from the playoff cutoff.
 *
 * @param teams - Array of team statistics
 * @param playoffSpots - Total number of playoff spots (default: 6)
 * @returns Array of wild card standings sorted by standing value
 */
export function calculateWildCardStandings(
  teams: TeamStats[],
  playoffSpots: number = 6
): WildCardStanding[] {
  // Get division leaders
  const divisionLeaders = teams.filter((t) => t.isDivisionLeader);
  const numDivisionLeaders = divisionLeaders.length;
  const wildCardSpots = Math.max(playoffSpots - numDivisionLeaders, 0);

  if (numDivisionLeaders === 0 || wildCardSpots === 0) {
    return [];
  }

  // Get non-division leaders sorted by standing
  const wildCardTeams = teams
    .filter((t) => !t.isDivisionLeader)
    .sort((a, b) => b.standingValue - a.standingValue);

  if (wildCardTeams.length === 0) {
    return [];
  }

  // Find the wildcard cutoff team (last team in)
  const cutoffIndex = Math.min(wildCardSpots, wildCardTeams.length) - 1;
  const cutoffTeam = wildCardTeams[cutoffIndex];

  if (!cutoffTeam) {
    return [];
  }

  // Calculate wild card standings
  return wildCardTeams.map((team, index) => {
    const rank = index + 1;
    const isIn = rank <= wildCardSpots;

    // Games out from cutoff
    const winDiff = cutoffTeam.wins - team.wins;
    const lossDiff = team.losses - cutoffTeam.losses;
    const gamesOut = -(winDiff + lossDiff) / 2;

    team.wildCardRank = rank;
    team.wildCardGamesOut = gamesOut;

    return {
      team,
      rank,
      gamesOut,
      isIn,
    };
  });
}
