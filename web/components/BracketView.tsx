'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SectionCard from './ui/SectionCard';
import type { BracketGameView, BracketRoundView } from '@/lib/analyze/brackets';

interface BracketViewProps {
  title: string;
  subtitle?: string;
  rounds: BracketRoundView[];
  placements: BracketGameView[];
  gradientType?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info';
  emptyMessage?: string;
}

const formatScore = (score: number | null) => (score === null ? '—' : score.toFixed(2));

const getRosterIds = (game: BracketGameView) => (
  [game.team1.rosterId, game.team2.rosterId].filter((id): id is number => id !== null)
);

export default function BracketView({
  title,
  subtitle,
  rounds,
  placements,
  gradientType = 'primary',
  emptyMessage = 'Bracket data is not available yet.',
}: BracketViewProps) {
  const roundRefs = useRef<Array<HTMLDivElement | null>>([]);
  const connectorRef = useRef<HTMLDivElement | null>(null);
  const gameRefs = useRef<Array<Array<HTMLDivElement | null>>>([]);
  const sortedPlacements = useMemo(
    () => [...placements].sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0)),
    [placements]
  );
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const [connectorSize, setConnectorSize] = useState({ width: 0, height: 0 });

  const cardHeight = 112;
  const baseGap = 16;
  const maxGames = Math.max(...rounds.map((round) => round.games.length), 1);
  const columnHeight = maxGames * cardHeight + Math.max(maxGames - 1, 0) * baseGap;

  useEffect(() => {
    const container = connectorRef.current;
    if (!container) {
      return;
    }

    const updatePaths = () => {
      const containerRect = container.getBoundingClientRect();
      const nextPaths: string[] = [];
      const nextSize = { width: container.scrollWidth, height: container.scrollHeight };

      rounds.forEach((round, roundIndex) => {
        const nextRound = rounds[roundIndex + 1];
        if (!nextRound) {
          return;
        }

        const roundGames = round.games;
        const nextRoundGames = nextRound.games;
        const roundElements = gameRefs.current[roundIndex] || [];
        const nextElements = gameRefs.current[roundIndex + 1] || [];

        nextRoundGames.forEach((nextGame, nextIndex) => {
          const nextGameEl = nextElements[nextIndex];
          if (!nextGameEl) {
            return;
          }

          const targetRosterIds = getRosterIds(nextGame);
          if (!targetRosterIds.length) {
            return;
          }

          const nextRect = nextGameEl.getBoundingClientRect();
          const endX = nextRect.left - containerRect.left;
          const endY = nextRect.top - containerRect.top + nextRect.height / 2;

          const prevMatches = roundGames
            .map((game, gameIndex) => {
              const rosterIds = getRosterIds(game);
              const hasMatch = targetRosterIds.some((id) => rosterIds.includes(id));
              const gameEl = roundElements[gameIndex];
              if (!hasMatch || !gameEl) {
                return null;
              }
              const rect = gameEl.getBoundingClientRect();
              return {
                startX: rect.right - containerRect.left,
                y: rect.top - containerRect.top + rect.height / 2,
              };
            })
            .filter((value): value is { startX: number; y: number } => value !== null);

          if (!prevMatches.length) {
            return;
          }

          const sortedMatches = [...prevMatches].sort((a, b) => a.y - b.y);
          const topMatch = sortedMatches[0];
          const bottomMatch = sortedMatches[sortedMatches.length - 1];
          const startX = topMatch.startX;
          const midX = startX + (endX - startX) / 2;

          if (sortedMatches.length === 1) {
            const singleMatch = sortedMatches[0];
            if (Math.abs(singleMatch.y - endY) < 1) {
              nextPaths.push(`M ${singleMatch.startX} ${singleMatch.y} H ${endX}`);
            } else {
              nextPaths.push(`M ${singleMatch.startX} ${singleMatch.y} H ${midX} V ${endY} H ${endX}`);
            }
            return;
          }

          nextPaths.push(`M ${topMatch.startX} ${topMatch.y} H ${midX}`);
          nextPaths.push(`M ${bottomMatch.startX} ${bottomMatch.y} H ${midX}`);
          nextPaths.push(`M ${midX} ${topMatch.y} V ${bottomMatch.y}`);
          nextPaths.push(`M ${midX} ${endY} H ${endX}`);
        });
      });

      setConnectorSize(nextSize);
      setConnectorPaths(nextPaths);
    };

    updatePaths();
    window.addEventListener('resize', updatePaths);
    return () => window.removeEventListener('resize', updatePaths);
  }, [rounds]);

  return (
    <SectionCard title={title} subtitle={subtitle} gradientType={gradientType}>
      <div className="px-6 py-6">
        {rounds.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
              {rounds.map((round, index) => (
                <button
                  key={round.round}
                  type="button"
                  onClick={() => {
                    roundRefs.current[index]?.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'start',
                      block: 'nearest',
                    });
                  }}
                  className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {round.title}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="overflow-x-auto pb-2">
                <div className="relative" ref={connectorRef}>
                  {connectorSize.width > 0 && connectorSize.height > 0 && connectorPaths.length > 0 && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width={connectorSize.width}
                      height={connectorSize.height}
                      viewBox={`0 0 ${connectorSize.width} ${connectorSize.height}`}
                      aria-hidden="true"
                    >
                      {connectorPaths.map((path) => (
                        <path
                          key={path}
                          d={path}
                          fill="none"
                          stroke="var(--border)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </svg>
                  )}
                  <div className="flex gap-8 min-w-max snap-x snap-mandatory">
                {rounds.map((round, index) => {
                  const columnJustify = round.games.length <= 1 ? 'justify-center' : 'justify-between';
                  const columnGap = round.games.length > 2 ? 'gap-6' : 'gap-0';
                  return (
                    <div
                      key={round.round}
                      ref={(node) => {
                          roundRefs.current[index] = node;
                        }}
                        className="min-w-[260px] snap-start"
                      >
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {round.title}
                          </div>
                          <div className="text-xs text-[var(--muted)]">{round.weekLabel}</div>
                        </div>
                        <div
                          className={`flex flex-col ${columnJustify} ${columnGap}`}
                          style={{ minHeight: columnHeight }}
                        >
                          {round.games.map((game, gameIndex) => {
                            return (
                              <div
                                key={game.id}
                                className="relative"
                                ref={(node) => {
                                  if (!gameRefs.current[index]) {
                                    gameRefs.current[index] = [];
                                  }
                                  gameRefs.current[index][gameIndex] = node;
                                }}
                              >
                                <div
                                  className="relative h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 shadow-lg"
                                >
                                  {game.label && (
                                    <div className="absolute right-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                      {game.label}
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <TeamRow team={game.team1} score={game.team1.score} />
                                    <div className="h-px bg-[var(--border)]" />
                                    <TeamRow team={game.team2} score={game.team2.score} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
            {sortedPlacements.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-[var(--foreground)]">Placement Games</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedPlacements.map((game) => (
                    <div key={game.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {game.label}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{game.weeks.length ? buildWeekLabel(game.weeks) : ''}</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <PlacementRow team={game.team1} />
                        <PlacementRow team={game.team2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

interface TeamRowProps {
  team: BracketGameView['team1'];
  score: number | null;
}

function TeamRow({ team, score }: TeamRowProps) {
  const name = team.rosterId ? team.name : 'BYE';
  const username = team.rosterId ? `@${team.username}` : '';
  const scoreText = team.isBye ? 'BYE' : formatScore(score);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {team.seed !== null && team.seed !== undefined && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--neutral-bg)] text-[10px] font-bold text-[var(--foreground)]">
            {team.seed}
          </div>
        )}
        {team.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.avatarUrl}
            alt={name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-[var(--neutral-bg)] flex items-center justify-center text-[var(--neutral-text)] text-xs font-semibold">
            {name.charAt(0)}
          </div>
        )}
        <div>
          <div className={`text-sm font-semibold ${team.isWinner ? 'text-[var(--success-text)]' : 'text-[var(--foreground)]'}`}>
            {name}
            {team.byeLabel && (
              <span className="ml-2 rounded-full bg-[var(--info-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--info-text)]">
                {team.byeLabel}
              </span>
            )}
          </div>
          {username && <div className="text-xs text-[var(--muted)]">{username}</div>}
        </div>
      </div>
      <div className="text-sm font-semibold text-[var(--foreground)]">
        {scoreText}
      </div>
    </div>
  );
}

function PlacementRow({ team }: { team: BracketGameView['team1'] }) {
  const name = team.rosterId ? team.name : 'TBD';
  const username = team.rosterId ? `@${team.username}` : '';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {team.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.avatarUrl} alt={name} className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-[var(--neutral-bg)] flex items-center justify-center text-[var(--neutral-text)] text-xs font-semibold">
            {name.charAt(0)}
          </div>
        )}
        <div>
          <div className={`text-sm font-medium ${team.isWinner ? 'text-[var(--success-text)]' : 'text-[var(--foreground)]'}`}>
            {name}
          </div>
          {username && <div className="text-xs text-[var(--muted)]">{username}</div>}
        </div>
      </div>
      <div className="text-sm font-semibold text-[var(--foreground)]">
        {formatScore(team.score)}
      </div>
    </div>
  );
}

const buildWeekLabel = (weeks: number[]) => {
  if (!weeks.length) return '';
  if (weeks.length === 1) return `Week ${weeks[0]}`;
  return `Weeks ${weeks[0]}-${weeks[weeks.length - 1]}`;
};
