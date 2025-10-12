import type { ProcessedTransaction } from './types';
import {
  getHistoricalValues,
  getValueAtDate,
  getCurrentValue,
  getFantasyCalcId,
} from './fantasycalc-api';

export interface PlayerValueChange {
  playerName: string;
  playerId: string;
  valueAtTransaction: number | null;
  valueToday: number | null;
  gain: number | null;
  gainPercentage: number | null;
}

export interface AddDropAnalysis {
  transactionId: string;
  status: 'success' | 'partial' | 'error';
  errorMessage?: string;
  addedPlayer: PlayerValueChange | null;
  droppedPlayer: PlayerValueChange | null;
  netChange: number;
  netChangePercentage: number;
  analyzedAt: Date;
}

/**
 * Analyze a single player's value change from transaction date to today
 */
async function analyzePlayerValueChange(
  playerName: string,
  playerId: string,
  transactionDate: Date
): Promise<PlayerValueChange> {
  const fcPlayerId = await getFantasyCalcId(playerName, playerId);

  if (!fcPlayerId) {
    console.warn(`Could not find FantasyCalcId for player: ${playerName} (Sleeper ID: ${playerId})`);
    return {
      playerName,
      playerId,
      valueAtTransaction: null,
      valueToday: null,
      gain: null,
      gainPercentage: null,
    };
  }

  try {
    const historicalValues = await getHistoricalValues(fcPlayerId);

    if (historicalValues.length === 0) {
      return {
        playerName,
        playerId,
        valueAtTransaction: null,
        valueToday: null,
        gain: null,
        gainPercentage: null,
      };
    }

    const valueAtTransaction = getValueAtDate(historicalValues, transactionDate);
    const valueToday = getCurrentValue(historicalValues);

    if (valueAtTransaction === null || valueToday === null) {
      return {
        playerName,
        playerId,
        valueAtTransaction,
        valueToday,
        gain: null,
        gainPercentage: null,
      };
    }

    const gain = valueToday - valueAtTransaction;
    const gainPercentage = valueAtTransaction > 0 ? (gain / valueAtTransaction) * 100 : 0;

    return {
      playerName,
      playerId,
      valueAtTransaction,
      valueToday,
      gain,
      gainPercentage,
    };
  } catch (error) {
    console.error(`Error analyzing player ${playerName}:`, error);
    return {
      playerName,
      playerId,
      valueAtTransaction: null,
      valueToday: null,
      gain: null,
      gainPercentage: null,
    };
  }
}

/**
 * Analyze an add/drop/swap transaction
 */
export async function analyzeAddDrop(
  transaction: ProcessedTransaction,
  playerPositions: Record<string, string> = {}
): Promise<AddDropAnalysis> {
  const transactionDate = new Date(transaction.timestamp);

  let addedPlayer: PlayerValueChange | null = null;
  let droppedPlayer: PlayerValueChange | null = null;

  // Skip kickers and defenses
  const shouldSkipPlayer = (playerId?: string) => {
    if (!playerId) return true;
    const position = playerPositions[playerId];
    return position === 'K' || position === 'DEF';
  };

  // Analyze added player
  if (transaction.playerName && transaction.playerId && !shouldSkipPlayer(transaction.playerId)) {
    addedPlayer = await analyzePlayerValueChange(
      transaction.playerName,
      transaction.playerId,
      transactionDate
    );
  }

  // Analyze dropped player (for swaps)
  if (transaction.droppedPlayerName && transaction.droppedPlayerId && !shouldSkipPlayer(transaction.droppedPlayerId)) {
    droppedPlayer = await analyzePlayerValueChange(
      transaction.droppedPlayerName,
      transaction.droppedPlayerId,
      transactionDate
    );
  }

  // Calculate net change
  const addedGain = addedPlayer?.gain ?? 0;
  const droppedGain = droppedPlayer?.gain ?? 0;
  const netChange = addedGain - droppedGain;

  // Calculate net change percentage based on what was dropped
  const droppedValue = droppedPlayer?.valueAtTransaction ?? 0;
  const netChangePercentage = droppedValue > 0 ? (netChange / droppedValue) * 100 : 0;

  // Determine status
  const hasAddedData = addedPlayer && addedPlayer.valueAtTransaction !== null && addedPlayer.valueToday !== null;
  const hasDroppedData = droppedPlayer && droppedPlayer.valueAtTransaction !== null && droppedPlayer.valueToday !== null;

  let status: 'success' | 'partial' | 'error';
  let errorMessage: string | undefined;

  // For pure adds
  if (!transaction.droppedPlayerId && hasAddedData) {
    status = 'success';
  } else if (!transaction.droppedPlayerId && !hasAddedData) {
    status = 'error';
    errorMessage = 'Could not retrieve player value';
  }
  // For pure drops
  else if (!transaction.playerId && hasDroppedData) {
    status = 'success';
  } else if (!transaction.playerId && !hasDroppedData) {
    status = 'error';
    errorMessage = 'Could not retrieve player value';
  }
  // For swaps
  else if (hasAddedData && hasDroppedData) {
    status = 'success';
  } else if (hasAddedData || hasDroppedData) {
    status = 'partial';
    errorMessage = 'Some player values could not be retrieved';
  } else {
    status = 'error';
    errorMessage = 'No player values could be retrieved';
  }

  return {
    transactionId: transaction.id,
    status,
    errorMessage,
    addedPlayer,
    droppedPlayer,
    netChange,
    netChangePercentage,
    analyzedAt: new Date(),
  };
}
