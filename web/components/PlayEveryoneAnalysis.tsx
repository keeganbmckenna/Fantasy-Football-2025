'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlayEveryoneData {
  username: string;
  teamName: string;
  actualWins: number;
  playAllWins: number;
  playAllLosses: number;
  difference: number;
}

interface PlayEveryoneAnalysisProps {
  data: PlayEveryoneData[];
}

interface BarChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    payload: {
      name: string;
    };
  }>;
}

function BarChartTooltip({ active, payload }: BarChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-3">
      <p className="font-bold text-gray-900 mb-2">{payload[0].payload.name}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.dataKey}: <span className="font-semibold">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayEveryoneAnalysis({ data }: PlayEveryoneAnalysisProps) {
  // Sort by play-all wins
  const sortedData = [...data].sort((a, b) => b.playAllWins - a.playAllWins);

  // Transform for bar chart
  const chartData = sortedData.map(team => ({
    name: team.teamName,
    'Actual Wins': team.actualWins,
    'Play-All Wins': Math.round(team.playAllWins / 11), // Normalize to equivalent weekly wins
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Play Everyone Analysis</h2>
        <p className="text-cyan-100 text-sm mt-1">
          What if each team played all other teams every week? Shows luck vs skill.
        </p>
      </div>

      {/* Chart */}
      <div className="p-6 border-b border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={120}
              interval={0}
              style={{ fontSize: '12px' }}
            />
            <YAxis label={{ value: 'Wins', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<BarChartTooltip />} />
            <Legend />
            <Bar dataKey="Actual Wins" fill="#3b82f6" />
            <Bar dataKey="Play-All Wins" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual Wins
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Play-All Wins
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Play-All Record
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Luck Factor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((team, index) => {
              const isLucky = team.difference > 1;
              const isUnlucky = team.difference < -1;

              return (
                <tr key={team.username}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {team.teamName}
                    </div>
                    <div className="text-sm text-gray-500">@{team.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.actualWins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.playAllWins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {team.playAllWins}-{team.playAllLosses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isLucky
                          ? 'bg-green-100 text-green-800'
                          : isUnlucky
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {team.difference > 0 ? '+' : ''}
                      {team.difference.toFixed(2)}
                      {isLucky ? ' Lucky' : isUnlucky ? ' Unlucky' : ' Neutral'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>How to read:</strong> Play-All Wins shows total wins if each team played all
          other teams every week. Luck Factor = Actual Wins - (Play-All Wins / 11). Positive =
          lucky matchups, Negative = unlucky matchups.
        </p>
      </div>
    </div>
  );
}
