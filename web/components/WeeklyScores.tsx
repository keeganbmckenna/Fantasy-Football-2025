'use client';

import { TeamStats } from '@/lib/types';

interface WeeklyScoresProps {
  teams: TeamStats[];
  maxWeek?: number;
}

export default function WeeklyScores({ teams, maxWeek }: WeeklyScoresProps) {
  // Determine number of weeks from first team, limited to completed weeks
  const totalWeeks = teams[0]?.weeklyScores.length || 0;
  const numWeeks = maxWeek !== undefined ? Math.min(maxWeek, totalWeeks) : totalWeeks;
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
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                Win Avg
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                Win Margin
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">
                Loss Avg
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">
                Loss Margin
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
                {team.weeklyScores.slice(0, numWeeks).map((score, index) => {
                  const result = team.weeklyResults[index];
                  const opponentScore = team.weeklyOpponentScores[index];
                  const margin = score - opponentScore;
                  const marginText = margin > 0 ? `+${margin.toFixed(2)}` : margin.toFixed(2);

                  return (
                    <td
                      key={index}
                      className={`px-4 py-2 whitespace-nowrap text-center ${
                        result === 'W'
                          ? 'bg-green-50 text-green-800'
                          : result === 'L'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-yellow-50 text-yellow-800'
                      }`}
                    >
                      <div className="text-sm font-semibold">{score.toFixed(2)}</div>
                      <div className={`text-xs font-medium ${
                        result === 'W' ? 'text-green-600' : result === 'L' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {marginText}
                      </div>
                    </td>
                  );
                })}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold bg-gray-50 text-gray-900">
                  {team.totalPoints.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold bg-gray-50 text-gray-900">
                  {team.avgPoints.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center bg-green-50 text-gray-900">
                  {team.avgPointsInWins !== undefined ? (
                    <>
                      <div className="text-sm font-semibold">{team.avgPointsInWins.toFixed(2)}</div>
                      {team.medianPointsInWins !== undefined && (
                        <div className="text-xs text-gray-600">Med: {team.medianPointsInWins.toFixed(2)}</div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center bg-green-50">
                  {team.avgWinMargin !== undefined ? (
                    <>
                      <div className="text-sm font-semibold text-green-700">+{team.avgWinMargin.toFixed(2)}</div>
                      {team.medianWinMargin !== undefined && (
                        <div className="text-xs text-green-600">Med: +{team.medianWinMargin.toFixed(2)}</div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center bg-red-50 text-gray-900">
                  {team.avgPointsInLosses !== undefined ? (
                    <>
                      <div className="text-sm font-semibold">{team.avgPointsInLosses.toFixed(2)}</div>
                      {team.medianPointsInLosses !== undefined && (
                        <div className="text-xs text-gray-600">Med: {team.medianPointsInLosses.toFixed(2)}</div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center bg-red-50">
                  {team.avgLossMargin !== undefined ? (
                    <>
                      <div className="text-sm font-semibold text-red-700">{team.avgLossMargin.toFixed(2)}</div>
                      {team.medianLossMargin !== undefined && (
                        <div className="text-xs text-red-600">Med: {team.medianLossMargin.toFixed(2)}</div>
                      )}
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
