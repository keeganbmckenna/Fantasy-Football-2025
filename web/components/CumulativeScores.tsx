'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TeamStats } from '@/lib/types';
import { CHART_CONFIG } from '@/lib/constants';
import { useChartHover } from '@/hooks/useChartHover';
import { useTeamColors } from '@/hooks/useTeamColors';
import CustomTooltip from './CustomTooltip';
import SectionCard from './ui/SectionCard';

interface CumulativeScoresProps {
  cumulativeData: Record<string, number[]>;
  teams: TeamStats[];
}

export default function CumulativeScores({ cumulativeData, teams }: CumulativeScoresProps) {
  const { setHoveredItem, clearHovered, isHovered, isOtherHovered } = useChartHover<string>();
  const teamColors = useTeamColors(teams, Object.keys(cumulativeData));

  // Transform data for recharts - memoized for performance
  const chartData = useMemo(() => {
    const numWeeks = teams[0]?.weeklyScores.length || 0;
    const weeks = Array.from({ length: numWeeks }, (_, i) => i + 1);

    return weeks.map((week, index) => {
      const weekData: Record<string, string | number> = { week: `W${week}` };
      Object.keys(cumulativeData).forEach((username) => {
        weekData[username] = cumulativeData[username][index];
      });
      return weekData;
    });
  }, [cumulativeData, teams]);

  return (
    <SectionCard
      title="Cumulative Scores"
      subtitle="Total points accumulated over the season"
      gradientType="secondary"
    >
      <div className="p-6">
        <ResponsiveContainer width="100%" height={CHART_CONFIG.defaultHeight}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis label={{ value: 'Total Points', angle: -90, position: 'insideLeft' }} />
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
              onMouseEnter={(e) => setHoveredItem(e.dataKey as string)}
              onMouseLeave={clearHovered}
            />
            {Object.keys(cumulativeData).map((username, index) => {
              const team = teams.find(t => t.username === username);
              const color = teamColors[index]?.color;

              return (
                <Line
                  key={username}
                  type="monotone"
                  dataKey={username}
                  name={team?.teamName || username}
                  stroke={color}
                  strokeWidth={isHovered(username) ? CHART_CONFIG.strokeWidth.hovered : CHART_CONFIG.strokeWidth.default}
                  strokeOpacity={isOtherHovered(username) ? CHART_CONFIG.opacity.dimmed : CHART_CONFIG.opacity.default}
                  dot={{ r: isHovered(username) ? CHART_CONFIG.dotRadius.hovered : CHART_CONFIG.dotRadius.default }}
                  activeDot={{ r: CHART_CONFIG.dotRadius.active }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
