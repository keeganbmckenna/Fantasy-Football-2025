'use client';

import BracketView from './BracketView';
import type { PostseasonBrackets } from '@/lib/analyze/brackets';

interface PlayoffBracketProps {
  brackets: PostseasonBrackets | null;
}

export default function PlayoffBracket({ brackets }: PlayoffBracketProps) {
  return (
    <BracketView
      title="Playoff Bracket"
      subtitle="League championship bracket"
      rounds={brackets?.winnersRounds ?? []}
      placements={brackets?.winnersPlacements ?? []}
      gradientType="primary"
      emptyMessage="Playoff bracket data will appear once the postseason begins."
    />
  );
}
