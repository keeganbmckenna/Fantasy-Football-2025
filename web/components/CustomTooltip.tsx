'use client';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
  teams: Array<{ username: string; teamName: string; color: string }>;
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  sortDescending?: boolean;
}

export default function CustomTooltip({
  active,
  payload,
  label,
  teams,
  valueFormatter = (value: number) => value.toString(),
  valueLabel = 'Value',
  sortDescending = true,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Create array of team data with values
  const teamData = payload.map((entry: any) => ({
    username: entry.dataKey as string,
    value: entry.value as number,
    color: entry.color as string,
  }));

  // Sort by value
  const sortedTeams = [...teamData].sort((a, b) => {
    return sortDescending ? b.value - a.value : a.value - b.value;
  });

  return (
    <div
      className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 min-w-[250px] max-w-[300px]"
      style={{ zIndex: 9999, position: 'relative', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}
    >
      <p className="font-bold text-gray-800 mb-3 text-center border-b pb-2 flex-shrink-0">
        {label}
      </p>
      <div className="space-y-1 overflow-y-auto flex-1" style={{ overflowY: 'auto' }}>
        {sortedTeams.map((item, index) => {
          const team = teams.find((t) => t.username === item.username);
          const teamName = team?.teamName || item.username;

          return (
            <div
              key={item.username}
              className="flex items-center justify-between gap-3 py-1 px-2 rounded hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700 truncate" title={teamName}>
                  {teamName}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {valueFormatter(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
