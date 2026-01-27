import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

interface SleeperPlayer {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  team?: string;
  position?: string;
}

const fetchPlayersData = unstable_cache(
  async () => {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch player data from Sleeper');
    }

    const players: Record<string, SleeperPlayer> = await res.json();

    const playerMap: Record<string, string> = {};
    const playerPositions: Record<string, string> = {};

    Object.entries(players).forEach(([id, player]) => {
      if (player.player_id) {
        const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
        const team = player.team || '';
        const position = player.position || '';

        if (name) {
          playerMap[id] = team && position ? `${name} (${team} ${position})` : name;
          playerPositions[id] = position;
        }
      }
    });

    return { players: playerMap, positions: playerPositions };
  },
  ['players-data'],
  { revalidate: 86400, tags: ['players'] }
);

export async function GET() {
  try {
    const data = await fetchPlayersData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}
