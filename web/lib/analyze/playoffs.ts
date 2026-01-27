import { DivisionStanding, TeamStats, WildCardStanding } from '../types';

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
