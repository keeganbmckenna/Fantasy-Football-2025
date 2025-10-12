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
          totalGain: 0,
        });
      }
      const team1 = teamMap.get(team1Key)!;
      team1.tradesGain += analysis.team1.totalGain;

      // Add gain for team2
      const team2Key = transaction.tradeDetails.team2.username;
      if (!teamMap.has(team2Key)) {
        teamMap.set(team2Key, {
          teamName: transaction.tradeDetails.team2.teamName,
          username: transaction.tradeDetails.team2.username,
          tradesGain: 0,
          addDropsGain: 0,
          totalGain: 0,
        });
      }
      const team2 = teamMap.get(team2Key)!;
      team2.tradesGain += analysis.team2.totalGain;
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
          totalGain: 0,
        });
      }
      const team = teamMap.get(teamKey)!;
      team.addDropsGain += analysis.netChange;
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
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Team Value Summary</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adds/Drops
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamValueSummary.map((team) => (
                  <tr key={team.username} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                      <div className="text-xs text-gray-500">{team.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={team.tradesGain > 0 ? 'text-green-600 font-medium' : team.tradesGain < 0 ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                        {team.tradesGain > 0 ? '+' : ''}{team.tradesGain.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={team.addDropsGain > 0 ? 'text-green-600 font-medium' : team.addDropsGain < 0 ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                        {team.addDropsGain > 0 ? '+' : ''}{team.addDropsGain.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-bold ${team.totalGain > 0 ? 'text-green-600' : team.totalGain < 0 ? 'text-red-600' : 'text-gray-900'}`}>
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
          <div className="mb-8 p-6 bg-gray-50 text-center text-gray-500">
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
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({allCount})
          </button>
          <button
            onClick={() => setFilter('trades')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'trades'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trades ({tradesCount})
          </button>
          <button
            onClick={() => setFilter('adds-drops')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'adds-drops'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Adds/Drops ({addsDropsCount})
          </button>
        </div>

        {/* Transaction list */}
        <div className="space-y-3 max-h-[800px] overflow-y-auto">
          {displayedTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found</p>
          ) : (
            displayedTransactions.map(transaction => {
              if (transaction.type === 'trade') {
                const analysis = tradeAnalyses.get(transaction.id);
                return (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="w-full flex items-center justify-between p-4 bg-purple-50">

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                            TRADE
                          </span>
                          <span className="font-medium text-gray-900">
                            {transaction.teamName}
                          </span>
                          <span className="text-gray-400">↔️</span>
                          <span className="font-medium text-gray-900">
                            {transaction.tradePartnerTeamName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Week {transaction.week}</div>
                          <div className="text-xs text-gray-400">{formatDate(transaction.timestamp)}</div>
                        </div>
                      </div>
                    </div>

                    {transaction.tradeDetails && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Team 1 */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">
                              {transaction.tradeDetails.team1.teamName}
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Gave Up</p>
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
                                            <div className="font-medium text-gray-700">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-gray-600">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Received</p>
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
                                            <div className="font-medium text-gray-700">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-gray-600">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
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
                            <h4 className="font-semibold text-gray-900 mb-3">
                              {transaction.tradeDetails.team2.teamName}
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Gave Up</p>
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
                                            <div className="font-medium text-gray-700">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-gray-600">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Received</p>
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
                                            <div className="font-medium text-gray-700">{item}</div>
                                            {playerValue && playerValue.valueAtTrade !== null && playerValue.valueToday !== null ? (
                                              <div className="text-xs text-gray-600">
                                                {playerValue.valueAtTrade.toLocaleString()} → {playerValue.valueToday.toLocaleString()}
                                                <span className={`ml-1 ${playerValue.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  ({playerValue.gain! >= 0 ? '+' : ''}{playerValue.gain!.toLocaleString()}, {playerValue.gainPercentage! >= 0 ? '+' : ''}{playerValue.gainPercentage!.toFixed(1)}%)
                                                </span>
                                              </div>
                                            ) : isKOrDef ? (
                                              <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
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
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="space-y-4">
                              {(() => {
                                return (
                                  <>
                                    {/* Winner Banner */}
                                    {analysis.status === 'success' && (
                                      <div className={`p-3 rounded-lg text-center font-semibold ${
                                        analysis.winner === 'even'
                                          ? 'bg-gray-100 text-gray-800'
                                          : analysis.winner === 'team1'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-blue-100 text-blue-800'
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
                                      <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold text-gray-900">{transaction.tradeDetails.team1.teamName}</span>
                                          <span className={`font-bold text-lg ${
                                            analysis.team1.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {analysis.team1.totalGain >= 0 ? '+' : ''}{analysis.team1.totalGain.toLocaleString()}
                                            <span className="text-sm ml-1">
                                              ({analysis.team1.gainPercentage >= 0 ? '+' : ''}{analysis.team1.gainPercentage.toFixed(1)}%)
                                            </span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Team 2 Summary */}
                                      <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold text-gray-900">{transaction.tradeDetails.team2.teamName}</span>
                                          <span className={`font-bold text-lg ${
                                            analysis.team2.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {analysis.team2.totalGain >= 0 ? '+' : ''}{analysis.team2.totalGain.toLocaleString()}
                                            <span className="text-sm ml-1">
                                              ({analysis.team2.gainPercentage >= 0 ? '+' : ''}{analysis.team2.gainPercentage.toFixed(1)}%)
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Messages */}
                                    {analysis.status === 'partial' && (
                                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                        ⚠️ {analysis.errorMessage}
                                      </div>
                                    )}
                                    {analysis.status === 'error' && (
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                                        ❌ {analysis.errorMessage}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                        </div>
                        ) : (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="p-3 bg-gray-50 text-center text-gray-500 text-sm">
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
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              transaction.type === 'add'
                                ? 'bg-green-100 text-green-800'
                                : transaction.type === 'drop'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {transaction.type === 'swap' ? 'SWAP' : transaction.type.toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900">
                            {transaction.teamName}
                          </span>
                          <span className="text-gray-500 text-sm">
                            @{transaction.username}
                          </span>
                          {transaction.waiverBid !== undefined && (
                            <span className="text-blue-600 font-semibold text-sm">
                              ${transaction.waiverBid} FAAB
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Week {transaction.week}
                        </div>
                        <div className="text-xs text-gray-400">
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
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dropped</p>
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">−</span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-700 text-sm">
                                  {transaction.droppedPlayerName}
                                </div>
                                {analysis.droppedPlayer &&
                                 analysis.droppedPlayer.valueAtTransaction !== null &&
                                 analysis.droppedPlayer.valueToday !== null ? (
                                  <div className="text-xs text-gray-600">
                                    {analysis.droppedPlayer.valueAtTransaction.toLocaleString()} → {analysis.droppedPlayer.valueToday.toLocaleString()}
                                    <span className={`ml-1 ${analysis.droppedPlayer.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({analysis.droppedPlayer.gain! >= 0 ? '+' : ''}{analysis.droppedPlayer.gain!.toLocaleString()}, {analysis.droppedPlayer.gainPercentage! >= 0 ? '+' : ''}{analysis.droppedPlayer.gainPercentage!.toFixed(1)}%)
                                    </span>
                                  </div>
                                ) : isKickerOrDefense(transaction.droppedPlayerId) ? (
                                  <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Added Player */}
                        {transaction.playerName && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Added</p>
                            <div className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">+</span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-700 text-sm">
                                  {transaction.playerName}
                                </div>
                                {analysis.addedPlayer &&
                                 analysis.addedPlayer.valueAtTransaction !== null &&
                                 analysis.addedPlayer.valueToday !== null ? (
                                  <div className="text-xs text-gray-600">
                                    {analysis.addedPlayer.valueAtTransaction.toLocaleString()} → {analysis.addedPlayer.valueToday.toLocaleString()}
                                    <span className={`ml-1 ${analysis.addedPlayer.gain! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({analysis.addedPlayer.gain! >= 0 ? '+' : ''}{analysis.addedPlayer.gain!.toLocaleString()}, {analysis.addedPlayer.gainPercentage! >= 0 ? '+' : ''}{analysis.addedPlayer.gainPercentage!.toFixed(1)}%)
                                    </span>
                                  </div>
                                ) : isKickerOrDefense(transaction.playerId) ? (
                                  <div className="text-xs text-gray-500 italic">N/A (K/DST)</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Net Change (only for swaps with both values) */}
                        {transaction.type === 'swap' &&
                         analysis.addedPlayer?.valueAtTransaction !== null &&
                         analysis.droppedPlayer?.valueAtTransaction !== null && (
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center text-sm gap-2">
                              <span className="font-medium text-gray-700">Net change:</span>
                              <span className={`font-bold ${analysis.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {analysis.netChange >= 0 ? '+' : ''}{analysis.netChange.toLocaleString()}
                                <span className="text-xs ml-1">
                                  ({analysis.netChangePercentage >= 0 ? '+' : ''}{analysis.netChangePercentage.toFixed(1)}%)
                                </span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isAnalyzing ? (
                      <div className="mt-4 p-3 bg-gray-50 text-center text-gray-500 text-sm">
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
