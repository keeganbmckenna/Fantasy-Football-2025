'use client';

import { useState } from 'react';
import SectionCard from './ui/SectionCard';
import type { ProcessedTransaction } from '@/lib/types';

interface AllTransactionsProps {
  transactions: ProcessedTransaction[];
}

export default function AllTransactions({ transactions }: AllTransactionsProps) {
  const [filter, setFilter] = useState<'all' | 'trades' | 'adds-drops'>('all');
  const [showCount, setShowCount] = useState(20);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

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
                const isExpanded = expandedTradeId === transaction.id;
                return (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedTradeId(isExpanded ? null : transaction.id)}
                      className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
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
                        <span className="text-gray-400 text-lg">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && transaction.tradeDetails && (
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
                                  {transaction.tradeDetails.team1.gives.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-red-500">−</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Received</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team1.receives.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-green-500">+</span>
                                      {item}
                                    </li>
                                  ))}
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
                                  {transaction.tradeDetails.team2.gives.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-red-500">−</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Received</p>
                                <ul className="space-y-1">
                                  {transaction.tradeDetails.team2.receives.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-green-500">+</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Add/Drop/Swap transactions
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
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
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      {transaction.type === 'swap' ? (
                        <>
                          Added <span className="font-medium">{transaction.playerName}</span>
                          {', '}
                          Dropped <span className="font-medium">{transaction.droppedPlayerName}</span>
                        </>
                      ) : transaction.type === 'add' ? (
                        <>
                          Added <span className="font-medium">{transaction.playerName}</span>
                        </>
                      ) : (
                        <>
                          Dropped <span className="font-medium">{transaction.playerName}</span>
                        </>
                      )}
                      {transaction.waiverBid !== undefined && (
                        <span className="ml-2 text-blue-600 font-semibold">
                          (${transaction.waiverBid} FAAB)
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
