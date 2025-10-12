export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
  metadata?: {
    avatar?: string;
    team_name?: string;
  };
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
    division?: number;
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
  avatar?: string;
  metadata?: {
    division_1?: string;
    division_2?: string;
    division_3?: string;
  };
  settings?: {
    leg?: number;
    last_scored_leg?: number;
    divisions?: number;
    playoff_teams?: number;
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
  divisionNames?: Record<number, string>;
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
  division?: number;
  divisionName?: string;
  divisionRank?: number;
  isDivisionLeader?: boolean;
  avatarUrl?: string | null;
  gamesBack?: number;
  wildCardRank?: number;
  wildCardGamesOut?: number;
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
  actualLosses: number;
  playAllWins: number;
  playAllLosses: number;
  difference: number;
}

export interface WeeklyPlayAllRecord {
  week: number;
  wins: number;
  losses: number;
  winPct: number;
}

export interface WeeklyPlayAllStats {
  username: string;
  teamName: string;
  weeklyRecords: WeeklyPlayAllRecord[];
  totalWins: number;
  totalLosses: number;
  overallWinPct: number;
}

export interface DivisionStanding {
  division: number;
  divisionName: string;
  teams: TeamStats[];
  leader: TeamStats;
}

export interface WildCardStanding {
  team: TeamStats;
  rank: number;
  gamesOut: number;
  isIn: boolean;
}

// Transaction Types
export interface SleeperTransaction {
  type: 'trade' | 'waiver' | 'free_agent';
  transaction_id: string;
  status: string;
  settings: {
    waiver_bid?: number;
  } | null;
  roster_ids: number[];
  metadata?: {
    notes?: string;
  };
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks?: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id: number;
    owner_id: number;
  }>;
  waiver_budget?: Array<{
    sender: number;
    receiver: number;
    amount: number;
  }>;
  created: number;
  status_updated: number;
  creator: string;
  consenter_ids: number[];
}

export interface ProcessedTransaction {
  id: string;
  type: 'add' | 'drop' | 'trade' | 'swap';
  week: number;
  timestamp: number;
  teamName: string;
  username: string;
  rosterId: number;
  playerId?: string;
  playerName?: string;
  waiverBid?: number;
  // For swap type (combined add+drop)
  droppedPlayerId?: string;
  droppedPlayerName?: string;
  // For trade type
  tradePartner?: string;
  tradePartnerTeamName?: string;
  tradeDetails?: {
    team1: {
      username: string;
      teamName: string;
      gives: string[];
      receives: string[];
      givesIds: string[];
      receivesIds: string[];
    };
    team2: {
      username: string;
      teamName: string;
      gives: string[];
      receives: string[];
      givesIds: string[];
      receivesIds: string[];
    };
  };
}

export interface TransactionStats {
  username: string;
  teamName: string;
  rosterId: number;
  totalTransactions: number;
  adds: number;
  drops: number;
  trades: number;
  totalWaiverSpent: number;
  bestPickup?: {
    playerName: string;
    week: number;
  };
}

export interface PlayerTradeValue {
  playerName: string;
  valueAtTrade: number | null;
  valueToday: number | null;
  gain: number | null;
  gainPercentage: number | null;
}

export interface TradeAnalysis {
  tradeId: string;
  status: 'success' | 'partial' | 'error';
  errorMessage?: string;

  team1: {
    gaveUpValueAtTrade: number;
    gaveUpValueToday: number;
    gaveUpGain: number;
    gaveUpGainPercentage: number;
    receivedValueAtTrade: number;
    receivedValueToday: number;
    receivedGain: number;
    receivedGainPercentage: number;
    tradeQuality: number; // receivedGain - gaveUpGain
    tradeQualityPercentage: number;
    players: PlayerTradeValue[];
  };

  team2: {
    gaveUpValueAtTrade: number;
    gaveUpValueToday: number;
    gaveUpGain: number;
    gaveUpGainPercentage: number;
    receivedValueAtTrade: number;
    receivedValueToday: number;
    receivedGain: number;
    receivedGainPercentage: number;
    tradeQuality: number; // receivedGain - gaveUpGain
    tradeQualityPercentage: number;
    players: PlayerTradeValue[];
  };

  winner: 'team1' | 'team2' | 'even';
  winMargin: number;
  analyzedAt: Date;
}

export interface TradeInfo {
  id: string;
  week: number;
  timestamp: number;
  team1: {
    username: string;
    teamName: string;
    rosterId: number;
    gives: string[]; // Player names
    receives: string[]; // Player names
    givesIds: string[]; // Sleeper player IDs
    receivesIds: string[]; // Sleeper player IDs
  };
  team2: {
    username: string;
    teamName: string;
    rosterId: number;
    gives: string[]; // Player names
    receives: string[]; // Player names
    givesIds: string[]; // Sleeper player IDs
    receivesIds: string[]; // Sleeper player IDs
  };
  analysis?: TradeAnalysis;
}
