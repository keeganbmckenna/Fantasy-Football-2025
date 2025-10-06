'use client';

import { WeeklyPlayAllStats } from '@/lib/types';

interface WeeklyPlayAllProps {
  data: WeeklyPlayAllStats[];
}

// Function to get color based on win percentage
const getWinPctColor = (winPct: number) => {
  // Green for high win %, red for low win %
  if (winPct >= 0.75) return 'bg-green-500 text-white';
  if (winPct >= 0.6) return 'bg-green-300 text-gray-900';
  if (winPct >= 0.4) return 'bg-yellow-300 text-gray-900';
  if (winPct >= 0.25) return 'bg-orange-300 text-gray-900';
  return 'bg-red-400 text-white';
};

export default function WeeklyPlayAll({ data }: WeeklyPlayAllProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const numWeeks = data[0]?.weeklyRecords.length || 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Weekly Play-All Records</h2>
        <p className="text-teal-100 text-sm mt-1">
          {"Each team's record if they played all other teams every week"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Team
              </th>
              {Array.from({ length: numWeeks }, (_, i) => i + 1).map((week) => (
                <th
                  key={week}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  W{week}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Total W-L
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Win %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((team) => (
              <tr key={team.username}>
                <td className="px-6 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                  <div className="text-sm font-medium text-gray-900">
                    {team.teamName}
                  </div>
                  <div className="text-xs text-gray-500">@{team.username}</div>
                </td>
                {team.weeklyRecords.map((record) => (
                  <td
                    key={record.week}
                    className={`px-3 py-3 whitespace-nowrap text-center text-xs font-semibold ${getWinPctColor(
                      record.winPct
                    )}`}
                    title={`${(record.winPct * 100).toFixed(1)}% win rate`}
                  >
                    {record.wins}-{record.losses}
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold bg-gray-50 text-gray-900">
                  {team.totalWins}-{team.totalLosses}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold bg-gray-50 text-gray-900">
                  {(team.overallWinPct * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>≥75% wins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <span>≥60% wins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-300 rounded"></div>
            <span>40-60% wins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-300 rounded"></div>
            <span>25-40% wins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span>&lt;25% wins</span>
          </div>
        </div>
      </div>
    </div>
  );
}
