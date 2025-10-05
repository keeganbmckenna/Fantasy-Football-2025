'use client';

import { useState } from 'react';
import { WeekMatchup } from '@/lib/types';

interface WeeklyMatchupsProps {
  matchups: Record<number, WeekMatchup[]>;
}

export default function WeeklyMatchups({ matchups }: WeeklyMatchupsProps) {
  const weeks = Object.keys(matchups)
    .map(Number)
    .sort((a, b) => a - b); // Sort ascending (1, 2, 3, ...)
  const [selectedWeek, setSelectedWeek] = useState(weeks[weeks.length - 1] || 1); // Default to most recent week

  const currentMatchups = matchups[selectedWeek] || [];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white mb-3">Weekly Matchups</h2>
        <div className="flex gap-1 flex-wrap">
          {weeks.map((week) => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedWeek === week
                  ? 'bg-white text-green-800'
                  : 'bg-green-700 text-white hover:bg-green-600'
              }`}
            >
              W{week}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6 space-y-4">
        {currentMatchups.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No matchups available for this week
          </p>
        ) : (
          currentMatchups.map((matchup, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                {/* Team 1 */}
                <div
                  className={`flex-1 ${
                    matchup.winner === 'team1'
                      ? 'font-bold text-green-700'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="text-lg">{matchup.team1.name}</div>
                  <div className="text-sm text-gray-500">
                    @{matchup.team1.username}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {matchup.team1.points.toFixed(2)}
                  </div>
                </div>

                {/* VS */}
                <div className="px-6 text-gray-400 font-semibold">VS</div>

                {/* Team 2 */}
                <div
                  className={`flex-1 text-right ${
                    matchup.winner === 'team2'
                      ? 'font-bold text-green-700'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="text-lg">{matchup.team2.name}</div>
                  <div className="text-sm text-gray-500">
                    @{matchup.team2.username}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {matchup.team2.points.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Winner indicator */}
              {matchup.winner && matchup.winner !== 'tie' && (
                <div className="mt-3 text-center text-sm text-green-600 font-medium">
                  {matchup.winner === 'team1'
                    ? matchup.team1.name
                    : matchup.team2.name}{' '}
                  wins by{' '}
                  {Math.abs(matchup.team1.points - matchup.team2.points).toFixed(
                    2
                  )}{' '}
                  points
                </div>
              )}
              {matchup.winner === 'tie' && (
                <div className="mt-3 text-center text-sm text-yellow-600 font-medium">
                  Tie
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
