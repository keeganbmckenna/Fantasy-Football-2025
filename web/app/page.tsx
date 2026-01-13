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
import ScheduleLuckDistribution from '@/components/ScheduleLuckDistribution';
import WeeklyPlayAll from '@/components/WeeklyPlayAll';
import AllTransactions from '@/components/AllTransactions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { LeagueData, TeamStats, WeekMatchup, PlayEveryoneStats, WeeklyPlayAllStats, DivisionStanding, WildCardStanding, SleeperTransaction, ProcessedTransaction, ScheduleLuckSimulation } from '@/lib/types';
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
  simulateScheduleLuck,
} from '@/lib/analyze';
import { getLeagueSettings } from '@/lib/leagueSettings';
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
  const [scheduleLuckSimulation, setScheduleLuckSimulation] = useState<ScheduleLuckSimulation | null>(null);
  const [divisions, setDivisions] = useState<DivisionStanding[]>([]);
  const [wildCard, setWildCard] = useState<WildCardStanding[]>([]);

  const regularSeasonWeekCap = leagueData
    ? Math.min(leagueData.lastScoredWeek, getLeagueSettings(leagueData.league).regularSeasonEnd)
    : undefined;

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

        // Calculate stats (pass lastScoredWeek to limit performance metrics to completed weeks)
        const stats = calculateTeamStats(data, data.lastScoredWeek);
        setTeamStats(stats);

        const leagueSettings = getLeagueSettings(data.league);
        const regularSeasonWeekCap = Math.min(
          data.lastScoredWeek,
          leagueSettings.regularSeasonEnd
        );

        // Get matchups
        const weeklyMatchups = getWeeklyMatchups(data);
        setMatchups(weeklyMatchups);

        // Calculate additional analytics
        // Only count completed regular-season weeks for weekly analytics
        setStandingsOverTime(calculateStandingsOverTime(stats, regularSeasonWeekCap));
        setCumulativeScores(calculateCumulativeScores(stats, regularSeasonWeekCap));
        setDifferenceFromMedian(calculateDifferenceFromMedian(stats, regularSeasonWeekCap));
        setWeeklyRankings(calculateWeeklyRankings(stats, regularSeasonWeekCap));
        setPlayEveryoneData(calculatePlayEveryoneStats(stats, regularSeasonWeekCap));
        setWeeklyPlayAllData(calculateWeeklyPlayAll(stats, regularSeasonWeekCap));
        setScheduleLuckSimulation(simulateScheduleLuck(stats, 20000, regularSeasonWeekCap));

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
    return <LoadingSpinner message="Loading league data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="bg-[var(--surface-elevated)] border border-[var(--danger-text)]/40 rounded-lg p-8 max-w-md">
          <h2 className="text-[var(--danger-text)] text-xl font-bold mb-2">Error</h2>
          <p className="text-[var(--muted)]">{error}</p>
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="bg-[var(--surface-elevated)] shadow-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex flex-col items-center gap-3">
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
                <h1 className="text-4xl font-bold text-[var(--foreground)]">
                  {leagueData?.league?.name || 'Fantasy Football'}
                </h1>
              </div>
              <ThemeToggle />
            </div>
            <p className="mt-2 text-lg text-[var(--muted)]">
              Season {leagueData?.league?.season || '2025'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop Navigation */}
            <nav className="-mb-px hidden md:flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
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
                <span className="text-sm font-medium text-[var(--foreground)]">
                  <span className="mr-2">{tabs.find(t => t.id === activeTab)?.icon}</span>
                  {tabs.find(t => t.id === activeTab)?.name}
                </span>
                <svg
                  className={`h-5 w-5 text-[var(--muted)] transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
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
                          ? 'bg-[var(--surface)] text-[var(--accent)]'
                          : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
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
            <ErrorBoundary>
              <section>
                <PlayoffRace
                  divisions={divisions}
                  wildCard={wildCard}
                />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <WeeklyMatchups matchups={matchups} />
              </section>
            </ErrorBoundary>
          </>
        )}

        {/* Weekly Performance Tab */}
        {activeTab === 'weekly' && (
          <>
            <ErrorBoundary>
              <section>
                <WeeklyScores teams={teamStats} maxWeek={regularSeasonWeekCap} />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <WeeklyRankingsHeatmap rankingsData={weeklyRankings} teams={teamStats} maxWeek={regularSeasonWeekCap} />
              </section>
            </ErrorBoundary>
          </>
        )}

        {/* Season Trends Tab */}
        {activeTab === 'trends' && (
          <>
            <ErrorBoundary>
              <section>
                <StandingsOverTime standingsData={standingsOverTime} teams={teamStats} maxWeek={regularSeasonWeekCap} />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <CumulativeScores
                  cumulativeData={cumulativeScores}
                  teams={teamStats}
                  maxWeek={regularSeasonWeekCap}
                />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <PointsVsMedian
                  differenceData={differenceFromMedian}
                  teams={teamStats}
                  maxWeek={regularSeasonWeekCap}
                />
              </section>
            </ErrorBoundary>
          </>
        )}

        {/* Advanced Stats Tab */}
        {activeTab === 'advanced' && (
          <>
            <ErrorBoundary>
              <section>
                <PlayEveryoneAnalysis data={playEveryoneData} />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <ScheduleLuckDistribution data={scheduleLuckSimulation} />
              </section>
            </ErrorBoundary>
            <ErrorBoundary>
              <section>
                <WeeklyPlayAll data={weeklyPlayAllData} />
              </section>
            </ErrorBoundary>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <ErrorBoundary>
            <section>
              <AllTransactions transactions={allTransactions} playerPositions={playerPositions} />
            </section>
          </ErrorBoundary>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--surface-elevated)] border-t border-[var(--border)] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-[var(--muted)] text-sm">
          <p>
            Data from{' '}
            <a
              href="https://sleeper.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:opacity-80 underline"
            >
              Sleeper
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
