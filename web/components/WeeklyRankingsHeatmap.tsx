'use client';

import { useMemo } from 'react';
import { TeamStats } from '@/lib/types';
import { getRankingColor } from '@/lib/constants';
import SectionCard from './ui/SectionCard';

interface WeeklyRankingsHeatmapProps {
  rankingsData: Record<string, number[]>;
  teams: TeamStats[];
}

export default function WeeklyRankingsHeatmap({ rankingsData, teams }: WeeklyRankingsHeatmapProps) {
  const numWeeks = teams[0]?.weeklyScores.length || 0;
  const weeks = Array.from({ length: numWeeks }, (_, i) => i + 1);

  // Calculate stats - memoized for performance
  const stats = useMemo(() => {
    const sortedTeams = [...teams].sort((a, b) => a.standing - b.standing);

    return sortedTeams.map((team) => {
      const rankings = rankingsData[team.username] || [];
      const avgRanking = rankings.reduce((a, b) => a + b, 0) / rankings.length;
      const sortedRankings = [...rankings].sort((a, b) => a - b);
      const medRanking = sortedRankings[Math.floor(sortedRankings.length / 2)];

      return {
        ...team,
        avgRanking: avgRanking.toFixed(2),
        medRanking,
      };
    });
  }, [teams, rankingsData]);

  const legend = (
    <div className="flex items-center gap-4 text-xs text-gray-600">
      <span className="font-medium">Legend:</span>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-500 rounded"></div>
        <span>Top 25%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-300 rounded"></div>
        <span>Top 50%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-yellow-300 rounded"></div>
        <span>Bottom 50%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-400 rounded"></div>
        <span>Bottom 25%</span>
      </div>
    </div>
  );

  return (
    <SectionCard
      title="Weekly Rankings Heatmap"
      subtitle={`Performance ranking each week (1=best, ${teams.length}=worst)`}
      gradientType="warning"
      footer={legend}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Team
              </th>
              {weeks.map((week) => (
                <th
                  key={week}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  W{week}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Avg
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Med
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.map((team) => {
              const rankings = rankingsData[team.username] || [];
              return (
                <tr key={team.username}>
                  <td className="px-6 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                    <div className="text-xs text-gray-500">@{team.username}</div>
                  </td>
                  {rankings.map((ranking, index) => (
                    <td
                      key={index}
                      className={`px-3 py-3 whitespace-nowrap text-center text-sm font-semibold ${getRankingColor(
                        ranking,
                        teams.length
                      )}`}
                    >
                      {ranking}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold bg-gray-50 text-gray-900">
                    {team.avgRanking}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold bg-gray-50 text-gray-900">
                    {team.medRanking}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
