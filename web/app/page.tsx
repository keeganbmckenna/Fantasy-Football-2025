'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import PlayoffRace from '@/components/PlayoffRace';
import WeeklyScores from '@/components/WeeklyScores';
import WeeklyMatchups from '@/components/WeeklyMatchups';
import StandingsOverTime from '@/components/StandingsOverTime';
import CumulativeScores from '@/components/CumulativeScores';
import PointsVsMedian from '@/components/PointsVsMedian';
import WeeklyRankingsHeatmap from '@/components/WeeklyRankingsHeatmap';
import PlayEveryoneAnalysis from '@/components/PlayEveryoneAnalysis';
import WeeklyPlayAll from '@/components/WeeklyPlayAll';
import AllTransactions from '@/components/AllTransactions';
import { LeagueData, TeamStats, WeekMatchup, PlayEveryoneStats, WeeklyPlayAllStats, DivisionStanding, WildCardStanding, SleeperTransaction, ProcessedTransaction } from '@/lib/types';
import {
  calculateTeamStats,
  getWeeklyMatchups,
  calculateStandingsOverTime,
  calculateCumulativeScores,
  calculateDifferenceFromMedian,
  calculateWeeklyRankings,
  calculatePlayEveryoneStats,
  calculateWeeklyPlayAll,
  calculateDivisionStandings,
  calculateWildCardStandings,
} from '@/lib/analyze';
import {
  processTransactions,
  extractTrades,
  tradesToProcessedTransactions,
} from '@/lib/transactionAnalyze';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [matchups, setMatchups] = useState<Record<number, WeekMatchup[]>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculated data
  const [standingsOverTime, setStandingsOverTime] = useState<Record<string, number[]>>({});
  const [cumulativeScores, setCumulativeScores] = useState<Record<string, number[]>>({});
  const [differenceFromMedian, setDifferenceFromMedian] = useState<Record<string, number[]>>({});
  const [weeklyRankings, setWeeklyRankings] = useState<Record<string, number[]>>({});
  const [playEveryoneData, setPlayEveryoneData] = useState<PlayEveryoneStats[]>([]);
  const [weeklyPlayAllData, setWeeklyPlayAllData] = useState<WeeklyPlayAllStats[]>([]);
  const [divisions, setDivisions] = useState<DivisionStanding[]>([]);
  const [wildCard, setWildCard] = useState<WildCardStanding[]>([]);

  // Transaction data
  const [allTransactions, setAllTransactions] = useState<ProcessedTransaction[]>([]);
  const [playerPositions, setPlayerPositions] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/league');
        if (!response.ok) {
          throw new Error('Failed to fetch league data');
        }
        const data: LeagueData = await response.json();
        setLeagueData(data);

        // Calculate stats
        const stats = calculateTeamStats(data);
        setTeamStats(stats);

        // Get matchups
        const weeklyMatchups = getWeeklyMatchups(data);
        setMatchups(weeklyMatchups);

        // Calculate additional analytics
        setStandingsOverTime(calculateStandingsOverTime(stats));
        setCumulativeScores(calculateCumulativeScores(stats));
        setDifferenceFromMedian(calculateDifferenceFromMedian(stats));
        setWeeklyRankings(calculateWeeklyRankings(stats));
        setPlayEveryoneData(calculatePlayEveryoneStats(stats));
        setWeeklyPlayAllData(calculateWeeklyPlayAll(stats));

        // Calculate division standings and wild card race
        const divisionStandings = calculateDivisionStandings(stats);
        setDivisions(divisionStandings);

        const playoffSpots = data.league?.settings?.playoff_teams || 6;
        const wildCardStandings = calculateWildCardStandings(stats, playoffSpots);
        setWildCard(wildCardStandings);

        // Fetch player data and transaction data in parallel
        const [transactionRes, playerRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/players')
        ]);

        let playerNames: Record<string, string> = {};
        let positions: Record<string, string> = {};
        if (playerRes.ok) {
          const playerData = await playerRes.json();
          playerNames = playerData.players || {};
          positions = playerData.positions || {};
          setPlayerPositions(positions);
        }

        if (transactionRes.ok) {
          const transactionData: { transactions: Array<SleeperTransaction & { week: number }> } = await transactionRes.json();

          // Process transactions with player names (includes adds, drops, swaps)
          const processedTransactions = processTransactions(
            transactionData.transactions,
            data,
            playerNames
          );

          // Extract trades with player names, convert to ProcessedTransaction format
          const tradeData = extractTrades(
            transactionData.transactions,
            data,
            playerNames
          );
          const processedTrades = tradesToProcessedTransactions(tradeData);

          // Combine all transactions and sort by timestamp
          const combined = [...processedTransactions, ...processedTrades].sort((a, b) => b.timestamp - a.timestamp);
          setAllTransactions(combined);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading league data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-red-800 text-xl font-bold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'weekly', name: 'Weekly Performance', icon: '📈' },
    { id: 'trends', name: 'Season Trends', icon: '📉' },
    { id: 'advanced', name: 'Advanced Stats', icon: '🔬' },
    { id: 'transactions', name: 'Transactions', icon: '🔄' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4">
              {leagueData?.league?.avatar && (
                <Image
                  src={`https://sleepercdn.com/avatars/${leagueData.league.avatar}`}
                  alt="League Avatar"
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              )}
              <h1 className="text-4xl font-bold text-gray-900">
                {leagueData?.league?.name || 'Fantasy Football'}
              </h1>
            </div>
            <p className="mt-2 text-lg text-gray-600">
              Season {leagueData?.league?.season || '2025'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop Navigation */}
            <nav className="-mb-px hidden md:flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-between w-full py-4 text-left"
                aria-expanded={mobileMenuOpen}
              >
                <span className="text-sm font-medium text-gray-900">
                  <span className="mr-2">{tabs.find(t => t.id === activeTab)?.icon}</span>
                  {tabs.find(t => t.id === activeTab)?.name}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-500 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {mobileMenuOpen && (
                <div className="pb-3 space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      } block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <section>
              <PlayoffRace
                divisions={divisions}
                wildCard={wildCard}
              />
            </section>
            <section>
              <WeeklyMatchups matchups={matchups} />
            </section>
          </>
        )}

        {/* Weekly Performance Tab */}
        {activeTab === 'weekly' && (
          <>
            <section>
              <WeeklyScores teams={teamStats} />
            </section>
            <section>
              <WeeklyRankingsHeatmap rankingsData={weeklyRankings} teams={teamStats} />
            </section>
          </>
        )}

        {/* Season Trends Tab */}
        {activeTab === 'trends' && (
          <>
            <section>
              <StandingsOverTime standingsData={standingsOverTime} teams={teamStats} />
            </section>
            <section>
              <CumulativeScores cumulativeData={cumulativeScores} teams={teamStats} />
            </section>
            <section>
              <PointsVsMedian differenceData={differenceFromMedian} teams={teamStats} />
            </section>
          </>
        )}

        {/* Advanced Stats Tab */}
        {activeTab === 'advanced' && (
          <>
            <section>
              <PlayEveryoneAnalysis data={playEveryoneData} />
            </section>
            <section>
              <WeeklyPlayAll data={weeklyPlayAllData} />
            </section>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <section>
            <AllTransactions transactions={allTransactions} playerPositions={playerPositions} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500 text-sm">
          <p>
            Data from{' '}
            <a
              href="https://sleeper.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Sleeper
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
