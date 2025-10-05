'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TeamStats } from '@/lib/types';
import CustomTooltip from './CustomTooltip';

interface PointsVsMedianProps {
  differenceData: Record<string, number[]>;
  teams: TeamStats[];
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#a855f7'
];

export default function PointsVsMedian({ differenceData, teams }: PointsVsMedianProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const numWeeks = teams[0]?.weeklyScores.length || 0;
  const weeks = Array.from({ length: numWeeks }, (_, i) => i + 1);

  // Transform data for recharts
  const chartData = weeks.map((week, index) => {
    const weekData: any = {
      week: `W${week}`,
      median: 0 // Median is always 0 in difference view
    };
    Object.keys(differenceData).forEach((username) => {
      weekData[username] = differenceData[username][index];
    });
    return weekData;
  });

  // Prepare team data with colors for tooltip (including median)
  const teamColors = [
    { username: 'median', teamName: 'Median', color: '#1f2937' },
    ...Object.keys(differenceData).map((username, index) => {
      const team = teams.find(t => t.username === username);
      return {
        username,
        teamName: team?.teamName || username,
        color: COLORS[index % COLORS.length],
      };
    })
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Difference from Median</h2>
        <p className="text-teal-100 text-sm mt-1">Cumulative points above or below median (positive = above, negative = below)</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis label={{ value: 'Points Above/Below Median', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={
                <CustomTooltip
                  teams={teamColors}
                  valueFormatter={(value) => `${value.toFixed(2)} pts`}
                />
              }
              wrapperStyle={{ zIndex: 9999 }}
            />
            <Legend
              onMouseEnter={(e) => setHoveredLine(e.dataKey as string)}
              onMouseLeave={() => setHoveredLine(null)}
            />
            {/* Median line - bold and always visible */}
            <Line
              type="monotone"
              dataKey="median"
              name="Median"
              stroke="#1f2937"
              strokeWidth={hoveredLine === 'median' ? 5 : 3}
              strokeOpacity={hoveredLine !== null && hoveredLine !== 'median' ? 0.4 : 1}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6 }}
            />
            {/* Team lines */}
            {Object.keys(differenceData).map((username, index) => {
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
                  dot={{ r: isHovered ? 5 : 3 }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
