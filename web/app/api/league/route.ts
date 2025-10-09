import { NextResponse } from 'next/server';
import { SLEEPER_CONFIG } from '@/lib/config';
import type { SleeperUser, SleeperRoster, SleeperMatchup } from '@/lib/types';

export async function GET() {
  try {
    const { leagueId, baseUrl, maxWeeks } = SLEEPER_CONFIG;

    // Fetch all data in parallel with 5 minute cache
    const [leagueRes, usersRes, rostersRes] = await Promise.all([
      fetch(`${baseUrl}/league/${leagueId}`, { next: { revalidate: 300 } }),
      fetch(`${baseUrl}/league/${leagueId}/users`, { next: { revalidate: 300 } }),
      fetch(`${baseUrl}/league/${leagueId}/rosters`, { next: { revalidate: 300 } }),
    ]);

    const league = await leagueRes.json();
    const users: SleeperUser[] = await usersRes.json();
    const rosters: SleeperRoster[] = await rostersRes.json();

    // Get current week or default to 14
    const currentWeek = league.settings?.leg || 14;

    // Fetch matchups for all weeks
    const matchupPromises = [];
    for (let week = 1; week <= Math.min(currentWeek, maxWeeks); week++) {
      matchupPromises.push(
        fetch(`${baseUrl}/league/${leagueId}/matchups/${week}`).then(res => res.json())
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

    // Build division names from league metadata
    const divisionNames: Record<number, string> = {};
    if (league.metadata) {
      if (league.metadata.division_1) divisionNames[1] = league.metadata.division_1;
      if (league.metadata.division_2) divisionNames[2] = league.metadata.division_2;
      if (league.metadata.division_3) divisionNames[3] = league.metadata.division_3;
    }

    return NextResponse.json({
      league,
      users,
      rosters,
      matchups: matchupsByWeek,
      userMap,
      rosterToUserMap,
      lastScoredWeek: league.settings?.last_scored_leg || currentWeek,
      divisionNames,
    });
  } catch (error) {
    console.error('Error fetching league data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}
