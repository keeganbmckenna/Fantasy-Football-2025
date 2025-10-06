'use client';

import { TeamStats } from '@/lib/types';

interface WeeklyScoresProps {
  teams: TeamStats[];
}

export default function WeeklyScores({ teams }: WeeklyScoresProps) {
  // Determine number of weeks from first team
  const numWeeks = teams[0]?.weeklyScores.length || 0;
  const weeks = Array.from({ length: numWeeks }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Weekly Scores</h2>
      </div>
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
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  W{week}
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Total
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Avg
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team) => (
              <tr key={team.username}>
                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div className="text-sm font-medium text-gray-900">
                    {team.teamName}
                  </div>
                  <div className="text-xs text-gray-500">@{team.username}</div>
                </td>
                {team.weeklyScores.map((score, index) => {
                  const result = team.weeklyResults[index];
                  return (
                    <td
                      key={index}
                      className={`px-4 py-4 whitespace-nowrap text-sm text-center ${
                        result === 'W'
                          ? 'bg-green-50 text-green-800 font-semibold'
                          : result === 'L'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-yellow-50 text-yellow-800'
                      }`}
                    >
                      {score.toFixed(2)}
                    </td>
                  );
                })}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold bg-gray-50 text-gray-900">
                  {team.totalPoints.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold bg-gray-50 text-gray-900">
                  {team.avgPoints.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
