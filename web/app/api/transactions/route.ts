import { NextResponse } from 'next/server';
import { SLEEPER_CONFIG, CACHE_CONFIG } from '@/lib/config';
import type { SleeperTransaction } from '@/lib/types';

export async function GET() {
  try {
    const { leagueId, baseUrl, maxWeeks } = SLEEPER_CONFIG;

    // Fetch league info to get current week
    const leagueRes = await fetch(`${baseUrl}/league/${leagueId}`, {
      next: { revalidate: CACHE_CONFIG.transactionData }
    });
    const league = await leagueRes.json();
    const currentWeek = league.settings?.leg || 14;

    // Fetch transactions for all weeks
    const transactionPromises = [];
    for (let week = 1; week <= Math.min(currentWeek, maxWeeks); week++) {
      transactionPromises.push(
        fetch(`${baseUrl}/league/${leagueId}/transactions/${week}`, {
          next: { revalidate: CACHE_CONFIG.transactionData }
        })
          .then(res => res.json())
          .then(data => ({ week, transactions: data as SleeperTransaction[] }))
          .catch(() => ({ week, transactions: [] as SleeperTransaction[] }))
      );
    }

    const transactionsByWeek = await Promise.all(transactionPromises);

    // Flatten all transactions and add week info
    const allTransactions: Array<SleeperTransaction & { week: number }> = [];
    transactionsByWeek.forEach(({ week, transactions }) => {
      transactions.forEach(transaction => {
        allTransactions.push({ ...transaction, week });
      });
    });

    // Sort by timestamp (most recent first)
    allTransactions.sort((a, b) => b.created - a.created);

    return NextResponse.json({
      transactions: allTransactions,
      totalWeeks: Math.min(currentWeek, maxWeeks),
    });
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction data' },
      { status: 500 }
    );
  }
}
