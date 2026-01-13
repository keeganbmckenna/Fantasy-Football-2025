# League Settings Update - Summary

## Overview
Updated the Fantasy Football application to dynamically display league structure information based on Sleeper API settings. All league configuration is now pulled directly from the API, so changes to league settings in Sleeper will automatically reflect on the site.

## Changes Made

### 1. Updated Type Definitions (`web/lib/types.ts`)
Added new fields to `SleeperLeague` interface:
- `playoff_week_start` - Week when playoffs begin
- `playoff_type` - Type of playoff bracket (0 = standard)
- `playoff_seed_type` - How playoff seeding works
- `playoff_round_type` - Playoff round structure
- `start_week` - First week of regular season
- `num_teams` - Total teams in league
- `bracket_id` - Playoff bracket ID
- `loser_bracket_id` - Toilet bowl bracket ID

Added new `LeagueSettings` interface for calculated league structure info.

### 2. Created League Settings Helper (`web/lib/leagueSettings.ts`)
New utility functions to calculate league structure from API data:

**`getLeagueSettings(league)`**
- Extracts settings from Sleeper API
- Calculates regular season end (playoff_week_start - 1)
- Generates human-readable descriptions
- Returns structured league settings object

**`generatePlayoffDescription()`**
- Creates playoff structure description
- Handles division winners and wild cards
- Describes bye week structure

**`generateToiletBowlDescription()`**
- Creates toilet bowl description
- Calculates number of teams
- Describes bye structure for bottom teams

**Helper functions:**
- `getRegularSeasonWeeks()` - Count of regular season games
- `isRegularSeasonWeek()` - Check if week is regular season
- `isPlayoffWeek()` - Check if week is playoffs

### 3. Created League Info Component (`web/components/LeagueInfo.tsx`)
New component displaying league structure:
- **Regular Season Section**
  - Week range (e.g., "Weeks 1-14")
  - Number of games
  - Total teams
  - Number of divisions

- **Playoff Section**
  - Playoff start week
  - Number of playoff teams
  - Detailed playoff structure description

- **Toilet Bowl Section** (if applicable)
  - Number of teams
  - Bye structure
  - Description

### 4. Updated Main Page (`web/app/page.tsx`)
- Added `LeagueInfo` component import
- Placed component at top of Overview tab
- Component displays before Playoff Race

## How It Works

### Data Flow
1. **API Fetch** - Sleeper API returns league object with settings
2. **Calculation** - `getLeagueSettings()` processes raw API data
3. **Display** - `LeagueInfo` component renders structured information

### Example Output
Based on your league settings:
```
Regular Season: Weeks 1-14 (14 games)
Teams: 12
Divisions: 3

Playoffs: Week 15
Teams: 6
Structure: 6-team single elimination bracket. Top 3 division winners 
get first-round byes, 3 wild card teams compete.

Toilet Bowl: 6-team toilet bowl bracket. Bottom 2 teams get first-round byes.
```

## API Settings Used

From `league.settings`:
- `start_week`: 1
- `playoff_week_start`: 15
- `playoff_teams`: 6
- `playoff_type`: 0 (standard bracket)
- `divisions`: 3
- `num_teams`: 12

From `league`:
- `loser_bracket_id`: Determines if toilet bowl exists

## Benefits

1. **Dynamic** - Automatically updates when league settings change
2. **Accurate** - No hardcoded values, all from API
3. **Clear** - Human-readable descriptions of structure
4. **Maintainable** - Pure functions, easy to test and modify
5. **Reusable** - Helper functions can be used elsewhere

## Testing

Build completed successfully:
```bash
npm run build
✓ Compiled successfully
✓ Generating static pages (8/8)
```

Development server running on http://localhost:3000

## Future Enhancements

Potential additions:
- Playoff bracket visualization
- Toilet bowl standings
- Playoff probability calculator
- Historical playoff data
- Championship odds based on current standings
