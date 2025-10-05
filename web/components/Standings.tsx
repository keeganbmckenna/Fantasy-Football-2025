'use client';

import { TeamStats } from '@/lib/types';

interface StandingsProps {
  teams: TeamStats[];
}

export default function Standings({ teams }: StandingsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Standings</h2>
      </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Record
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points For
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points Against
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team, index) => (
              <tr
                key={team.username}
                className={index < 6 ? 'bg-green-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {team.standing}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {team.teamName}
                  </div>
                  <div className="text-sm text-gray-500">@{team.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {team.wins}-{team.losses}
                  {team.ties > 0 && `-${team.ties}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {team.totalPoints.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {team.pointsAgainst.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
