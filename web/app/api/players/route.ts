import { NextResponse } from 'next/server';

interface SleeperPlayer {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  team?: string;
  position?: string;
}

// In-memory cache
let cachedPlayerMap: Record<string, string> | null = null;
let cachedPlayerPositions: Record<string, string> | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if it's less than 24 hours old
    if (cachedPlayerMap && cachedPlayerPositions && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({
        players: cachedPlayerMap,
        positions: cachedPlayerPositions
      });
    }

    // Fetch fresh data - disable Next.js cache to avoid 2MB limit error
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error('Failed to fetch player data from Sleeper');
    }

    const players: Record<string, SleeperPlayer> = await res.json();

    // Create maps for player names and positions
    const playerMap: Record<string, string> = {};
    const playerPositions: Record<string, string> = {};

    Object.entries(players).forEach(([id, player]) => {
      if (player.player_id) {
        // Format: "FirstName LastName (Team POS)"
        const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
        const team = player.team || '';
        const position = player.position || '';

        if (name) {
          playerMap[id] = team && position ? `${name} (${team} ${position})` : name;
          playerPositions[id] = position;
        }
      }
    });

    // Update cache
    cachedPlayerMap = playerMap;
    cachedPlayerPositions = playerPositions;
    lastFetchTime = now;

    return NextResponse.json({
      players: playerMap,
      positions: playerPositions
    });
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}
