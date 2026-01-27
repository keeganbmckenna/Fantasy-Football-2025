import { LeagueData, SleeperMatchup, WeekMatchup } from '../types';
import { getTeamName } from './teamIdentity';

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
