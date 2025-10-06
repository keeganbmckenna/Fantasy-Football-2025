import { LeagueData, TeamStats, WeekMatchup, SleeperMatchup } from './types';

export function getTeamName(
  rosterId: number,
  data: LeagueData
): { name: string; username: string } {
  const userId = data.rosterToUserMap[rosterId];
  if (userId) {
    const user = data.userMap[userId];
    return {
      name: user?.display_name || user?.username || `Team ${rosterId}`,
      username: user?.username || `Team ${rosterId}`,
    };
  }
  return { name: `Team ${rosterId}`, username: `Team ${rosterId}` };
}

export function calculateTeamStats(data: LeagueData): TeamStats[] {
  const stats: Record<number, TeamStats> = {};

  // Initialize stats from rosters
  data.rosters.forEach((roster) => {
    const { name, username } = getTeamName(roster.roster_id, data);
    stats[roster.roster_id] = {
      teamName: name,
      username,
      wins: roster.settings.wins,
      losses: roster.settings.losses,
      ties: roster.settings.ties,
      totalPoints: roster.settings.fpts + (roster.settings.fpts_decimal || 0) / 100,
      pointsAgainst: roster.settings.fpts_against || 0 + (roster.settings.fpts_against_decimal || 0) / 100,
      avgPoints: 0,
      weeklyScores: [],
      weeklyResults: [],
      standing: 0,
      standingValue: 0,
    };
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

// Calculate cumulative wins for each team over time
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

// Calculate cumulative scores for each team over time
export function calculateCumulativeScores(teams: TeamStats[]): Record<string, number[]> {
  const cumulativeScores: Record<string, number[]> = {};

  teams.forEach((team) => {
    cumulativeScores[team.username] = [];
    let totalScore = 0;

    team.weeklyScores.forEach((score) => {
      totalScore += score;
      cumulativeScores[team.username].push(totalScore);
    });
  });

  return cumulativeScores;
}

// Calculate standings for each week
export function calculateStandingsOverTime(teams: TeamStats[]): Record<string, number[]> {
  const standingsOverTime: Record<string, number[]> = {};
  const numWeeks = teams[0]?.weeklyScores.length || 0;

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

// Calculate weekly rankings (1-12) based on points scored that week
export function calculateWeeklyRankings(teams: TeamStats[]): Record<string, number[]> {
  const weeklyRankings: Record<string, number[]> = {};
  const numWeeks = teams[0]?.weeklyScores.length || 0;

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

// Calculate "play everyone" stats - what if each team played all other teams each week
export function calculatePlayEveryoneStats(teams: TeamStats[]): Array<{
  username: string;
  teamName: string;
  actualWins: number;
  playAllWins: number;
  playAllLosses: number;
  difference: number;
}> {
  const numWeeks = teams[0]?.weeklyScores.length || 0;
  const results: Array<{
    username: string;
    teamName: string;
    actualWins: number;
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
      playAllWins,
      playAllLosses,
      difference: team.wins - playAllWins / (teams.length - 1), // Normalize to per-week basis
    });
  });

  return results;
}

// Calculate median score for each week
export function calculateWeeklyMedians(teams: TeamStats[]): number[] {
  const numWeeks = teams[0]?.weeklyScores.length || 0;
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

// Calculate difference from cumulative median for each team
export function calculateDifferenceFromMedian(teams: TeamStats[]): Record<string, number[]> {
  const weeklyMedians = calculateWeeklyMedians(teams);
  const differences: Record<string, number[]> = {};

  teams.forEach((team) => {
    differences[team.username] = [];
    let cumulativeScore = 0;
    let cumulativeMedian = 0;

    team.weeklyScores.forEach((score, index) => {
      cumulativeScore += score;
      cumulativeMedian += weeklyMedians[index];
      differences[team.username].push(cumulativeScore - cumulativeMedian);
    });
  });

  return differences;
}
