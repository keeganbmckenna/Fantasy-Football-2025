import type {
  SleeperTransaction,
  ProcessedTransaction,
  TransactionStats,
  TradeInfo,
  LeagueData,
} from './types';

// Helper to get team name from roster ID
function getTeamInfo(rosterId: number, leagueData: LeagueData) {
  const userId = leagueData.rosterToUserMap[rosterId];
  if (!userId) {
    return {
      username: 'Unknown',
      teamName: 'Unknown',
    };
  }

  const user = leagueData.userMap[userId];
  if (!user) {
    return {
      username: 'Unknown',
      teamName: 'Unknown',
    };
  }

  return {
    username: user.username || user.display_name || 'Unknown',
    teamName: user.metadata?.team_name || user.display_name || user.username || 'Unknown',
  };
}

// Process raw transactions into structured data
export function processTransactions(
  transactions: Array<SleeperTransaction & { week: number }>,
  leagueData: LeagueData,
  playerNames: Record<string, string> = {}
): ProcessedTransaction[] {
  const processed: ProcessedTransaction[] = [];

  transactions.forEach(transaction => {
    // Only process complete transactions
    if (transaction.status !== 'complete') {
      return;
    }

    if (transaction.type === 'trade') {
      // Trades are handled separately and converted later
      return;
    }

    const hasAdds = transaction.adds && Object.keys(transaction.adds).length > 0;
    const hasDrops = transaction.drops && Object.keys(transaction.drops).length > 0;

    // If transaction has both adds and drops, combine them as "swap" type
    if (hasAdds && hasDrops) {
      // Combine add+drop for the same roster
      const addEntries = Object.entries(transaction.adds!);
      const dropEntries = Object.entries(transaction.drops!);

      // Group by roster ID
      const rosterMap: Record<number, { adds: string[]; drops: string[] }> = {};

      addEntries.forEach(([playerId, rosterId]) => {
        if (!rosterMap[rosterId]) rosterMap[rosterId] = { adds: [], drops: [] };
        rosterMap[rosterId].adds.push(playerId);
      });

      dropEntries.forEach(([playerId, rosterId]) => {
        if (!rosterMap[rosterId]) rosterMap[rosterId] = { adds: [], drops: [] };
        rosterMap[rosterId].drops.push(playerId);
      });

      // Create combined transactions
      Object.entries(rosterMap).forEach(([rosterIdStr, { adds, drops }]) => {
        const rosterId = Number(rosterIdStr);
        const teamInfo = getTeamInfo(rosterId, leagueData);

        if (adds.length === 1 && drops.length === 1) {
          // Single add+drop = swap
          const addedPlayerId = adds[0];
          const droppedPlayerId = drops[0];

          processed.push({
            id: `${transaction.transaction_id}-swap-${rosterId}`,
            type: 'swap',
            week: transaction.week,
            timestamp: transaction.status_updated,
            teamName: teamInfo.teamName,
            username: teamInfo.username,
            rosterId,
            playerId: addedPlayerId,
            playerName: playerNames[addedPlayerId] || addedPlayerId,
            droppedPlayerId,
            droppedPlayerName: playerNames[droppedPlayerId] || droppedPlayerId,
            waiverBid: transaction.settings?.waiver_bid,
          });
        } else {
          // Multiple adds/drops - create separate transactions
          adds.forEach(playerId => {
            processed.push({
              id: `${transaction.transaction_id}-add-${playerId}`,
              type: 'add',
              week: transaction.week,
              timestamp: transaction.status_updated,
              teamName: teamInfo.teamName,
              username: teamInfo.username,
              rosterId,
              playerId,
              playerName: playerNames[playerId] || playerId,
              waiverBid: transaction.settings?.waiver_bid,
            });
          });

          drops.forEach(playerId => {
            processed.push({
              id: `${transaction.transaction_id}-drop-${playerId}`,
              type: 'drop',
              week: transaction.week,
              timestamp: transaction.status_updated,
              teamName: teamInfo.teamName,
              username: teamInfo.username,
              rosterId,
              playerId,
              playerName: playerNames[playerId] || playerId,
            });
          });
        }
      });
    } else if (hasAdds) {
      // Only adds
      Object.entries(transaction.adds!).forEach(([playerId, rosterId]) => {
        const teamInfo = getTeamInfo(rosterId, leagueData);

        processed.push({
          id: `${transaction.transaction_id}-add-${playerId}`,
          type: 'add',
          week: transaction.week,
          timestamp: transaction.status_updated,
          teamName: teamInfo.teamName,
          username: teamInfo.username,
          rosterId,
          playerId,
          playerName: playerNames[playerId] || playerId,
          waiverBid: transaction.settings?.waiver_bid,
        });
      });
    } else if (hasDrops) {
      // Only drops
      Object.entries(transaction.drops!).forEach(([playerId, rosterId]) => {
        const teamInfo = getTeamInfo(rosterId, leagueData);

        processed.push({
          id: `${transaction.transaction_id}-drop-${playerId}`,
          type: 'drop',
          week: transaction.week,
          timestamp: transaction.status_updated,
          teamName: teamInfo.teamName,
          username: teamInfo.username,
          rosterId,
          playerId,
          playerName: playerNames[playerId] || playerId,
        });
      });
    }
  });

  // Sort by timestamp (most recent first)
  return processed.sort((a, b) => b.timestamp - a.timestamp);
}

// Calculate transaction statistics per team
export function calculateTransactionStats(
  transactions: Array<SleeperTransaction & { week: number }>,
  leagueData: LeagueData
): TransactionStats[] {
  const statsByRoster: Record<number, TransactionStats> = {};

  // Initialize stats for all rosters
  leagueData.rosters.forEach(roster => {
    const teamInfo = getTeamInfo(roster.roster_id, leagueData);
    statsByRoster[roster.roster_id] = {
      username: teamInfo.username,
      teamName: teamInfo.teamName,
      rosterId: roster.roster_id,
      totalTransactions: 0,
      adds: 0,
      drops: 0,
      trades: 0,
      totalWaiverSpent: 0,
    };
  });

  // Track processed transactions to avoid double-counting FAAB per roster
  const processedFAABByRoster: Record<number, Set<string>> = {};

  // Initialize FAAB tracking for each roster
  leagueData.rosters.forEach(roster => {
    processedFAABByRoster[roster.roster_id] = new Set();
  });

  // Process transactions
  transactions.forEach(transaction => {
    // Only process complete transactions (skip failed waiver claims)
    if (transaction.status !== 'complete') {
      return;
    }

    if (transaction.type === 'trade') {
      transaction.roster_ids.forEach(rosterId => {
        if (statsByRoster[rosterId]) {
          statsByRoster[rosterId].trades++;
          statsByRoster[rosterId].totalTransactions++;
        }
      });
    } else {
      // For waiver/free_agent transactions, only process adds for FAAB counting
      // (drops don't cost FAAB)
      if (transaction.adds) {
        const waiverBid = transaction.settings?.waiver_bid;

        // Track which rosters are adding players
        const rostersAdding = new Set<number>();
        Object.values(transaction.adds).forEach(rosterId => {
          rostersAdding.add(rosterId);
          if (statsByRoster[rosterId]) {
            statsByRoster[rosterId].adds++;
            statsByRoster[rosterId].totalTransactions++;
          }
        });

        // Add FAAB once per transaction per roster that's adding players
        if (waiverBid) {
          rostersAdding.forEach(rosterId => {
            if (statsByRoster[rosterId] && !processedFAABByRoster[rosterId].has(transaction.transaction_id)) {
              statsByRoster[rosterId].totalWaiverSpent += waiverBid;
              processedFAABByRoster[rosterId].add(transaction.transaction_id);
            }
          });
        }
      }

      // Count drops (separately, they don't affect FAAB)
      if (transaction.drops) {
        Object.values(transaction.drops).forEach(rosterId => {
          if (statsByRoster[rosterId]) {
            statsByRoster[rosterId].drops++;
            statsByRoster[rosterId].totalTransactions++;
          }
        });
      }
    }
  });

  return Object.values(statsByRoster).sort((a, b) => b.totalTransactions - a.totalTransactions);
}

// Extract trade information
export function extractTrades(
  transactions: Array<SleeperTransaction & { week: number }>,
  leagueData: LeagueData,
  playerNames: Record<string, string> = {}
): TradeInfo[] {
  const trades: TradeInfo[] = [];

  transactions.forEach(transaction => {
    // Only process complete transactions
    if (transaction.status !== 'complete') {
      return;
    }

    if (transaction.type !== 'trade' || transaction.roster_ids.length !== 2) {
      return;
    }

    const [rosterId1, rosterId2] = transaction.roster_ids;
    const team1Info = getTeamInfo(rosterId1, leagueData);
    const team2Info = getTeamInfo(rosterId2, leagueData);

    // Determine what each team gave and received
    const team1Gives: string[] = [];
    const team1Receives: string[] = [];
    const team2Gives: string[] = [];
    const team2Receives: string[] = [];
    const team1GivesIds: string[] = [];
    const team1ReceivesIds: string[] = [];
    const team2GivesIds: string[] = [];
    const team2ReceivesIds: string[] = [];

    if (transaction.adds) {
      Object.entries(transaction.adds).forEach(([playerId, rosterId]) => {
        const playerName = playerNames[playerId] || playerId;
        if (rosterId === rosterId1) {
          team1Receives.push(playerName);
          team1ReceivesIds.push(playerId);
          team2Gives.push(playerName);
          team2GivesIds.push(playerId);
        } else if (rosterId === rosterId2) {
          team2Receives.push(playerName);
          team2ReceivesIds.push(playerId);
          team1Gives.push(playerName);
          team1GivesIds.push(playerId);
        }
      });
    }

    // Add draft pick information if present
    if (transaction.draft_picks) {
      transaction.draft_picks.forEach(pick => {
        const pickStr = `${pick.season} Round ${pick.round}`;
        if (pick.owner_id === rosterId1) {
          team1Receives.push(pickStr);
          team2Gives.push(pickStr);
        } else if (pick.owner_id === rosterId2) {
          team2Receives.push(pickStr);
          team1Gives.push(pickStr);
        }
      });
    }

    // Add FAAB information if present
    if (transaction.waiver_budget) {
      transaction.waiver_budget.forEach(budget => {
        const faabStr = `$${budget.amount} FAAB`;
        if (budget.sender === rosterId1) {
          team1Gives.push(faabStr);
          team2Receives.push(faabStr);
        } else if (budget.sender === rosterId2) {
          team2Gives.push(faabStr);
          team1Receives.push(faabStr);
        }
      });
    }

    trades.push({
      id: transaction.transaction_id,
      week: transaction.week,
      timestamp: transaction.status_updated,
      team1: {
        username: team1Info.username,
        teamName: team1Info.teamName,
        rosterId: rosterId1,
        gives: team1Gives,
        receives: team1Receives,
        givesIds: team1GivesIds,
        receivesIds: team1ReceivesIds,
      },
      team2: {
        username: team2Info.username,
        teamName: team2Info.teamName,
        rosterId: rosterId2,
        gives: team2Gives,
        receives: team2Receives,
        givesIds: team2GivesIds,
        receivesIds: team2ReceivesIds,
      },
    });
  });

  // Sort by timestamp (most recent first)
  return trades.sort((a, b) => b.timestamp - a.timestamp);
}

// Calculate trade frequency between teams
export function calculateTradeNetwork(
  trades: TradeInfo[]
): Record<string, Record<string, number>> {
  const network: Record<string, Record<string, number>> = {};

  trades.forEach(trade => {
    const team1 = trade.team1.username;
    const team2 = trade.team2.username;

    if (!network[team1]) network[team1] = {};
    if (!network[team2]) network[team2] = {};

    network[team1][team2] = (network[team1][team2] || 0) + 1;
    network[team2][team1] = (network[team2][team1] || 0) + 1;
  });

  return network;
}

// Convert trades to ProcessedTransaction format for unified display
export function tradesToProcessedTransactions(trades: TradeInfo[]): ProcessedTransaction[] {
  return trades.map(trade => ({
    id: trade.id,
    type: 'trade' as const,
    week: trade.week,
    timestamp: trade.timestamp,
    teamName: trade.team1.teamName,
    username: trade.team1.username,
    rosterId: trade.team1.rosterId,
    tradePartner: trade.team2.username,
    tradePartnerTeamName: trade.team2.teamName,
    tradeDetails: {
      team1: {
        username: trade.team1.username,
        teamName: trade.team1.teamName,
        gives: trade.team1.gives,
        receives: trade.team1.receives,
        givesIds: trade.team1.givesIds,
        receivesIds: trade.team1.receivesIds,
      },
      team2: {
        username: trade.team2.username,
        teamName: trade.team2.teamName,
        gives: trade.team2.gives,
        receives: trade.team2.receives,
        givesIds: trade.team2.givesIds,
        receivesIds: trade.team2.receivesIds,
      },
    },
  }));
}
