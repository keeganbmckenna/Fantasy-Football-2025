'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TeamStats } from '@/lib/types';
import CustomTooltip from './CustomTooltip';

interface StandingsOverTimeProps {
  standingsData: Record<string, number[]>;
  teams: TeamStats[];
}

// Generate colors for each team
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#a855f7'
];

export default function StandingsOverTime({ standingsData, teams }: StandingsOverTimeProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const numWeeks = teams[0]?.weeklyScores.length || 0;
  const weeks = Array.from({ length: numWeeks }, (_, i) => i + 1);

  // Transform data for recharts
  const chartData = weeks.map((week, index) => {
    const weekData: any = { week: `W${week}` };
    Object.keys(standingsData).forEach((username) => {
      weekData[username] = standingsData[username][index];
    });
    return weekData;
  });

  // Prepare team data with colors for tooltip
  const teamColors = Object.keys(standingsData).map((username, index) => {
    const team = teams.find(t => t.username === username);
    return {
      username,
      teamName: team?.teamName || username,
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Standings Over Time</h2>
        <p className="text-indigo-100 text-sm mt-1">Track position changes throughout the season</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis
              reversed
              domain={[1, teams.length]}
              ticks={Array.from({ length: teams.length }, (_, i) => i + 1)}
              label={{ value: 'Standing', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              content={
                <CustomTooltip
                  teams={teamColors}
                  valueFormatter={(value) => `#${value}`}
                  sortDescending={false}
                />
              }
              wrapperStyle={{ zIndex: 9999 }}
            />
            <Legend
              onMouseEnter={(e) => setHoveredLine(e.dataKey as string)}
              onMouseLeave={() => setHoveredLine(null)}
            />
            {Object.keys(standingsData).map((username, index) => {
              const team = teams.find(t => t.username === username);
              const isHovered = hoveredLine === username;
              const isOtherHovered = hoveredLine !== null && hoveredLine !== username;

              return (
                <Line
                  key={username}
                  type="monotone"
                  dataKey={username}
                  name={team?.teamName || username}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={isHovered ? 4 : 2}
                  strokeOpacity={isOtherHovered ? 0.2 : 1}
                  dot={{ r: isHovered ? 5 : 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
