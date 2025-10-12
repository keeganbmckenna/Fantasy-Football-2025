// Simple in-memory cache for FantasyCalc API responses
interface CachedData {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CachedData>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const PLAYER_LIST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for player list

interface HistoricalValue {
  date: string; // Format: "MM/DD/YYYY"
  value: number;
}

interface HistoricalValuesResponse {
  historicalValues: HistoricalValue[];
  impliedValues: unknown[]; // We don't use this for now
}

interface FantasyCalcPlayer {
  player: {
    id: number;
    name: string;
    position: string;
    sleeperId?: string;
    mflId?: string;
  };
  value: number;
  overallRank: number;
  positionRank: number;
  trend30Day: number;
}

/**
 * Fetch historical values for a player from FantasyCalc
 */
export async function getHistoricalValues(
  playerId: string
): Promise<HistoricalValue[]> {
  const cacheKey = `history_${playerId}`;

  // Check cache first - but only use it if it has actual data
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Only return cached data if it's not empty
    if (Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as HistoricalValue[];
    }
    // If cached data is empty, fall through to fetch fresh data
  }

  try {
    const response = await fetch(
      `https://api.fantasycalc.com/trades/implied/${playerId}?isDynasty=false&numQbs=1`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Player ${playerId} not found in FantasyCalc`);
        return [];
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data: HistoricalValuesResponse = await response.json();

    // Only cache if we got actual data
    if (data.historicalValues && data.historicalValues.length > 0) {
      cache.set(cacheKey, {
        data: data.historicalValues,
        timestamp: Date.now(),
      });
    }

    return data.historicalValues;
  } catch (error) {
    console.error(`Error fetching historical values for player ${playerId}:`, error);
    return [];
  }
}

/**
 * Get player value at a specific date (or closest available date)
 */
export function getValueAtDate(
  historicalValues: HistoricalValue[],
  targetDate: Date
): number | null {
  if (historicalValues.length === 0) {
    return null;
  }

  // Convert target date to "MM/DD/YYYY" format
  const targetStr = formatDate(targetDate);

  // Try to find exact match
  const exactMatch = historicalValues.find((v) => v.date === targetStr);
  if (exactMatch) {
    return exactMatch.value;
  }

  // Find closest date (prefer earlier dates for "at trade" values)
  const targetTime = targetDate.getTime();
  let closest = historicalValues[0];
  let closestDiff = Math.abs(parseDate(closest.date).getTime() - targetTime);

  for (const value of historicalValues) {
    const valueDate = parseDate(value.date);
    const diff = Math.abs(valueDate.getTime() - targetTime);

    if (diff < closestDiff) {
      closest = value;
      closestDiff = diff;
    }
  }

  return closest.value;
}

/**
 * Get current (most recent) value for a player
 */
export function getCurrentValue(
  historicalValues: HistoricalValue[]
): number | null {
  if (historicalValues.length === 0) {
    return null;
  }

  // Find the most recent value
  const sorted = [...historicalValues].sort((a, b) => {
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return sorted[0].value;
}

/**
 * Helper: Format Date to "MM/DD/YYYY"
 */
function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Helper: Parse "MM/DD/YYYY" to Date
 */
function parseDate(dateStr: string): Date {
  const [month, day, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Fetch all players from FantasyCalc with their IDs
 * Cached for 24 hours
 */
async function fetchAllPlayers(): Promise<FantasyCalcPlayer[]> {
  const cacheKey = 'all_players';

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PLAYER_LIST_CACHE_DURATION) {
    return cached.data as FantasyCalcPlayer[];
  }

  try {
    const response = await fetch(
      'https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1'
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const players: FantasyCalcPlayer[] = await response.json();

    // Store in cache
    cache.set(cacheKey, {
      data: players,
      timestamp: Date.now(),
    });

    return players;
  } catch (error) {
    console.error('Error fetching player list from FantasyCalc:', error);
    return [];
  }
}

/**
 * Strip position/team suffix from player name
 * Example: "Sam LaPorta (DET TE)" -> "Sam LaPorta"
 */
function stripPositionSuffix(playerName: string): string {
  // Remove anything in parentheses and trim
  return playerName.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

/**
 * Normalize player name for comparison
 */
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove periods (e.g., "A.J." -> "AJ")
    .replace(/\./g, '')
    // Remove apostrophes (e.g., "Ja'Marr" -> "Jamarr")
    .replace(/'/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ');
}

/**
 * Try to find FantasyCalc ID for a player using Sleeper ID (preferred) or name
 */
export async function getFantasyCalcId(
  playerName: string,
  sleeperId?: string
): Promise<string | null> {
  // Fetch all players
  const players = await fetchAllPlayers();

  if (players.length === 0) {
    console.warn('No players loaded from FantasyCalc');
    return null;
  }

  // PREFERRED: Try matching by Sleeper ID first (100% accurate)
  if (sleeperId) {
    for (const player of players) {
      if (player.player.sleeperId === sleeperId) {
        return String(player.player.id);
      }
    }
  }

  // FALLBACK: Match by name if Sleeper ID not found
  const cleanName = stripPositionSuffix(playerName);
  const normalizedSearch = normalizePlayerName(cleanName);

  // Try exact match
  for (const player of players) {
    if (normalizePlayerName(player.player.name) === normalizedSearch) {
      return String(player.player.id);
    }
  }

  // Try partial match (only if the normalized names are very similar)
  for (const player of players) {
    const normalizedPlayerName = normalizePlayerName(player.player.name);
    const lengthDiff = Math.abs(normalizedPlayerName.length - normalizedSearch.length);

    if (lengthDiff <= 3) {
      if (
        normalizedPlayerName.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedPlayerName)
      ) {
        return String(player.player.id);
      }
    }
  }

  console.warn(`Could not find FantasyCalc ID for player: ${cleanName} (Sleeper ID: ${sleeperId || 'none'})`);
  return null;
}

/**
 * Clear the cache (useful for testing or debugging)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Clear cache for a specific player (useful for debugging)
 */
export function clearPlayerCache(playerId: string): void {
  const cacheKey = `history_${playerId}`;
  cache.delete(cacheKey);
}

/**
 * Debug: Get cache statistics
 */
export function debugCache(): { size: number } {
  return { size: cache.size };
}
