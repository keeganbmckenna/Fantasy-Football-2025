import { NextResponse } from 'next/server';

const LEAGUE_ID = '1227033344391254016';
const BASE_URL = 'https://api.sleeper.app/v1';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
}

interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
  };
}

interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
}

export async function GET() {
  try {
    // Fetch all data in parallel with no-cache headers
    const [leagueRes, usersRes, rostersRes] = await Promise.all([
      fetch(`${BASE_URL}/league/${LEAGUE_ID}`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/league/${LEAGUE_ID}/users`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters`, { cache: 'no-store' }),
    ]);

    const league = await leagueRes.json();
    const users: SleeperUser[] = await usersRes.json();
    const rosters: SleeperRoster[] = await rostersRes.json();

    // Get current week or default to 14
    const currentWeek = league.settings?.leg || 14;

    // Fetch matchups for all weeks with no-cache
    const matchupPromises = [];
    for (let week = 1; week <= Math.min(currentWeek, 18); week++) {
      matchupPromises.push(
        fetch(`${BASE_URL}/league/${LEAGUE_ID}/matchups/${week}`, { cache: 'no-store' }).then(res => res.json())
      );
    }
    const matchupsArray = await Promise.all(matchupPromises);

    // Create user map
    const userMap = users.reduce((acc: Record<string, SleeperUser>, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {});

    // Create roster to user map
    const rosterToUserMap = rosters.reduce((acc: Record<number, string>, roster) => {
      acc[roster.roster_id] = roster.owner_id;
      return acc;
    }, {});

    // Process matchups by week
    const matchupsByWeek: Record<number, SleeperMatchup[]> = {};
    matchupsArray.forEach((matchups, index) => {
      matchupsByWeek[index + 1] = matchups;
    });

    return NextResponse.json(
      {
        league,
        users,
        rosters,
        matchups: matchupsByWeek,
        userMap,
        rosterToUserMap,
        lastScoredWeek: league.settings?.last_scored_leg || currentWeek,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching league data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}
