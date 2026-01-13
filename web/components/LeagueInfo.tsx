'use client';

import { SleeperLeague } from '@/lib/types';
import { getLeagueSettings, getRegularSeasonWeeks } from '@/lib/leagueSettings';
import SectionCard from './ui/SectionCard';

interface LeagueInfoProps {
  league: SleeperLeague;
}

/**
 * Displays league structure and settings information
 * Dynamically calculated from Sleeper API settings
 */
export function LeagueInfo({ league }: LeagueInfoProps) {
  const settings = getLeagueSettings(league);
  const regularSeasonWeeks = getRegularSeasonWeeks(settings);

  return (
    <SectionCard
      title="League Structure"
      subtitle={`${league.name} - ${league.season} Season`}
      gradientType="info"
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Regular Season Info */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📅</span>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Regular Season
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Weeks:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {settings.regularSeasonStart}-{settings.regularSeasonEnd}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Games:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {regularSeasonWeeks}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Teams:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {settings.totalTeams}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Divisions:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {settings.divisions}
                </span>
              </div>
            </div>
          </div>

          {/* Playoff Info */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Playoffs
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Start Week:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  Week {settings.playoffStart}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">Teams:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {settings.playoffTeams}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-2">
              {settings.playoffDescription}
            </p>
          </div>

          {/* Toilet Bowl Info */}
          {settings.hasToiletBowl && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🚽</span>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Toilet Bowl
                </h3>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {settings.toiletBowlDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
