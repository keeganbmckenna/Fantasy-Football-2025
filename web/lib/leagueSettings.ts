/**
 * League Settings Helper Functions
 * 
 * Calculates league structure information from Sleeper API settings
 */

import type { SleeperLeague, LeagueSettings } from './types';

/**
 * Extracts and calculates league settings from Sleeper API data
 * 
 * @param league - Sleeper league object from API
 * @returns Calculated league settings including playoff structure
 */
export function getLeagueSettings(league: SleeperLeague): LeagueSettings {
  const settings = league.settings || {};
  
  // Extract settings with defaults
  const startWeek = settings.start_week || 1;
  const playoffWeekStart = settings.playoff_week_start || 15;
  const playoffTeams = settings.playoff_teams || 6;
  const totalTeams = settings.num_teams || 12;
  const divisions = settings.divisions || 0;
  const hasToiletBowl = !!league.loser_bracket_id;
  
  // Calculate regular season end (week before playoffs)
  const regularSeasonEnd = playoffWeekStart - 1;
  
  // Generate playoff description based on structure
  const playoffDescription = generatePlayoffDescription(
    playoffTeams,
    divisions,
    settings.playoff_type || 0
  );
  
  // Generate toilet bowl description
  const toiletBowlDescription = generateToiletBowlDescription(
    totalTeams,
    playoffTeams,
    hasToiletBowl
  );
  
  return {
    regularSeasonStart: startWeek,
    regularSeasonEnd,
    playoffStart: playoffWeekStart,
    totalTeams,
    playoffTeams,
    divisions,
    hasToiletBowl,
    playoffDescription,
    toiletBowlDescription,
  };
}

/**
 * Generates human-readable playoff structure description
 * 
 * @param playoffTeams - Number of teams in playoffs
 * @param divisions - Number of divisions
 * @param playoffType - Playoff type from Sleeper (0 = standard bracket)
 * @returns Description of playoff structure
 */
function generatePlayoffDescription(
  playoffTeams: number,
  divisions: number,
  playoffType: number
): string {
  // Standard bracket (playoff_type = 0)
  if (playoffType === 0) {
    if (divisions > 0 && playoffTeams >= divisions) {
      const wildCards = playoffTeams - divisions;
      const hasByes = playoffTeams > 4;
      
      if (hasByes) {
        return `${playoffTeams}-team single elimination bracket. Top ${divisions} division winners get first-round byes, ${wildCards} wild card teams compete.`;
      }
      
      return `${playoffTeams}-team single elimination bracket. ${divisions} division winners and ${wildCards} wild card teams.`;
    }
    
    return `${playoffTeams}-team single elimination bracket.`;
  }
  
  return `${playoffTeams}-team playoff bracket.`;
}

/**
 * Generates toilet bowl description
 * 
 * @param totalTeams - Total teams in league
 * @param playoffTeams - Teams in playoffs
 * @param hasToiletBowl - Whether toilet bowl exists
 * @returns Description of toilet bowl structure
 */
function generateToiletBowlDescription(
  totalTeams: number,
  playoffTeams: number,
  hasToiletBowl: boolean
): string {
  if (!hasToiletBowl) {
    return 'No toilet bowl bracket.';
  }
  
  const toiletBowlTeams = totalTeams - playoffTeams;
  const hasByes = toiletBowlTeams > 4;
  
  if (hasByes) {
    return `${toiletBowlTeams}-team toilet bowl bracket. Bottom 2 teams get first-round byes.`;
  }
  
  return `${toiletBowlTeams}-team toilet bowl bracket for non-playoff teams.`;
}

/**
 * Calculates the number of regular season games
 * 
 * @param settings - League settings
 * @returns Number of regular season weeks
 */
export function getRegularSeasonWeeks(settings: LeagueSettings): number {
  return settings.regularSeasonEnd - settings.regularSeasonStart + 1;
}

/**
 * Determines if a given week is in the regular season
 * 
 * @param week - Week number to check
 * @param settings - League settings
 * @returns True if week is in regular season
 */
export function isRegularSeasonWeek(week: number, settings: LeagueSettings): boolean {
  return week >= settings.regularSeasonStart && week <= settings.regularSeasonEnd;
}

/**
 * Determines if a given week is in the playoffs
 * 
 * @param week - Week number to check
 * @param settings - League settings
 * @returns True if week is in playoffs
 */
export function isPlayoffWeek(week: number, settings: LeagueSettings): boolean {
  return week >= settings.playoffStart;
}
