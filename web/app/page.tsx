'use client';

import { useEffect, useState } from 'react';
import Standings from '@/components/Standings';
import WeeklyScores from '@/components/WeeklyScores';
import WeeklyMatchups from '@/components/WeeklyMatchups';
import StandingsOverTime from '@/components/StandingsOverTime';
import CumulativeScores from '@/components/CumulativeScores';
import PointsVsMedian from '@/components/PointsVsMedian';
import WeeklyRankingsHeatmap from '@/components/WeeklyRankingsHeatmap';
import PlayEveryoneAnalysis from '@/components/PlayEveryoneAnalysis';
import { LeagueData, TeamStats, WeekMatchup } from '@/lib/types';
import {
  calculateTeamStats,
  getWeeklyMatchups,
  calculateStandingsOverTime,
  calculateCumulativeScores,
  calculateDifferenceFromMedian,
  calculateWeeklyRankings,
  calculatePlayEveryoneStats,
} from '@/lib/analyze';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [matchups, setMatchups] = useState<Record<number, WeekMatchup[]>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Calculated data
  const [standingsOverTime, setStandingsOverTime] = useState<Record<string, number[]>>({});
  const [cumulativeScores, setCumulativeScores] = useState<Record<string, number[]>>({});
  const [differenceFromMedian, setDifferenceFromMedian] = useState<Record<string, number[]>>({});
  const [weeklyRankings, setWeeklyRankings] = useState<Record<string, number[]>>({});
  const [playEveryoneData, setPlayEveryoneData] = useState<any[]>([]);

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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">
              {leagueData?.league?.name || 'Fantasy Football'}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Season {leagueData?.league?.season || '2025'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <section>
              <Standings teams={teamStats} />
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
          </>
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
