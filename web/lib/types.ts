export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points?: Record<string, number>;
  starters?: string[];
  players?: string[];
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  settings?: {
    leg?: number;
    last_scored_leg?: number;
  };
}

export interface LeagueData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchups: Record<number, SleeperMatchup[]>;
  userMap: Record<string, SleeperUser>;
  rosterToUserMap: Record<number, string>;
  lastScoredWeek: number;
}

export interface TeamStats {
  teamName: string;
  username: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  pointsAgainst: number;
  avgPoints: number;
  weeklyScores: number[];
  weeklyResults: ('W' | 'L' | 'T')[];
  standing: number;
  standingValue: number;
}

export interface WeekMatchup {
  week: number;
  matchupId: number;
  team1: {
    name: string;
    username: string;
    points: number;
    rosterId: number;
  };
  team2: {
    name: string;
    username: string;
    points: number;
    rosterId: number;
  };
  winner?: 'team1' | 'team2' | 'tie';
}

export interface PlayEveryoneStats {
  username: string;
  teamName: string;
  actualWins: number;
  playAllWins: number;
  playAllLosses: number;
  difference: number;
}
