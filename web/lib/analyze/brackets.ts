import type {
  LeagueData,
  LeagueSettings,
  SleeperBracketFrom,
  SleeperBracketMatchup,
} from '../types';
import { calculateTeamStats } from './teamStats';
import { getAvatarUrl, getTeamName } from './teamIdentity';

export type PlacementValue = number;

export interface BracketTeamView {
  rosterId: number | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  seed: number | null;
  byeLabel?: string;
  isBye?: boolean;
  score: number | null;
  isWinner: boolean;
}

export interface BracketGameView {
  id: string;
  round: number;
  weekStart: number;
  weeks: number[];
  matchupId: number | null;
  label?: string;
  placement?: PlacementValue;
  team1: BracketTeamView;
  team2: BracketTeamView;
  winnerRosterId: number | null;
  loserRosterId: number | null;
}

export interface BracketRoundView {
  round: number;
  title: string;
  weekLabel: string;
  games: BracketGameView[];
}

export interface PostseasonBrackets {
  winnersRounds: BracketRoundView[];
  losersRounds: BracketRoundView[];
  winnersPlacements: BracketGameView[];
  losersPlacements: BracketGameView[];
}

interface WeekMatchupInfo {
  matchupId: number;
  rosterIds: [number, number];
  pointsByRoster: Record<number, number>;
}

interface ResolvedMatch {
  team1Id: number | null;
  team2Id: number | null;
  matchupId: number | null;
  team1Score: number | null;
  team2Score: number | null;
  winnerRosterId: number | null;
  loserRosterId: number | null;
}

const roundLabels = ['Round 1', 'Round 2', 'Round 3', 'Round 4'];

const buildWeekMatchups = (data: LeagueData): Record<number, WeekMatchupInfo[]> => {
  const weekly: Record<number, WeekMatchupInfo[]> = {};

  Object.entries(data.matchups).forEach(([weekKey, matchups]) => {
    const week = Number(weekKey);
    const matchupGroups: Record<number, WeekMatchupInfo> = {};

    matchups.forEach((matchup) => {
      if (!matchupGroups[matchup.matchup_id]) {
        matchupGroups[matchup.matchup_id] = {
          matchupId: matchup.matchup_id,
          rosterIds: [matchup.roster_id, matchup.roster_id],
          pointsByRoster: {},
        };
      }

      const group = matchupGroups[matchup.matchup_id];
      const rosterIds = group.rosterIds;
      if (rosterIds[0] !== matchup.roster_id && rosterIds[1] !== matchup.roster_id) {
        group.rosterIds = [rosterIds[0], matchup.roster_id];
      }

      group.pointsByRoster[matchup.roster_id] = matchup.points;
    });

    weekly[week] = Object.values(matchupGroups).filter((group) => group.rosterIds[0] !== group.rosterIds[1]);
  });

  return weekly;
};

const getLegsPerRound = (data: LeagueData) => {
  const roundType = data.league.settings?.playoff_round_type || 1;
  return roundType === 2 ? 2 : 1;
};

const getRoundWeeks = (playoffStart: number, round: number, legsPerRound: number) => {
  const weekStart = playoffStart + (round - 1) * legsPerRound;
  const weeks = Array.from({ length: legsPerRound }, (_, index) => weekStart + index);
  return { weekStart, weeks };
};

const matchupHasRosters = (matchup: WeekMatchupInfo, rosterA: number, rosterB: number) => {
  const [idA, idB] = matchup.rosterIds;
  return (idA === rosterA && idB === rosterB) || (idA === rosterB && idB === rosterA);
};

const getMatchupScores = (
  weeklyMatchups: Record<number, WeekMatchupInfo[]>,
  weeks: number[],
  matchupId: number | null,
  rosterA: number | null,
  rosterB: number | null,
) => {
  if (!rosterA || !rosterB) {
    return {
      matchupId: matchupId ?? null,
      team1Score: null,
      team2Score: null,
    };
  }

  let totalA = 0;
  let totalB = 0;
  let found = false;
  let resolvedMatchupId: number | null = matchupId ?? null;

  weeks.forEach((week) => {
    const matchups = weeklyMatchups[week] || [];
    let matchup = matchupId !== null
      ? matchups.find((item) => item.matchupId === matchupId && matchupHasRosters(item, rosterA, rosterB))
      : undefined;

    if (!matchup) {
      matchup = matchups.find((item) => matchupHasRosters(item, rosterA, rosterB));
    }

    if (!matchup) {
      return;
    }

    resolvedMatchupId = matchup.matchupId;
    const scoreA = matchup.pointsByRoster[rosterA];
    const scoreB = matchup.pointsByRoster[rosterB];
    if (scoreA !== undefined && scoreB !== undefined) {
      totalA += scoreA;
      totalB += scoreB;
      found = true;
    }
  });

  if (!found) {
    return { matchupId: resolvedMatchupId, team1Score: null, team2Score: null };
  }

  return {
    matchupId: resolvedMatchupId,
    team1Score: totalA,
    team2Score: totalB,
  };
};

const getWinnerFromScores = (team1Score: number | null, team2Score: number | null, team1Id: number | null, team2Id: number | null) => {
  if (team1Score === null || team2Score === null || team1Id === null || team2Id === null) {
    return { winner: null, loser: null };
  }

  if (team1Score === team2Score) {
    return { winner: null, loser: null };
  }

  if (team1Score > team2Score) {
    return { winner: team1Id, loser: team2Id };
  }

  return { winner: team2Id, loser: team1Id };
};

const buildSeedMap = (data: LeagueData, settings: LeagueSettings) => {
  const regularSeasonWeek = Math.min(data.lastScoredWeek, settings.regularSeasonEnd);
  const stats = calculateTeamStats(data, regularSeasonWeek);
  return stats.reduce((acc: Record<number, number>, team) => {
    acc[team.rosterId] = team.standing;
    return acc;
  }, {});
};

const buildTeamView = (
  rosterId: number | null,
  data: LeagueData,
  score: number | null,
  winnerRosterId: number | null,
  seedByRosterId: Record<number, number>,
  byeLabel?: string,
): BracketTeamView => {
  if (!rosterId) {
    return {
      rosterId: null,
      name: 'BYE',
      username: '',
      avatarUrl: null,
      seed: null,
      isBye: true,
      score: null,
      isWinner: false,
    };
  }

  const userId = data.rosterToUserMap[rosterId];
  const user = userId ? data.userMap[userId] : undefined;
  const teamInfo = getTeamName(rosterId, data);

  return {
    rosterId,
    name: teamInfo.name,
    username: teamInfo.username,
    avatarUrl: getAvatarUrl(user),
    seed: seedByRosterId[rosterId] ?? null,
    byeLabel,
    score,
    isWinner: winnerRosterId !== null && rosterId === winnerRosterId,
  };
};

const buildRoundTitle = (round: number, maxRound: number) => {
  if (round === maxRound) {
    return 'Finals';
  }

  return roundLabels[round - 1] || `Round ${round}`;
};

const getOrdinalLabel = (placement: number) => {
  const mod10 = placement % 10;
  const mod100 = placement % 100;
  if (mod10 === 1 && mod100 !== 11) return `${placement}st Place`;
  if (mod10 === 2 && mod100 !== 12) return `${placement}nd Place`;
  if (mod10 === 3 && mod100 !== 13) return `${placement}rd Place`;
  return `${placement}th Place`;
};

const isPlacementValue = (value: number | null): value is PlacementValue => (
  value === 3 || value === 5 || value === 8 || value === 10
);

const buildWeekLabel = (weeks: number[]) => {
  if (!weeks.length) {
    return '';
  }

  if (weeks.length === 1) {
    return `Week ${weeks[0]}`;
  }

  return `Weeks ${weeks[0]}-${weeks[weeks.length - 1]}`;
};

const getReferenceMatchId = (from?: SleeperBracketFrom | null) => {
  if (!from) {
    return null;
  }

  if (typeof from.w === 'number') {
    return { matchId: from.w, source: 'winner' as const };
  }

  if (typeof from.l === 'number') {
    return { matchId: from.l, source: 'loser' as const };
  }

  if (typeof from.m === 'number' && typeof from.r === 'number') {
    return { matchId: from.m, source: 'winner' as const };
  }

  return null;
};

const resolveFromReference = (
  from: SleeperBracketFrom | null | undefined,
  resolvedMatches: Map<number, ResolvedMatch>,
) => {
  const reference = getReferenceMatchId(from);
  if (!reference) {
    return null;
  }

  const match = resolvedMatches.get(reference.matchId);
  if (!match) {
    return null;
  }

  return reference.source === 'winner' ? match.winnerRosterId : match.loserRosterId;
};

const resolveSlot = (
  value: SleeperBracketMatchup['t1'],
  from: SleeperBracketFrom | null | undefined,
  resolvedMatches: Map<number, ResolvedMatch>,
) => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object') {
    return resolveFromReference(value, resolvedMatches);
  }

  return resolveFromReference(from, resolvedMatches);
};

const buildBracketData = (
  bracket: SleeperBracketMatchup[] | null | undefined,
  data: LeagueData,
  settings: LeagueSettings,
  kind: 'winners' | 'losers',
  weeklyMatchups: Record<number, WeekMatchupInfo[]>,
  seedByRosterId: Record<number, number>,
): { rounds: BracketRoundView[]; placements: BracketGameView[] } => {
  if (!bracket?.length) {
    return { rounds: [] as BracketRoundView[], placements: [] as BracketGameView[] };
  }

  const legsPerRound = getLegsPerRound(data);
  const resolvedMatches = new Map<number, ResolvedMatch>();
  const placementMatches: Array<SleeperBracketMatchup & { p: PlacementValue }> = [];
  const rounds = bracket.reduce((acc, match) => {
    const placementValue = match.p ?? null;
    if (isPlacementValue(placementValue)) {
      placementMatches.push({ ...match, p: placementValue });
      return acc;
    }
    const round = match.r;
    if (!acc.has(round)) {
      acc.set(round, []);
    }
    acc.get(round)?.push(match);
    return acc;
  }, new Map<number, SleeperBracketMatchup[]>());

  const maxRound = rounds.size ? Math.max(...Array.from(rounds.keys())) : 1;

  const sortedMatches = [...bracket].sort((a, b) => {
    if (a.r === b.r) {
      return a.m - b.m;
    }
    return a.r - b.r;
  });

  sortedMatches.forEach((match) => {
    const { weeks } = getRoundWeeks(settings.playoffStart, match.r, legsPerRound);
    const team1Id = resolveSlot(match.t1, match.t1_from, resolvedMatches);
    const team2Id = resolveSlot(match.t2, match.t2_from, resolvedMatches);
    const scores = getMatchupScores(weeklyMatchups, weeks, match.m, team1Id, team2Id);

    let winnerRosterId = match.w ?? null;
    let loserRosterId = match.l ?? null;
    if (!winnerRosterId || !loserRosterId) {
      const derived = getWinnerFromScores(scores.team1Score, scores.team2Score, team1Id, team2Id);
      winnerRosterId = winnerRosterId ?? derived.winner;
      loserRosterId = loserRosterId ?? derived.loser;
    }

    resolvedMatches.set(match.m, {
      team1Id,
      team2Id,
      matchupId: scores.matchupId,
      team1Score: scores.team1Score,
      team2Score: scores.team2Score,
      winnerRosterId,
      loserRosterId,
    });
  });

  const roundsView = Array.from(rounds.entries())
    .sort(([roundA], [roundB]) => roundA - roundB)
    .map(([round, matches]) => {
      const { weekStart, weeks } = getRoundWeeks(settings.playoffStart, round, legsPerRound);
      const title = buildRoundTitle(round, maxRound);
      const weekLabel = buildWeekLabel(weeks);

      const games = matches
        .sort((a, b) => a.m - b.m)
        .map((match) => {
          const resolved = resolvedMatches.get(match.m);
          const matchupId = resolved?.matchupId ?? match.m ?? null;
          const team1Id = resolved?.team1Id ?? resolveSlot(match.t1, match.t1_from, resolvedMatches);
          const team2Id = resolved?.team2Id ?? resolveSlot(match.t2, match.t2_from, resolvedMatches);
          const team1Score = resolved?.team1Score ?? null;
          const team2Score = resolved?.team2Score ?? null;
          const winnerRosterId = resolved?.winnerRosterId ?? match.w ?? null;
          const loserRosterId = resolved?.loserRosterId ?? match.l ?? null;
          const derivedWinner = getWinnerFromScores(team1Score, team2Score, team1Id, team2Id).winner;
          const displayWinnerId = kind === 'losers' ? derivedWinner : winnerRosterId;

          const isFinalRound = round === maxRound;
          const label = isFinalRound
            ? (kind === 'winners' ? 'Championship' : 'Ultimate Loser')
            : undefined;

          const team1ByeLabel = team1Id !== null && team2Id === null ? 'BYE' : undefined;
          const team2ByeLabel = team2Id !== null && team1Id === null ? 'BYE' : undefined;

          return {
            id: `${kind}-r${round}-m${matchupId}`,
            round,
            weekStart,
            weeks,
            matchupId,
            label,
            team1: buildTeamView(team1Id, data, team1Score, displayWinnerId, seedByRosterId, team1ByeLabel),
            team2: buildTeamView(team2Id, data, team2Score, displayWinnerId, seedByRosterId, team2ByeLabel),
            winnerRosterId,
            loserRosterId,
          } satisfies BracketGameView;
        });

      return {
        round,
        title,
        weekLabel,
        games,
      } satisfies BracketRoundView;
    });

  const placementViews: BracketGameView[] = placementMatches.map((match) => {
    const resolved = resolvedMatches.get(match.m);
    const placement = match.p;
    const { weekStart, weeks } = getRoundWeeks(settings.playoffStart, match.r, legsPerRound);
    const displayPlacement = kind === 'losers'
      ? placement + settings.playoffTeams - 1
      : placement;
    const label = getOrdinalLabel(displayPlacement);
    const derivedWinner = getWinnerFromScores(
      resolved?.team1Score ?? null,
      resolved?.team2Score ?? null,
      resolved?.team1Id ?? null,
      resolved?.team2Id ?? null,
    ).winner;
    const displayWinnerId = kind === 'losers' ? derivedWinner : resolved?.winnerRosterId ?? null;

    return {
      id: `${kind}-placement-${match.m}`,
      round: match.r,
      weekStart,
      weeks,
      matchupId: resolved?.matchupId ?? match.m ?? null,
      label,
      placement: displayPlacement,
      team1: buildTeamView(resolved?.team1Id ?? null, data, resolved?.team1Score ?? null, displayWinnerId, seedByRosterId),
      team2: buildTeamView(resolved?.team2Id ?? null, data, resolved?.team2Score ?? null, displayWinnerId, seedByRosterId),
      winnerRosterId: resolved?.winnerRosterId ?? null,
      loserRosterId: resolved?.loserRosterId ?? null,
    } satisfies BracketGameView;
  });

  return { rounds: roundsView, placements: placementViews };
};

const findMatchupBetween = (
  weeklyMatchups: Record<number, WeekMatchupInfo[]>,
  weeks: number[],
  rosterA: number | null,
  rosterB: number | null,
  excluded: Set<string>,
) => {
  if (!rosterA || !rosterB) {
    return null;
  }

  const [pairA, pairB] = rosterA < rosterB ? [rosterA, rosterB] : [rosterB, rosterA];

  for (const week of weeks) {
    if (excluded.has(`${week}:pair:${pairA}-${pairB}`)) {
      continue;
    }
    const matchups = weeklyMatchups[week] || [];
    const match = matchups.find((matchup) => {
      const [idA, idB] = matchup.rosterIds;
      const isMatch = (idA === rosterA && idB === rosterB) || (idA === rosterB && idB === rosterA);
      return isMatch && !excluded.has(`${week}:${matchup.matchupId}`);
    });

    if (match) {
      return { ...match, week };
    }
  }

  return null;
};

const buildPlacementGame = (
  data: LeagueData,
  settings: LeagueSettings,
  weeklyMatchups: Record<number, WeekMatchupInfo[]>,
  excluded: Set<string>,
  placement: PlacementValue,
  rosterA: number | null,
  rosterB: number | null,
  targetRound: number,
  seedByRosterId: Record<number, number>,
) => {
  const legsPerRound = getLegsPerRound(data);
  const { weekStart, weeks } = getRoundWeeks(settings.playoffStart, targetRound, legsPerRound);
  const matchup = findMatchupBetween(weeklyMatchups, weeks, rosterA, rosterB, excluded);
  const matchupId = matchup?.matchupId ?? null;
  const team1Id = matchup?.rosterIds[0] ?? rosterA;
  const team2Id = matchup?.rosterIds[1] ?? rosterB;
  const scores = getMatchupScores(weeklyMatchups, weeks, matchupId, team1Id ?? null, team2Id ?? null);
  const derived = getWinnerFromScores(scores.team1Score, scores.team2Score, team1Id ?? null, team2Id ?? null);

  return {
    id: `placement-${placement}`,
    round: targetRound,
    weekStart,
    weeks,
    matchupId: scores.matchupId,
    label: getOrdinalLabel(placement),
    placement,
    team1: buildTeamView(team1Id ?? null, data, scores.team1Score, derived.winner, seedByRosterId),
    team2: buildTeamView(team2Id ?? null, data, scores.team2Score, derived.winner, seedByRosterId),
    winnerRosterId: derived.winner,
    loserRosterId: derived.loser,
  } satisfies BracketGameView;
};

const addBracketMatchupKeys = (
  rounds: BracketRoundView[],
  excluded: Set<string>,
) => {
  rounds.forEach((round) => {
    round.games.forEach((game) => {
      const rosterA = game.team1.rosterId;
      const rosterB = game.team2.rosterId;
      if (game.matchupId === null) {
        if (rosterA !== null && rosterB !== null) {
          const [pairA, pairB] = rosterA < rosterB ? [rosterA, rosterB] : [rosterB, rosterA];
          game.weeks.forEach((week) => {
            excluded.add(`${week}:pair:${pairA}-${pairB}`);
          });
        }
        return;
      }
      game.weeks.forEach((week) => {
        excluded.add(`${week}:${game.matchupId}`);
        if (rosterA !== null && rosterB !== null) {
          const [pairA, pairB] = rosterA < rosterB ? [rosterA, rosterB] : [rosterB, rosterA];
          excluded.add(`${week}:pair:${pairA}-${pairB}`);
        }
      });
    });
  });
};

export const buildPostseasonBrackets = (
  data: LeagueData,
  settings: LeagueSettings,
): PostseasonBrackets => {
  const seedByRosterId = buildSeedMap(data, settings);
  const weeklyMatchups = buildWeekMatchups(data);
  const winnersData = buildBracketData(data.winnersBracket, data, settings, 'winners', weeklyMatchups, seedByRosterId);
  const losersData = buildBracketData(data.losersBracket, data, settings, 'losers', weeklyMatchups, seedByRosterId);
  const winnersRounds = winnersData.rounds;
  const losersRounds = losersData.rounds;

  const excluded = new Set<string>();
  addBracketMatchupKeys(winnersRounds, excluded);
  addBracketMatchupKeys(losersRounds, excluded);

  const winnersGames = winnersRounds.flatMap((round) => round.games);
  const losersGames = losersRounds.flatMap((round) => round.games);
  const winnersPlacements: BracketGameView[] = [...winnersData.placements];
  const losersPlacements: BracketGameView[] = [...losersData.placements];

  if (winnersGames.length && winnersPlacements.length === 0) {
    const maxRound = Math.max(...winnersGames.map((game) => game.round));
    const semifinalRound = Math.max(maxRound - 1, 1);
    const round1Losers = winnersGames
      .filter((game) => game.round === 1)
      .map((game) => game.loserRosterId)
      .filter((id): id is number => id !== null);

    const semifinalLosers = winnersGames
      .filter((game) => game.round === semifinalRound)
      .map((game) => game.loserRosterId)
      .filter((id): id is number => id !== null);

    if (semifinalLosers.length >= 2) {
      winnersPlacements.push(
        buildPlacementGame(data, settings, weeklyMatchups, excluded, 3, semifinalLosers[0], semifinalLosers[1], maxRound, seedByRosterId)
      );
    }

    if (round1Losers.length >= 2) {
      winnersPlacements.push(
        buildPlacementGame(data, settings, weeklyMatchups, excluded, 5, round1Losers[0], round1Losers[1], 2, seedByRosterId)
      );
    }
  }

  if (losersGames.length && losersPlacements.length === 0) {
    const maxRound = Math.max(...losersGames.map((game) => game.round));
    const semifinalRound = Math.max(maxRound - 1, 1);
    const semifinalWinners = losersGames
      .filter((game) => game.round === semifinalRound)
      .map((game) => game.winnerRosterId)
      .filter((id): id is number => id !== null);

    const semifinalLosers = losersGames
      .filter((game) => game.round === semifinalRound)
      .map((game) => game.loserRosterId)
      .filter((id): id is number => id !== null);

    if (semifinalWinners.length >= 2) {
      losersPlacements.push(
        buildPlacementGame(data, settings, weeklyMatchups, excluded, 8, semifinalWinners[0], semifinalWinners[1], maxRound, seedByRosterId)
      );
    }

    if (semifinalLosers.length >= 2) {
      losersPlacements.push(
        buildPlacementGame(data, settings, weeklyMatchups, excluded, 10, semifinalLosers[0], semifinalLosers[1], maxRound, seedByRosterId)
      );
    }
  }

  return {
    winnersRounds,
    losersRounds,
    winnersPlacements,
    losersPlacements,
  };
};
