'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { CHART_THEME } from '@/lib/constants';
import { ScheduleLuckSimulation, ScheduleSimulationOutcome } from '@/lib/types';

interface ScheduleLuckDistributionProps {
  data: ScheduleLuckSimulation | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      winsLabel: string;
      count: number;
      frequency: number;
    };
  }>;
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const ACTUAL_BAR_COLOR = '#f59e0b';
const SIM_BAR_COLOR = '#3b82f6';

const formatWinsLabel = (wins: number) => (Number.isInteger(wins) ? wins.toString() : wins.toFixed(1));

const buildChartData = (outcomes: ScheduleSimulationOutcome[], actualWins: number) => {
  const outcomeMap = new Map(outcomes.map((outcome) => [outcome.wins, outcome]));
  if (!outcomeMap.has(actualWins)) {
    outcomeMap.set(actualWins, { wins: actualWins, count: 0, frequency: 0 });
  }

  return Array.from(outcomeMap.values())
    .sort((a, b) => a.wins - b.wins)
    .map((outcome) => ({
      wins: outcome.wins,
      winsLabel: formatWinsLabel(outcome.wins),
      count: outcome.count,
      frequency: outcome.frequency,
      isActual: outcome.wins === actualWins,
    }));
};

function ScheduleLuckTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-[var(--chart-tooltip-bg)] border-2 border-[var(--chart-tooltip-border)] rounded-lg shadow-lg p-3">
      <p className="font-bold text-[var(--chart-tooltip-text)] mb-1">{data.winsLabel} wins</p>
      <p className="text-sm text-[var(--chart-tooltip-muted)]">
        {data.count} sims • {formatPercent(data.frequency)}
      </p>
    </div>
  );
}

export default function ScheduleLuckDistribution({ data }: ScheduleLuckDistributionProps) {
  if (!data || data.teams.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Schedule Luck Distribution"
      subtitle={`Randomized schedules (${data.simulations.toLocaleString()} sims) over ${data.weeksSimulated} weeks with round-robin + repeat opening weeks`}
      gradientType="warning"
      footer={
        <p className="text-xs text-[var(--muted)]">
          Highlighted bars show each team&apos;s actual win total across the completed regular season weeks.
        </p>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {data.teams.map((team) => {
          const chartData = buildChartData(team.outcomes, team.actualWins);

          return (
            <div
              key={team.username}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{team.teamName}</div>
                  <div className="text-xs text-[var(--muted)]">@{team.username}</div>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  Actual wins: <span className="font-semibold text-[var(--foreground)]">{formatWinsLabel(team.actualWins)}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                  <XAxis
                    dataKey="winsLabel"
                    tick={{ fill: CHART_THEME.tick }}
                    axisLine={{ stroke: CHART_THEME.axis }}
                    tickLine={{ stroke: CHART_THEME.axis }}
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis
                    tick={{ fill: CHART_THEME.tick }}
                    axisLine={{ stroke: CHART_THEME.axis }}
                    tickLine={{ stroke: CHART_THEME.axis }}
                    tickFormatter={formatPercent}
                    style={{ fontSize: '11px' }}
                  />
                  <Tooltip content={<ScheduleLuckTooltip />} />
                  <Bar dataKey="frequency">
                    {chartData.map((entry) => (
                      <Cell key={entry.winsLabel} fill={entry.isActual ? ACTUAL_BAR_COLOR : SIM_BAR_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
