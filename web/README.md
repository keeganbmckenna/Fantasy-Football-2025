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
│   ├── api/league/          # API route for Sleeper data
│   ├── page.tsx             # Main dashboard page
│   ├── layout.tsx           # Root layout with metadata
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Shared UI components
│   │   └── SectionCard.tsx  # Reusable card component
│   ├── CumulativeScores.tsx
│   ├── CustomTooltip.tsx
│   ├── PlayEveryoneAnalysis.tsx
│   ├── PointsVsMedian.tsx
│   ├── Standings.tsx
│   ├── StandingsOverTime.tsx
│   ├── WeeklyMatchups.tsx
│   ├── WeeklyPlayAll.tsx
│   ├── WeeklyRankingsHeatmap.tsx
│   └── WeeklyScores.tsx
├── hooks/                   # Custom React hooks
│   ├── useChartHover.ts     # Chart interaction state
│   └── useTeamColors.ts     # Team color mapping
├── lib/                     # Utilities and configuration
│   ├── analyze.ts           # Data calculation functions
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

- **Real-time Data**: Fetches live data from Sleeper API on each page load
- **Interactive Charts**: Hover over team names to highlight their performance
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **No Caching**: Always shows the most up-to-date league information

### Analytics Tabs

1. **Overview** - League standings and weekly matchups
2. **Weekly Performance** - Weekly scores and rankings heatmap
3. **Season Trends** - Standings progression and cumulative statistics
4. **Advanced Stats** - Play-everyone analysis and win percentage

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Recharts** - Interactive data visualizations
- **Sleeper API** - Fantasy football data source

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
