import { CACHE_CONFIG, RETRY_CONFIG } from './config';

interface CachedData {
  data: unknown;
  timestamp: number;
}

const MAX_CACHE_SIZE = 1000;
const cache = new Map<string, CachedData>();

function addToCache(key: string, data: unknown): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Sleep helper for retry delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries,
  delay: number = RETRY_CONFIG.initialDelay,
  attempt: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= retries) {
      throw error;
    }
    console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
    await sleep(delay);
    return retryWithBackoff(fn, retries, delay * 2, attempt + 1);
  }
}

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
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.playerData) {
    // Only return cached data if it's not empty
    if (Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as HistoricalValue[];
    }
    // If cached data is empty, clear it and retry
    console.log(`Clearing empty cache for player ${playerId} and retrying...`);
    cache.delete(cacheKey);
  }

  try {
    // Use retry logic with exponential backoff
    const data = await retryWithBackoff(async () => {
      const response = await fetch(
        `https://api.fantasycalc.com/trades/implied/${playerId}?isDynasty=false&numQbs=1`
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Player ${playerId} not found in FantasyCalc (404)`);
          // Return special marker for 404 - don't retry
          return { historicalValues: [], is404: true };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const jsonData: HistoricalValuesResponse = await response.json();

      // If we got a successful response but no data, it means the player legitimately has no historical values
      // Don't throw an error - just return the empty array
      if (!jsonData.historicalValues || jsonData.historicalValues.length === 0) {
        console.log(`No historical values available for player ${playerId}`);
        return { historicalValues: [], noData: true };
      }

      return jsonData;
    });

    // Handle special cases (404 or no data available)
    if ('is404' in data && data.is404) {
      return [];
    }
    if ('noData' in data && data.noData) {
      return [];
    }

    if (data.historicalValues && data.historicalValues.length > 0) {
      addToCache(cacheKey, data.historicalValues);
      console.log(`✓ Cached ${data.historicalValues.length} historical values for player ${playerId}`);
    }

    return data.historicalValues;
  } catch (error) {
    console.error(`Error fetching historical values for player ${playerId} after retries:`, error);
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

  // Check cache first - only use if it has data
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.playerData) {
    if (Array.isArray(cached.data) && cached.data.length > 0) {
      console.log(`✓ Using cached player list (${cached.data.length} players)`);
      return cached.data as FantasyCalcPlayer[];
    }
    // If cached data is empty, clear it and retry
    console.log('Clearing empty player list cache and retrying...');
    cache.delete(cacheKey);
  }

  try {
    // Use retry logic with exponential backoff
    const players = await retryWithBackoff(async () => {
      console.log('Fetching player list from FantasyCalc API...');
      const response = await fetch(
        'https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1'
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: FantasyCalcPlayer[] = await response.json();

      // Validate that we got actual data - this is critical, so retry if empty
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('Empty or invalid player list returned from API, will retry...');
        throw new Error('Empty player list returned from API');
      }

      console.log(`✓ Fetched ${data.length} players from FantasyCalc API`);
      return data;
    });

    if (players.length > 0) {
      addToCache(cacheKey, players);
      console.log(`✓ Cached player list (${players.length} players)`);
    }

    return players;
  } catch (error) {
    console.error('Error fetching player list from FantasyCalc after retries:', error);
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
  let players = await fetchAllPlayers();

  // If player list is empty, clear cache and retry once
  if (players.length === 0) {
    console.warn('No players loaded from FantasyCalc, clearing cache and retrying...');
    cache.delete('all_players');
    players = await fetchAllPlayers();

    if (players.length === 0) {
      console.error('Still no players loaded from FantasyCalc after retry');
      return null;
    }
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
