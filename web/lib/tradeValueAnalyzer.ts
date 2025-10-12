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

  try {
    const historicalValues = await getHistoricalValues(playerId);

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
  // Trade quality = how well did what you received perform vs what you gave up?

  // Team 1 calculations
  const team1GaveUpGain = team1Today - team1AtTrade;
  const team1GaveUpGainPct = team1AtTrade > 0 ? (team1GaveUpGain / team1AtTrade) * 100 : 0;
  const team1ReceivedGain = team2Today - team2AtTrade;
  const team1ReceivedGainPct = team2AtTrade > 0 ? (team1ReceivedGain / team2AtTrade) * 100 : 0;
  const team1TradeQuality = team1ReceivedGain - team1GaveUpGain;
  const team1TradeQualityPct = team1GaveUpGain !== 0 ? (team1TradeQuality / Math.abs(team1GaveUpGain)) * 100 : 0;

  // Team 2 calculations
  const team2GaveUpGain = team2Today - team2AtTrade;
  const team2GaveUpGainPct = team2AtTrade > 0 ? (team2GaveUpGain / team2AtTrade) * 100 : 0;
  const team2ReceivedGain = team1Today - team1AtTrade;
  const team2ReceivedGainPct = team1AtTrade > 0 ? (team2ReceivedGain / team1AtTrade) * 100 : 0;
  const team2TradeQuality = team2ReceivedGain - team2GaveUpGain;
  const team2TradeQualityPct = team2GaveUpGain !== 0 ? (team2TradeQuality / Math.abs(team2GaveUpGain)) * 100 : 0;

  // Determine winner based on trade quality (5% threshold to call it "even")
  let winner: 'team1' | 'team2' | 'even';
  const qualityDiff = Math.abs(team1TradeQuality - team2TradeQuality);
  const avgGaveUpValue = (team1AtTrade + team2AtTrade) / 2;
  const diffPercentage = avgGaveUpValue > 0 ? (qualityDiff / avgGaveUpValue) * 100 : 0;

  if (diffPercentage < 5) {
    winner = 'even';
  } else {
    winner = team1TradeQuality > team2TradeQuality ? 'team1' : 'team2';
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
      gaveUpValueAtTrade: team1AtTrade,
      gaveUpValueToday: team1Today,
      gaveUpGain: team1GaveUpGain,
      gaveUpGainPercentage: team1GaveUpGainPct,
      receivedValueAtTrade: team2AtTrade,
      receivedValueToday: team2Today,
      receivedGain: team1ReceivedGain,
      receivedGainPercentage: team1ReceivedGainPct,
      tradeQuality: team1TradeQuality,
      tradeQualityPercentage: team1TradeQualityPct,
      players: team1Players,
    },
    team2: {
      gaveUpValueAtTrade: team2AtTrade,
      gaveUpValueToday: team2Today,
      gaveUpGain: team2GaveUpGain,
      gaveUpGainPercentage: team2GaveUpGainPct,
      receivedValueAtTrade: team1AtTrade,
      receivedValueToday: team1Today,
      receivedGain: team2ReceivedGain,
      receivedGainPercentage: team2ReceivedGainPct,
      tradeQuality: team2TradeQuality,
      tradeQualityPercentage: team2TradeQualityPct,
      players: team2Players,
    },
    winner,
    winMargin: Math.abs(team1TradeQuality - team2TradeQuality),
    analyzedAt: new Date(),
  };
}
