# Fantasy Football 2025 - Tangy Football

A modern Next.js web application for analyzing Sleeper fantasy football league data with comprehensive statistics, interactive charts, and real-time updates.

## Features

### Overview Tab
- 🏆 **Division Standings** - Division breakdown with team records, games/points back, and leader highlights
- 🎯 **Wild Card Race** - Playoff picture with IN/OUT status and cutoff line
- 🏈 **Weekly Matchups** - Expandable week-by-week results with scores and winners

### Weekly Performance Tab
- 📈 **Weekly Scores** - Score table with win/loss color coding and margin context
- 🔥 **Weekly Rankings Heatmap** - Color-coded heatmap of weekly rank (1-N)

### Season Trends Tab
- 📉 **Standings Over Time** - Week-by-week rank history
- 💯 **Cumulative Scores** - Running totals of points
- 📊 **Difference from Median** - Cumulative points above/below median

### Advanced Stats Tab
- 🎲 **Play Everyone Analysis** - Hypothetical records if teams played all opponents weekly
- 📋 **Weekly Play All** - Week-by-week theoretical records for consistency checks
- 🎯 **Schedule Luck Distribution** - Simulated win distributions with actual record highlight

### Transactions Tab
- 🔄 **Status** - Currently hidden; transaction analysis needs more work to provide clear value

### UI & Experience
- 🎨 **Theme Toggle** - Light, dark, and system theme support
- 🖱️ **Interactive Legends** - Hover to highlight teams on charts
- 🎯 **Custom Tooltips** - Sorted, scrollable tooltips for dense charts
- 📱 **Responsive Design** - Desktop and mobile friendly layouts

## Project Structure

```
.
├── web/                      # Next.js web application
│   ├── app/
│   │   ├── api/league/       # Sleeper league data
│   │   ├── api/players/      # Cached player map
│   │   ├── api/transactions/ # Transaction history
│   │   ├── page.tsx          # Main page with tabs
│   │   └── layout.tsx        # App layout + theme bootstrap
│   ├── components/           # React components
│   │   ├── ScheduleLuckDistribution.tsx
│   │   ├── PlayEveryoneAnalysis.tsx
│   │   ├── WeeklyPlayAll.tsx
│   │   ├── WeeklyScores.tsx
│   │   └── ui/               # Shared UI pieces
│   ├── hooks/                # Theme + chart helpers
│   └── lib/                  # Utilities, API clients, and analytics
│       ├── analyze.ts
│       ├── config.ts
│       ├── leagueSettings.ts
│       └── theme.ts
├── scripts/                  # Python data tooling
└── league_data.json          # Example data dump
```

## Getting Started

### Web Application

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Python Analysis (Optional)

The Python scripts can be used to fetch and analyze data separately:

1. Install Python dependencies:
   ```bash
   uv add requests pandas openpyxl
   ```

2. Fetch league data:
   ```bash
   uv run python scripts/fetch_data.py
   ```

3. Generate analysis Excel file:
   ```bash
   uv run python scripts/analyze_data.py
   ```

## Configuration

### Sleeper League

Set the league ID with an environment variable or update the fallback in `web/lib/config.ts`.

```bash
NEXT_PUBLIC_LEAGUE_ID=YOUR_LEAGUE_ID
```

### Caching

Cache durations and retry settings live in `web/lib/config.ts` under `CACHE_CONFIG` and `RETRY_CONFIG`.

## Deployment

### Deploy to Netlify

1. Push your code to GitHub.
2. Connect your repository to your hosting site.
3. Deploy.

The app will automatically fetch live data from the Sleeper API on each page load.

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Interactive charting library
- **Sleeper API** - Fantasy football data source
- **FantasyCalc API** - Trade value analytics
- **Python** - Data fetching and analysis scripts

## Analytics Coverage

### Core Metrics
- Division standings and wild card race
- Weekly scores, matchups, and heatmaps
- Cumulative and median-relative scoring trends

### Advanced Analytics
- Play-everyone and weekly play-all records
- Schedule luck simulations with win distributions
- Transaction analysis is temporarily disabled while refining insights

## Development Notes

- Charts use interactive hover state to emphasize teams
- Tooltips are optimized for 12+ teams with sorted output
- Theme preference is stored in local storage and respects system defaults

## License

MIT
