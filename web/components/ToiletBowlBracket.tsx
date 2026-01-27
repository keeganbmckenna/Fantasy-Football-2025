'use client';

import BracketView from './BracketView';
import type { PostseasonBrackets } from '@/lib/analyze/brackets';

interface ToiletBowlBracketProps {
  brackets: PostseasonBrackets | null;
}

export default function ToiletBowlBracket({ brackets }: ToiletBowlBracketProps) {
  return (
    <BracketView
      title="Toilet Bowl"
      subtitle="Battle to avoid last place"
      rounds={brackets?.losersRounds ?? []}
      placements={brackets?.losersPlacements ?? []}
      gradientType="warning"
      emptyMessage="Toilet bowl bracket data will appear when the postseason begins."
    />
  );
}
