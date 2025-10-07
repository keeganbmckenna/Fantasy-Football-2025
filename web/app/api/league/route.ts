import { NextResponse } from 'next/server';
import { SLEEPER_CONFIG } from '@/lib/config';
import type { SleeperUser, SleeperRoster, SleeperMatchup } from '@/lib/types';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { leagueId, baseUrl, maxWeeks } = SLEEPER_CONFIG;

    // Fetch all data in parallel with no-cache headers
    const [leagueRes, usersRes, rostersRes] = await Promise.all([
      fetch(`${baseUrl}/league/${leagueId}`, { cache: 'no-store' }),
      fetch(`${baseUrl}/league/${leagueId}/users`, { cache: 'no-store' }),
      fetch(`${baseUrl}/league/${leagueId}/rosters`, { cache: 'no-store' }),
    ]);

    const league = await leagueRes.json();
    const users: SleeperUser[] = await usersRes.json();
    const rosters: SleeperRoster[] = await rostersRes.json();

    // Get current week or default to 14
    const currentWeek = league.settings?.leg || 14;

    // Fetch matchups for all weeks with no-cache
    const matchupPromises = [];
    for (let week = 1; week <= Math.min(currentWeek, maxWeeks); week++) {
      matchupPromises.push(
        fetch(`${baseUrl}/league/${leagueId}/matchups/${week}`, { cache: 'no-store' }).then(res => res.json())
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
