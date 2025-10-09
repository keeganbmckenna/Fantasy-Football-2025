# Tangy Football - Web Application

Modern Next.js web application for fantasy football analytics powered by the Sleeper API.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file (optional)
cp .env.local.example .env.local

# Edit .env.local with your Sleeper league ID (if different from default)
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
web/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── league/          # League data and weekly matchups
│   │   ├── players/         # Player name resolution with caching
│   │   └── transactions/    # Transaction history data
│   ├── page.tsx             # Main dashboard page
│   ├── layout.tsx           # Root layout with metadata
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Shared UI components
│   │   └── SectionCard.tsx  # Reusable card component
│   ├── AllTransactions.tsx  # Transaction timeline with filtering
│   ├── CumulativeScores.tsx
│   ├── CustomTooltip.tsx
│   ├── PlayEveryoneAnalysis.tsx
│   ├── PlayoffRace.tsx      # Division standings & wild card
│   ├── PointsVsMedian.tsx
│   ├── StandingsOverTime.tsx
│   ├── WeeklyMatchups.tsx
│   ├── WeeklyPlayAll.tsx
│   ├── WeeklyRankingsHeatmap.tsx
│   └── WeeklyScores.tsx
├── hooks/                   # Custom React hooks
│   ├── useChartHover.ts     # Chart interaction state
│   └── useTeamColors.ts     # Team color mapping
├── lib/                     # Utilities and configuration
│   ├── analyze.ts           # Statistical calculations
│   ├── transactionAnalyze.ts # Transaction processing
│   ├── constants.ts         # Shared constants (colors, config)
│   ├── config.ts            # App configuration
│   └── types.ts             # TypeScript type definitions
└── public/                  # Static assets
```

## Configuration

### Environment Variables

Create a `.env.local` file in the `web` directory:

```env
# Your Sleeper League ID
NEXT_PUBLIC_LEAGUE_ID=your_league_id_here
```

Get your league ID from your Sleeper league URL:
`https://sleeper.com/leagues/YOUR_LEAGUE_ID/league`

## Features

- **Real-time Data**: Fetches live data from Sleeper API with smart caching
- **Interactive Charts**: Hover over team names to highlight their performance across all visualizations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smart Caching**: CDN and in-memory caching for optimal performance without stale data

### Analytics Tabs

1. **Overview**
   - Division standings with leader indicators
   - Wild card playoff race tracking
   - Weekly head-to-head matchups

2. **Weekly Performance**
   - Weekly scoring charts for all teams
   - Rankings heatmap showing performance trends

3. **Season Trends**
   - Standings progression over time
   - Cumulative scoring charts
   - Points vs. median performance

4. **Advanced Stats**
   - Play-everyone record (record if you played all teams each week)
   - Weekly play-all win percentages
   - Luck analysis

5. **Transactions**
   - Complete transaction timeline
   - Filter by: All, Trades, or Adds/Drops
   - Player name resolution
   - FAAB spending tracking
   - Combined add+drop display as swaps
   - Expandable trade details showing both sides

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Recharts** - Interactive data visualizations
- **Sleeper API** - Fantasy football data source with smart caching

## Development

### Code Organization

- Components are organized by feature and reusability
- Shared logic extracted into custom hooks
- Constants centralized in `lib/constants.ts`
- All data calculations in `lib/analyze.ts`

### Key Patterns

- Server Components for data fetching
- Client Components for interactivity
- Memoization for expensive calculations
- Consistent color schemes across all visualizations

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Set `NEXT_PUBLIC_LEAGUE_ID` in environment variables
4. Deploy!

### Other Platforms

This is a standard Next.js application and can be deployed to any platform that supports Next.js:

- AWS Amplify
- Netlify
- Railway
- Render
- Self-hosted with Docker

## License

MIT
