/**
 * Application configuration with environment variable support
 */

/**
 * Sleeper API configuration
 */
export const SLEEPER_CONFIG = {
  /**
   * League ID - can be overridden via NEXT_PUBLIC_LEAGUE_ID environment variable
   * Default: Tangy Football league
   */
  leagueId: process.env.NEXT_PUBLIC_LEAGUE_ID || '1227033344391254016',

  /**
   * Base URL for Sleeper API
   */
  baseUrl: 'https://api.sleeper.app/v1',

  /**
   * Maximum number of weeks to fetch (regular season)
   */
  maxWeeks: 18,
} as const;

/**
 * Application metadata
 */
export const APP_CONFIG = {
  name: 'Tangy Football',
  description: 'Advanced fantasy football analytics and insights powered by Sleeper',
  author: 'Fantasy Football Analytics',
} as const;
