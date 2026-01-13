'use client';

import { useState, useEffect, useMemo } from 'react';
import SectionCard from './ui/SectionCard';
import type { ProcessedTransaction, TradeAnalysis } from '@/lib/types';
import { analyzeTrade } from '@/lib/tradeValueAnalyzer';
import { analyzeAddDrop, type AddDropAnalysis } from '@/lib/addDropValueAnalyzer';

interface AllTransactionsProps {
  transactions: ProcessedTransaction[];
  playerPositions: Record<string, string>;
}

export default function AllTransactions({ transactions, playerPositions }: AllTransactionsProps) {
  const [filter, setFilter] = useState<'all' | 'trades' | 'adds-drops'>('all');
  const [showCount, setShowCount] = useState(20);
  const [tradeAnalyses, setTradeAnalyses] = useState<Map<string, TradeAnalysis>>(new Map());
  const [addDropAnalyses, setAddDropAnalyses] = useState<Map<string, AddDropAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper function to check if a player is a kicker or defense
  const isKickerOrDefense = (playerId?: string): boolean => {
    if (!playerId) return false;
    const position = playerPositions[playerId];
    return position === 'K' || position === 'DEF';
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'trades') return t.type === 'trade';
    if (filter === 'adds-drops') return t.type === 'add' || t.type === 'drop' || t.type === 'swap';
    return true;
  });

  const displayedTransactions = filteredTransactions.slice(0, showCount);

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Auto-analyze all transactions on mount
  useEffect(() => {
    const analyzeTransactions = async () => {
      setIsAnalyzing(true);

      // Analyze trades
      const tradeAnalysesMap = new Map<string, TradeAnalysis>();
      const tradeTransactions = transactions.filter(t => t.type === 'trade' && t.tradeDetails);

      for (const transaction of tradeTransactions) {
        try {
          const tradeInfo = {
            id: transaction.id,
            week: transaction.week,
            timestamp: transaction.timestamp,
            team1: {
              username: transaction.tradeDetails!.team1.username,
              teamName: transaction.tradeDetails!.team1.teamName,
              rosterId: transaction.rosterId,
              gives: transaction.tradeDetails!.team1.gives,
              receives: transaction.tradeDetails!.team1.receives,
              givesIds: transaction.tradeDetails!.team1.givesIds,
              receivesIds: transaction.tradeDetails!.team1.receivesIds,
            },
            team2: {
              username: transaction.tradeDetails!.team2.username,
              teamName: transaction.tradeDetails!.team2.teamName,
              rosterId: 0,
              gives: transaction.tradeDetails!.team2.gives,
              receives: transaction.tradeDetails!.team2.receives,
              givesIds: transaction.tradeDetails!.team2.givesIds,
              receivesIds: transaction.tradeDetails!.team2.receivesIds,
            },
          };

          const analysis = await analyzeTrade(tradeInfo, playerPositions);
          tradeAnalysesMap.set(transaction.id, analysis);
        } catch (error) {
          console.error(`Error analyzing trade ${transaction.id}:`, error);
        }
      }

      // Analyze add/drop/swap transactions
      const addDropAnalysesMap = new Map<string, AddDropAnalysis>();
      const addDropTransactions = transactions.filter(t =>
        t.type === 'add' || t.type === 'drop' || t.type === 'swap'
      );

      for (const transaction of addDropTransactions) {
        try {
          const analysis = await analyzeAddDrop(transaction, playerPositions);
          addDropAnalysesMap.set(transaction.id, analysis);
        } catch (error) {
          console.error(`Error analyzing add/drop ${transaction.id}:`, error);
        }
      }

      setTradeAnalyses(tradeAnalysesMap);
      setAddDropAnalyses(addDropAnalysesMap);
      setIsAnalyzing(false);
    };

    analyzeTransactions();
  }, [transactions, playerPositions]);

  // Calculate per-team value gains/losses
  const teamValueSummary = useMemo(() => {
    const teamMap = new Map<string, {
      teamName: string;
      username: string;
      tradesGain: number;
      addDropsGain: number;
      addDropsRosterDelta: number;
      totalGain: number;
    }>();

    // Process trade analyses
    tradeAnalyses.forEach((analysis, transactionId) => {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction || !transaction.tradeDetails) return;

      // Add gain for team1
      const team1Key = transaction.tradeDetails.team1.username;
      if (!teamMap.has(team1Key)) {
        teamMap.set(team1Key, {
          teamName: transaction.tradeDetails.team1.teamName,
          username: transaction.tradeDetails.team1.username,
          tradesGain: 0,
          addDropsGain: 0,
          addDropsRosterDelta: 0,
          totalGain: 0,
        });
      }
      const team1 = teamMap.get(team1Key)!;
      team1.tradesGain += analysis.team1.tradeQuality;

      // Add gain for team2
      const team2Key = transaction.tradeDetails.team2.username;
      if (!teamMap.has(team2Key)) {
        teamMap.set(team2Key, {
          teamName: transaction.tradeDetails.team2.teamName,
          username: transaction.tradeDetails.team2.username,
          tradesGain: 0,
          addDropsGain: 0,
          addDropsRosterDelta: 0,
          totalGain: 0,
        });
      }
      const team2 = teamMap.get(team2Key)!;
      team2.tradesGain += analysis.team2.tradeQuality;
    });

    // Process add/drop analyses
    addDropAnalyses.forEach((analysis, transactionId) => {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      const teamKey = transaction.username;
      if (!teamMap.has(teamKey)) {
        teamMap.set(teamKey, {
          teamName: transaction.teamName,
          username: transaction.username,
          tradesGain: 0,
          addDropsGain: 0,
          addDropsRosterDelta: 0,
          totalGain: 0,
        });
      }
      const team = teamMap.get(teamKey)!;
      team.addDropsGain += analysis.decisionQuality;
      team.addDropsRosterDelta += 0; // No longer used
    });

    // Calculate totals and sort
    const teams = Array.from(teamMap.values()).map(team => ({
      ...team,
      totalGain: team.tradesGain + team.addDropsGain,
    }));

    return teams.sort((a, b) => b.totalGain - a.totalGain);
  }, [tradeAnalyses, addDropAnalyses, transactions]);

  // Count transactions by type
  const allCount = transactions.length;
  const tradesCount = transactions.filter(t => t.type === 'trade').length;
  const addsDropsCount = transactions.filter(t => t.type === 'add' || t.type === 'drop' || t.type === 'swap').length;

  return (
    <SectionCard
      title="All Transactions"
      subtitle="Complete transaction history"
      gradientType="secondary"
    >
      <div className="p-6">
        {/* Team Value Summary Table */}
        {!isAnalyzing && teamValueSummary.length > 0 && (
          <div className="mb-8 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 text-[var(--foreground)]">Team Value Summary</h3>
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--surface)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                    Adds/Drops
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface-elevated)] divide-y divide-[var(--border)]">
                {teamValueSummary.map((team) => (
                  <tr key={team.username} className="hover:bg-[var(--surface)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[var(--foreground)]">{team.teamName}</div>
                      <div className="text-xs text-[var(--muted)]">{team.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={team.tradesGain > 0 ? 'text-[var(--success-text)] font-medium' : team.tradesGain < 0 ? 'text-[var(--danger-text)] font-medium' : 'text-[var(--foreground)] font-medium'}>
                        {team.tradesGain > 0 ? '+' : ''}{team.tradesGain.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={team.addDropsGain > 0 ? 'text-[var(--success-text)] font-medium' : team.addDropsGain < 0 ? 'text-[var(--danger-text)] font-medium' : 'text-[var(--foreground)] font-medium'}>
                        {team.addDropsGain > 0 ? '+' : ''}{team.addDropsGain.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-bold ${team.totalGain > 0 ? 'text-[var(--success-text)]' : team.totalGain < 0 ? 'text-[var(--danger-text)]' : 'text-[var(--foreground)]'}`}>
                        {team.totalGain > 0 ? '+' : ''}{team.totalGain.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAnalyzing && (
          <div className="mb-8 p-6 bg-[var(--surface)] text-center text-[var(--muted)]">
            Analyzing transactions...
          </div>
        )}

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--neutral-bg)] text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
          >
            All ({allCount})
          </button>
          <button
            onClick={() => setFilter('trades')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'trades'
                ? 'bg-purple-600 text-white'
                : 'bg-[var(--neutral-bg)] text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
          >
            Trades ({tradesCount})
          </button>
          <button
            onClick={() => setFilter('adds-drops')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'adds-drops'
                ? 'bg-green-600 text-white'
                : 'bg-[var(--neutral-bg)] text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
          >
            Adds/Drops ({addsDropsCount})
          </button>
        </div>

        {/* Transaction list */}
        <div className="space-y-3 max-h-[800px] overflow-y-auto">
          {displayedTransactions.length === 0 ? (
            <p className="text-center text-[var(--muted)] py-8">No transactions found</p>
          ) : (
            displayedTransactions.map(transaction => {
              if (transaction.type === 'trade') {
                const analysis = tradeAnalyses.get(transaction.id);
                return (
                  <div key={transaction.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <div className="w-full flex items-center justify-between p-4 bg-purple-500/20">

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-500/30 text-purple-200">
                            TRADE
                          </span>
                          <span className="font-medium text-[var(--foreground)]">
                            {transaction.teamName}
                          </span>
                          <span className="text-[var(--muted)]">↔️</span>
                          <span className="font-medium text-[var(--foreground)]">
                            {transaction.tradePartnerTeamName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-[var(--muted)]">Week {transaction.week}</div>
                          <div className="text-xs text-[var(--muted)]">{formatDate(transaction.timestamp)}</div>
                        </div>
                      </div>
                    </div>

                    {transaction.tradeDetails && (
                      <div className="p-4 bg-[var(--surface-elevated)] border-t border-[var(--border)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Team 1 */}
                          <div>
                            <h4 className="font-semibold text-[var(--foreground)] mb-3">
                              {transaction.tradeDetails.team1.teamName}
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Gave Up</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team1.gives.map((item, idx) => {
                                    const playerId = transaction.tradeDetails!.team1.givesIds[idx];
                                    const playerValue = analysis?.team1.players.find(p => p.playerName === item);
                                    const isKOrDef = isKickerOrDefense(playerId);
                                    return (
                                      <li key={idx} className="text-sm">
                                        <div className="flex items-start gap-2">
                                          <span className="text-red-500 mt-0.5">−</span>
                                          <div className="flex-1">
                                            <div className="font-medium text-[var(--foreground)]">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-[var(--muted)]">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Received</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team1.receives.map((item, idx) => {
                                    const playerId = transaction.tradeDetails!.team1.receivesIds[idx];
                                    const playerValue = analysis?.team2.players.find(p => p.playerName === item);
                                    const isKOrDef = isKickerOrDefense(playerId);
                                    return (
                                      <li key={idx} className="text-sm">
                                        <div className="flex items-start gap-2">
                                          <span className="text-green-500 mt-0.5">+</span>
                                          <div className="flex-1">
                                            <div className="font-medium text-[var(--foreground)]">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-[var(--muted)]">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div>
                            <h4 className="font-semibold text-[var(--foreground)] mb-3">
                              {transaction.tradeDetails.team2.teamName}
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Gave Up</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team2.gives.map((item, idx) => {
                                    const playerId = transaction.tradeDetails!.team2.givesIds[idx];
                                    const playerValue = analysis?.team2.players.find(p => p.playerName === item);
                                    const isKOrDef = isKickerOrDefense(playerId);
                                    return (
                                      <li key={idx} className="text-sm">
                                        <div className="flex items-start gap-2">
                                          <span className="text-red-500 mt-0.5">−</span>
                                          <div className="flex-1">
                                            <div className="font-medium text-[var(--foreground)]">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-[var(--muted)]">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Received</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team2.receives.map((item, idx) => {
                                    const playerId = transaction.tradeDetails!.team2.receivesIds[idx];
                                    const playerValue = analysis?.team1.players.find(p => p.playerName === item);
                                    const isKOrDef = isKickerOrDefense(playerId);
                                    return (
                                      <li key={idx} className="text-sm">
                                        <div className="flex items-start gap-2">
                                          <span className="text-green-500 mt-0.5">+</span>
                                          <div className="flex-1">
                                            <div className="font-medium text-[var(--foreground)]">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-[var(--muted)]">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Trade Analysis Section */}
                        {analysis ? (
                        <div className="mt-6 pt-6 border-t border-[var(--border)] text-[var(--muted)]">
                            <div className="space-y-4">
                              {(() => {
                                return (
                                  <>
                                    {/* Winner Banner */}
                                    {analysis.status === 'success' && (
                                      <div className={`p-3 rounded-lg text-center font-semibold ${
                                        analysis.winner === 'even'
                                          ? 'bg-[var(--neutral-bg)] text-[var(--foreground)]'
                                          : analysis.winner === 'team1'
                                          ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                                          : 'bg-[var(--info-bg)] text-[var(--info-text)]'
                                      }`}>
                                        {analysis.winner === 'even' ? (
                                          '⚖️ Even Trade'
                                        ) : (
                                          <>
                                            🏆 Winner: {analysis.winner === 'team1'
                                              ? transaction.tradeDetails.team1.teamName
                                              : transaction.tradeDetails.team2.teamName}
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {/* Trade Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Team 1 Summary */}
                                      <div className="bg-[var(--surface)] p-4 rounded-lg">
                                        <div className="space-y-3">
                                          <div className="font-semibold text-[var(--foreground)]">{transaction.tradeDetails.team1.teamName}</div>

                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-[var(--muted)] uppercase">Gave Up</div>
                                            <div className="flex justify-between text-xs">
                                              <span>Value at trade:</span>
                                              <span className="font-medium">{analysis.team1.gaveUpValueAtTrade.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Current value:</span>
                                              <span className="font-medium">{analysis.team1.gaveUpValueToday.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Performance:</span>
                                              <span className={`font-semibold ${analysis.team1.gaveUpGain >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team1.gaveUpGain >= 0 ? '+' : ''}{analysis.team1.gaveUpGain.toLocaleString()} ({analysis.team1.gaveUpGainPercentage >= 0 ? '+' : ''}{analysis.team1.gaveUpGainPercentage.toFixed(1)}%)
                                              </span>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-[var(--muted)] uppercase">Received</div>
                                            <div className="flex justify-between text-xs">
                                              <span>Value at trade:</span>
                                              <span className="font-medium">{analysis.team1.receivedValueAtTrade.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Current value:</span>
                                              <span className="font-medium">{analysis.team1.receivedValueToday.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Performance:</span>
                                              <span className={`font-semibold ${analysis.team1.receivedGain >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team1.receivedGain >= 0 ? '+' : ''}{analysis.team1.receivedGain.toLocaleString()} ({analysis.team1.receivedGainPercentage >= 0 ? '+' : ''}{analysis.team1.receivedGainPercentage.toFixed(1)}%)
                                              </span>
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-[var(--border)]">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-semibold text-[var(--foreground)]">Trade Quality:</span>
                                              <span className={`font-bold text-base ${analysis.team1.tradeQuality >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team1.tradeQuality >= 0 ? '+' : ''}{analysis.team1.tradeQuality.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Team 2 Summary */}
                                      <div className="bg-[var(--surface)] p-4 rounded-lg">
                                        <div className="space-y-3">
                                          <div className="font-semibold text-[var(--foreground)]">{transaction.tradeDetails.team2.teamName}</div>

                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-[var(--muted)] uppercase">Gave Up</div>
                                            <div className="flex justify-between text-xs">
                                              <span>Value at trade:</span>
                                              <span className="font-medium">{analysis.team2.gaveUpValueAtTrade.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Current value:</span>
                                              <span className="font-medium">{analysis.team2.gaveUpValueToday.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Performance:</span>
                                              <span className={`font-semibold ${analysis.team2.gaveUpGain >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team2.gaveUpGain >= 0 ? '+' : ''}{analysis.team2.gaveUpGain.toLocaleString()} ({analysis.team2.gaveUpGainPercentage >= 0 ? '+' : ''}{analysis.team2.gaveUpGainPercentage.toFixed(1)}%)
                                              </span>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-[var(--muted)] uppercase">Received</div>
                                            <div className="flex justify-between text-xs">
                                              <span>Value at trade:</span>
                                              <span className="font-medium">{analysis.team2.receivedValueAtTrade.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Current value:</span>
                                              <span className="font-medium">{analysis.team2.receivedValueToday.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                              <span>Performance:</span>
                                              <span className={`font-semibold ${analysis.team2.receivedGain >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team2.receivedGain >= 0 ? '+' : ''}{analysis.team2.receivedGain.toLocaleString()} ({analysis.team2.receivedGainPercentage >= 0 ? '+' : ''}{analysis.team2.receivedGainPercentage.toFixed(1)}%)
                                              </span>
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-[var(--border)]">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-semibold text-[var(--foreground)]">Trade Quality:</span>
                                              <span className={`font-bold text-base ${analysis.team2.tradeQuality >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                                                {analysis.team2.tradeQuality >= 0 ? '+' : ''}{analysis.team2.tradeQuality.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Messages */}
                                    {analysis.status === 'partial' && (
                                      <div className="p-3 bg-[var(--warning-bg)] border border-yellow-200 rounded-lg text-sm text-[var(--warning-text)]">
                                        ⚠️ {analysis.errorMessage}
                                      </div>
                                    )}
                                    {analysis.status === 'error' && (
                                      <div className="p-3 bg-[var(--danger-bg)] border border-red-200 rounded-lg text-sm text-[var(--danger-text)]">
                                        ❌ {analysis.errorMessage}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                        </div>
                        ) : (
                          <div className="mt-6 pt-6 border-t border-[var(--border)]">
                            <div className="p-3 bg-[var(--surface)] text-center text-[var(--muted)] text-sm">
                              Analyzing trade...
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Add/Drop/Swap transactions
              const analysis = addDropAnalyses.get(transaction.id);

              return (
                <div
                  key={transaction.id}
                  className="bg-[var(--surface-elevated)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              transaction.type === 'add'
                                ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                                : transaction.type === 'drop'
                                ? 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
                                : 'bg-[var(--info-bg)] text-[var(--info-text)]'
                            }`}
                          >
                            {transaction.type === 'swap' ? 'SWAP' : transaction.type.toUpperCase()}
                          </span>
                          <span className="font-medium text-[var(--foreground)]">
                            {transaction.teamName}
                          </span>
                          <span className="text-[var(--muted)] text-sm">
                            @{transaction.username}
                          </span>
                          {transaction.waiverBid !== undefined && (
                            <span className="text-[var(--info-text)] font-semibold text-sm">
                              ${transaction.waiverBid} FAAB
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[var(--muted)]">
                          Week {transaction.week}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {formatDate(transaction.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Value analysis */}
                    {analysis && !isAnalyzing ? (
                      <div className="mt-4 space-y-3">
                        {/* Dropped Player */}
                        {transaction.droppedPlayerName && (
                          <div>
                            <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Dropped</p>
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">−</span>
                              <div className="flex-1">
                                <div className="font-medium text-[var(--foreground)] text-sm">
                                  {transaction.droppedPlayerName}
                                </div>
                                {analysis.droppedPlayer &&
                                 analysis.droppedPlayer.valueAtTransaction !== null &&
                                 analysis.droppedPlayer.valueToday !== null ? (
                                  <div className="text-xs space-y-0.5">
                                    <div className="text-[var(--muted)]">
                                      Value at transaction: <span className="font-medium">{analysis.droppedPlayer.valueAtTransaction.toLocaleString()}</span>
                                    </div>
                                    <div className="text-[var(--muted)]">
                                      Current value: <span className="font-medium">{analysis.droppedPlayer.valueToday.toLocaleString()}</span>
                                    </div>
                                    <div className={analysis.droppedPlayer.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}>
                                      Performance: <span className="font-semibold">{analysis.droppedPlayer.gain! >= 0 ? '+' : ''}{analysis.droppedPlayer.gain!.toLocaleString()}</span> ({analysis.droppedPlayer.gainPercentage! >= 0 ? '+' : ''}{analysis.droppedPlayer.gainPercentage!.toFixed(1)}%)
                                    </div>
                                  </div>
                                ) : isKickerOrDefense(transaction.droppedPlayerId) ? (
                                  <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Added Player */}
                        {transaction.playerName && (
                          <div>
                            <p className="text-xs text-[var(--muted)] uppercase font-medium mb-1">Added</p>
                            <div className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <div className="flex-1">
                                <div className="font-medium text-[var(--foreground)] text-sm">
                                  {transaction.playerName}
                                </div>
                                {analysis.addedPlayer &&
                                 analysis.addedPlayer.valueAtTransaction !== null &&
                                 analysis.addedPlayer.valueToday !== null ? (
                                  <div className="text-xs space-y-0.5">
                                    <div className="text-[var(--muted)]">
                                      Value at transaction: <span className="font-medium">{analysis.addedPlayer.valueAtTransaction.toLocaleString()}</span>
                                    </div>
                                    <div className="text-[var(--muted)]">
                                      Current value: <span className="font-medium">{analysis.addedPlayer.valueToday.toLocaleString()}</span>
                                    </div>
                                    <div className={analysis.addedPlayer.gain! >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}>
                                      Performance: <span className="font-semibold">{analysis.addedPlayer.gain! >= 0 ? '+' : ''}{analysis.addedPlayer.gain!.toLocaleString()}</span> ({analysis.addedPlayer.gainPercentage! >= 0 ? '+' : ''}{analysis.addedPlayer.gainPercentage!.toFixed(1)}%)
                                    </div>
                                  </div>
                                ) : isKickerOrDefense(transaction.playerId) ? (
                                  <div className="text-xs text-[var(--muted)] italic">N/A (K/DST)</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Decision Quality (for all transaction types) */}
                        <div className="pt-3 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-[var(--foreground)]">Decision Quality:</span>
                            <span className={`font-bold text-base ${analysis.decisionQuality >= 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                              {analysis.decisionQuality >= 0 ? '+' : ''}{analysis.decisionQuality.toLocaleString()}
                            </span>
                          </div>
                          {transaction.type === 'swap' && (
                            <div className="text-xs text-[var(--muted)] mt-1">
                              What you got gained {analysis.addedPlayer?.gain ?? 0 >= 0 ? '+' : ''}{(analysis.addedPlayer?.gain ?? 0).toLocaleString()}, what you dropped gained {analysis.droppedPlayer?.gain ?? 0 >= 0 ? '+' : ''}{(analysis.droppedPlayer?.gain ?? 0).toLocaleString()}
                            </div>
                          )}
                          {transaction.type === 'add' && (
                            <div className="text-xs text-[var(--muted)] mt-1">
                              Player gained {analysis.addedPlayer?.gain ?? 0 >= 0 ? '+' : ''}{(analysis.addedPlayer?.gain ?? 0).toLocaleString()} since acquisition
                            </div>
                          )}
                          {transaction.type === 'drop' && (
                            <div className="text-xs text-[var(--muted)] mt-1">
                              Player gained {analysis.droppedPlayer?.gain ?? 0 >= 0 ? '+' : ''}{(analysis.droppedPlayer?.gain ?? 0).toLocaleString()} since being dropped
                            </div>
                          )}
                        </div>
                      </div>
                    ) : isAnalyzing ? (
                      <div className="mt-4 p-3 bg-[var(--surface)] text-center text-[var(--muted)] text-sm">
                        Analyzing...
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Show more button */}
        {showCount < filteredTransactions.length && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowCount(prev => prev + 20)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show More ({filteredTransactions.length - showCount} remaining)
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
