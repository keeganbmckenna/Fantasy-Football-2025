'use client';

import { TeamStats, DivisionStanding, WildCardStanding } from '@/lib/types';
import SectionCard from './ui/SectionCard';

interface PlayoffRaceProps {
  divisions: DivisionStanding[];
  wildCard: WildCardStanding[];
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
          ${isInPlayoffs ? 'bg-green-50' : ''}
          ${isLeader ? 'font-semibold bg-blue-50' : ''}
          hover:bg-gray-50 transition-colors
        `}
      >
        <td className="px-4 py-3 text-sm text-gray-900">
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
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                {team.teamName.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">
                {team.teamName}
              </div>
              <div className="text-xs text-gray-500">@{team.username}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          {team.wins}-{team.losses}
          {team.ties > 0 && `-${team.ties}`}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          {team.totalPoints.toFixed(2)}
        </td>
        {showDivision && (
          <td className="px-4 py-3 text-xs">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {team.divisionName || `Div ${team.division}`}
            </span>
          </td>
        )}
        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
          {gamesBack !== undefined && gamesBack > 0 ? '+' : ''}
          {gamesBack !== undefined && gamesBack !== 0 ? Math.abs(gamesBack).toFixed(1) : ''}
          {(gamesBack === 0) && '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
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
              <span className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-white px-2 text-xs font-semibold text-red-500">
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3">
        <h3 className="text-lg font-bold text-white">
          {division.divisionName || `Division ${division.division}`}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Team
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Record
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Points
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                GB
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                PB
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Team
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Record
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Points
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Division
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                GB
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                PB
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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

export default function PlayoffRace({ divisions, wildCard }: PlayoffRaceProps) {
  return (
    <div className="space-y-6">
      {/* Division Standings */}
      <div className="space-y-6">
        {divisions.map((division) => (
          <DivisionCard key={division.division} division={division} />
        ))}
      </div>

      {/* Wild Card Race */}
      {wildCard.length > 0 && (
        <WildCardCard wildCard={wildCard} />
      )}
    </div>
  );
}
