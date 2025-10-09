import { NextResponse } from 'next/server';

interface SleeperPlayer {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  team?: string;
  position?: string;
}

export async function GET() {
  try {
    // Fetch with 24 hour cache
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch player data from Sleeper');
    }

    const players: Record<string, SleeperPlayer> = await res.json();

    // Create a simplified map of player ID to player name
    const playerMap: Record<string, string> = {};

    Object.entries(players).forEach(([id, player]) => {
      if (player.player_id) {
        // Format: "FirstName LastName (Team POS)"
        const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
        const team = player.team || '';
        const position = player.position || '';

        if (name) {
          playerMap[id] = team && position ? `${name} (${team} ${position})` : name;
        }
      }
    });

    return NextResponse.json({ players: playerMap });
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}
