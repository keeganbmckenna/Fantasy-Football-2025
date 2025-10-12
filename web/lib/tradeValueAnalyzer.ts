import type { TradeInfo } from './types';
import {
  getHistoricalValues,
  getValueAtDate,
  getCurrentValue,
  getFantasyCalcId,
} from './fantasycalc-api';

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
    totalValueAtTrade: number;
    totalValueToday: number;
    totalGain: number;
    gainPercentage: number;
    players: PlayerTradeValue[];
  };

  team2: {
    totalValueAtTrade: number;
    totalValueToday: number;
    totalGain: number;
    gainPercentage: number;
    players: PlayerTradeValue[];
  };

  winner: 'team1' | 'team2' | 'even';
  winMargin: number; // Absolute value difference
  analyzedAt: Date;
}

/**
 * Extract player data from trade items (skip FAAB, kickers, and defenses)
 */
function extractPlayerData(
  items: string[],
  itemIds: string[],
  playerPositions: Record<string, string>
): Array<{ name: string; sleeperId: string }> {
  const players: Array<{ name: string; sleeperId: string }> = [];

  items.forEach((item, index) => {
    const playerId = itemIds[index];
    const position = playerPositions[playerId];

    // Skip FAAB, kickers, and defenses
    if (
      item.includes('FAAB') ||
      position === 'K' ||
      position === 'DEF'
    ) {
      return;
    }

    players.push({
      name: item,
      sleeperId: playerId,
    });
  });

  return players;
}

/**
 * Analyze a single player's value change
 */
async function analyzePlayer(
  playerName: string,
  sleeperId: string,
  tradeDate: Date
): Promise<PlayerTradeValue> {
  const playerId = await getFantasyCalcId(playerName, sleeperId);

  if (!playerId) {
    console.warn(`❌ Could not find FantasyCalc ID for player: ${playerName} (Sleeper ID: ${sleeperId})`);
    return {
      playerName,
      valueAtTrade: null,
      valueToday: null,
      gain: null,
      gainPercentage: null,
    };
  }

  console.log(`Analyzing ${playerName} (FC ID: ${playerId}) for trade date: ${tradeDate.toISOString()}`);

  try {
    const historicalValues = await getHistoricalValues(playerId);

    // console.log(`Got ${historicalValues.length} historical values for ${playerName}`);

    if (historicalValues.length === 0) {
      console.warn(`⚠️ No historical values for ${playerName} (FC ID: ${playerId})`);
      return {
        playerName,
        valueAtTrade: null,
        valueToday: null,
        gain: null,
        gainPercentage: null,
      };
    }

    const valueAtTrade = getValueAtDate(historicalValues, tradeDate);
    const valueToday = getCurrentValue(historicalValues);

    if (valueAtTrade === null || valueToday === null) {
      return {
        playerName,
        valueAtTrade,
        valueToday,
        gain: null,
        gainPercentage: null,
      };
    }

    const gain = valueToday - valueAtTrade;
    const gainPercentage = valueAtTrade > 0 ? (gain / valueAtTrade) * 100 : 0;

    return {
      playerName,
      valueAtTrade,
      valueToday,
      gain,
      gainPercentage,
    };
  } catch (error) {
    console.error(`Error analyzing player ${playerName}:`, error);
    return {
      playerName,
      valueAtTrade: null,
      valueToday: null,
      gain: null,
      gainPercentage: null,
    };
  }
}

/**
 * Analyze an entire trade
 */
export async function analyzeTrade(
  trade: TradeInfo,
  playerPositions: Record<string, string> = {}
): Promise<TradeAnalysis> {
  const tradeDate = new Date(trade.timestamp);

  // Extract player data (names + Sleeper IDs), skipping K/DST
  const team1PlayerData = extractPlayerData(trade.team1.gives, trade.team1.givesIds, playerPositions);
  const team2PlayerData = extractPlayerData(trade.team2.gives, trade.team2.givesIds, playerPositions);

  // Analyze all players
  const team1Players = await Promise.all(
    team1PlayerData.map((player) => analyzePlayer(player.name, player.sleeperId, tradeDate))
  );

  const team2Players = await Promise.all(
    team2PlayerData.map((player) => analyzePlayer(player.name, player.sleeperId, tradeDate))
  );

  // Calculate totals for team 1 (what they gave up)
  const team1AtTrade = team1Players.reduce(
    (sum: number, p: PlayerTradeValue) => sum + (p.valueAtTrade ?? 0),
    0
  );
  const team1Today = team1Players.reduce(
    (sum: number, p: PlayerTradeValue) => sum + (p.valueToday ?? 0),
    0
  );

  // Calculate totals for team 2 (what they gave up)
  const team2AtTrade = team2Players.reduce(
    (sum: number, p: PlayerTradeValue) => sum + (p.valueAtTrade ?? 0),
    0
  );
  const team2Today = team2Players.reduce(
    (sum: number, p: PlayerTradeValue) => sum + (p.valueToday ?? 0),
    0
  );

  // Team 1 gave up team1Players and received team2Players
  // So team 1's gain = (what they received today - what they gave up today) - (what they received at trade - what they gave up at trade)
  // Simplified: gain = (received today - received at trade) - (gave today - gave at trade)
  // Even more simplified: gain = (team2Today - team2AtTrade) - (team1Today - team1AtTrade)

  const team1GainOnReceived = team2Today - team2AtTrade;
  const team1GainOnGave = team1Today - team1AtTrade;
  const team1NetGain = team1GainOnReceived - team1GainOnGave;

  const team2GainOnReceived = team1Today - team1AtTrade;
  const team2GainOnGave = team2Today - team2AtTrade;
  const team2NetGain = team2GainOnReceived - team2GainOnGave;

  // Calculate percentages
  const team1GainPct =
    team1AtTrade > 0 ? (team1NetGain / team1AtTrade) * 100 : 0;
  const team2GainPct =
    team2AtTrade > 0 ? (team2NetGain / team2AtTrade) * 100 : 0;

  // Determine winner (5% threshold to call it "even")
  let winner: 'team1' | 'team2' | 'even';
  const gainDiff = Math.abs(team1NetGain - team2NetGain);
  const avgValue = (team1AtTrade + team2AtTrade) / 2;
  const diffPercentage = avgValue > 0 ? (gainDiff / avgValue) * 100 : 0;

  if (diffPercentage < 5) {
    winner = 'even';
  } else {
    winner = team1NetGain > team2NetGain ? 'team1' : 'team2';
  }

  // Determine status
  const allPlayersHaveData = [...team1Players, ...team2Players].every(
    (p) => p.valueAtTrade !== null && p.valueToday !== null
  );

  const somePlayersHaveData = [...team1Players, ...team2Players].some(
    (p) => p.valueAtTrade !== null && p.valueToday !== null
  );

  let status: 'success' | 'partial' | 'error';
  let errorMessage: string | undefined;

  if (allPlayersHaveData) {
    status = 'success';
  } else if (somePlayersHaveData) {
    status = 'partial';
    errorMessage = 'Some players could not be valued';
  } else {
    status = 'error';
    errorMessage = 'No player values could be retrieved';
  }

  return {
    tradeId: trade.id,
    status,
    errorMessage,
    team1: {
      totalValueAtTrade: team1AtTrade,
      totalValueToday: team1Today,
      totalGain: team1NetGain,
      gainPercentage: team1GainPct,
      players: team1Players,
    },
    team2: {
      totalValueAtTrade: team2AtTrade,
      totalValueToday: team2Today,
      totalGain: team2NetGain,
      gainPercentage: team2GainPct,
      players: team2Players,
    },
    winner,
    winMargin: Math.abs(team1NetGain - team2NetGain),
    analyzedAt: new Date(),
  };
}
