'use client';

import { TeamStats, DivisionStanding, WildCardStanding } from '@/lib/types';
import SectionCard from './ui/SectionCard';

interface PlayoffRaceProps {
  divisions: DivisionStanding[];
  wildCard: WildCardStanding[];
  standings: TeamStats[];
  playoffTeams: number;
}

interface TeamRowProps {
  team: TeamStats;
  rank: number;
  gamesBack?: number;
  pointsBack?: number;
  isLeader?: boolean;
  showDivision?: boolean;
  isInPlayoffs?: boolean;
  showCutoffLine?: boolean;
}

function TeamRow({
  team,
  rank,
  gamesBack,
  pointsBack,
  isLeader = false,
  showDivision = false,
  isInPlayoffs = false,
  showCutoffLine = false,
}: TeamRowProps) {
  return (
    <>
      <tr
        className={`
          ${isInPlayoffs ? 'bg-[var(--success-bg)]' : ''}
          ${isLeader ? 'font-semibold bg-[var(--info-bg)]' : ''}
          hover:bg-[var(--surface)] transition-colors
        `}
      >
        <td className="px-4 py-3 text-sm text-[var(--foreground)]">
          {rank}
          {isLeader && <span className="ml-1">🥇</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {team.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.avatarUrl}
                alt={team.teamName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--neutral-bg)] flex items-center justify-center text-[var(--neutral-text)] font-semibold">
                {team.teamName.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">
                {team.teamName}
              </div>
              <div className="text-xs text-[var(--muted)]">@{team.username}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-[var(--foreground)]">
          {team.wins}-{team.losses}
          {team.ties > 0 && `-${team.ties}`}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--foreground)]">
          {team.totalPoints.toFixed(2)}
        </td>
        {showDivision && (
          <td className="px-4 py-3 text-xs">
            <span className="px-2 py-1 bg-[var(--neutral-bg)] text-[var(--neutral-text)] rounded">
              {team.divisionName || `Div ${team.division}`}
            </span>
          </td>
        )}
        <td className="px-4 py-3 text-sm text-[var(--foreground)] font-semibold">
          {gamesBack !== undefined && gamesBack > 0 ? '+' : ''}
          {gamesBack !== undefined && gamesBack !== 0 ? Math.abs(gamesBack).toFixed(1) : ''}
          {(gamesBack === 0) && '—'}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--foreground)] font-semibold">
          {pointsBack !== undefined && pointsBack !== 0
            ? (pointsBack > 0 ? `+${pointsBack.toFixed(2)}` : Math.abs(pointsBack).toFixed(2))
            : ''}
          {(pointsBack === 0) && '—'}
        </td>
      </tr>
      {showCutoffLine && (
        <tr>
          <td colSpan={showDivision ? 8 : 7} className="px-0 py-0">
            <div className="border-t-2 border-dashed border-red-500 relative">
              <span className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-[var(--surface-elevated)] px-2 text-xs font-semibold text-red-500">
                PLAYOFF CUTOFF
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DivisionCard({ division }: { division: DivisionStanding }) {
  const leaderPoints = Math.max(...division.teams.map(t => t.totalPoints));
  return (
    <div className="bg-[var(--surface-elevated)] rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3">
        <h3 className="text-lg font-bold text-white">
          {division.divisionName || `Division ${division.division}`}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] table-fixed">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-12">Rank</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-56">Team</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-20">Record</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-24">Points</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-20">GB</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-24">PB</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--surface-elevated)] divide-y divide-[var(--border)]">
            {division.teams.map((team) => (
              <TeamRow
                key={team.username}
                team={team}
                rank={team.divisionRank || 0}
                gamesBack={team.gamesBack}
                pointsBack={team.totalPoints - leaderPoints}
                isLeader={team.isDivisionLeader}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverallStandingsCard({
  standings,
  playoffTeams,
}: {
  standings: TeamStats[];
  playoffTeams: number;
}) {
  const hasCutoff = playoffTeams > 0 && standings.length > 0;
  const cutoffIndex = hasCutoff ? Math.min(playoffTeams, standings.length) - 1 : -1;
  const cutoffTeam = hasCutoff ? standings[cutoffIndex] : undefined;

  const getGamesBack = (team: TeamStats) => {
    if (!cutoffTeam) {
      return 0;
    }

    const winDiff = cutoffTeam.wins - team.wins;
    const lossDiff = team.losses - cutoffTeam.losses;
    return -(winDiff + lossDiff) / 2;
  };

  return (
    <SectionCard
      title="Standings"
      subtitle="Overall league standings"
      gradientType="primary"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] table-fixed">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-12">Rank</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-56">Team</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-20">Record</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-24">Points</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-20">GB</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase w-24">PB</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--surface-elevated)] divide-y divide-[var(--border)]">
            {standings.map((team, index) => (
              <TeamRow
                key={team.username}
                team={team}
                rank={team.standing}
                gamesBack={getGamesBack(team)}
                pointsBack={cutoffTeam ? team.totalPoints - cutoffTeam.totalPoints : 0}
                isLeader={team.standing === 1}
                isInPlayoffs={hasCutoff && team.standing <= playoffTeams}
                showCutoffLine={hasCutoff && index === cutoffIndex}
              />
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function WildCardCard({
  wildCard,
}: {
  wildCard: WildCardStanding[];
}) {
  const lastInPoints = wildCard.filter(wc => wc.isIn).slice(-1)[0]?.team.totalPoints || 0;
  return (
    <SectionCard
      title="Wild Card Race"
      subtitle="Non-division leaders competing for playoff spots"
      gradientType="accent"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                Team
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                Record
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                Points
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                Division
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                GB
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)] uppercase">
                PB
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--surface-elevated)] divide-y divide-[var(--border)]">
            {wildCard.map((standing, index) => {
              // Find the cutoff - last team that's IN
              const isLastIn = standing.isIn && (!wildCard[index + 1] || !wildCard[index + 1].isIn);

              return (
                <TeamRow
                  key={standing.team.username}
                  team={standing.team}
                  rank={standing.rank}
                  gamesBack={standing.gamesOut}
                  pointsBack={standing.team.totalPoints - lastInPoints}
                  showDivision={true}
                  isInPlayoffs={standing.isIn}
                  showCutoffLine={isLastIn}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default function PlayoffRace({ divisions, wildCard, standings, playoffTeams }: PlayoffRaceProps) {
  return (
    <div className="space-y-6">
      {/* Division Standings or Overall Standings */}
      {divisions.length > 0 ? (
        <div className="space-y-6">
          {divisions.map((division) => (
            <DivisionCard key={division.division} division={division} />
          ))}
        </div>
      ) : (
        <OverallStandingsCard standings={standings} playoffTeams={playoffTeams} />
      )}

      {/* Wild Card Race */}
      {wildCard.length > 0 && (
        <WildCardCard wildCard={wildCard} />
      )}
    </div>
  );
}
