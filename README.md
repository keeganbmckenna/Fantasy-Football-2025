# Fantasy Football 2025 - Tangy Football

A modern Next.js web application for analyzing Sleeper fantasy football league data with comprehensive statistics, interactive charts, and real-time updates.

## Features

### Overview Tab
- 📊 **League Standings** - Current standings with win/loss records, points for/against, and averages
- 🏈 **Weekly Matchups** - Expandable week-by-week matchup results with scores and winners

### Weekly Performance Tab
- 📈 **Weekly Scores** - Visual bar chart showing all teams' scores each week
- 🔥 **Weekly Rankings Heatmap** - Color-coded heatmap showing performance ranking each week

### Season Trends Tab
- 📉 **Standings Over Time** - Track position changes throughout the season
- 💯 **Cumulative Scores** - Total points accumulated over the season
- 📊 **Difference from Median** - Shows how far above/below the median each team is performing

### Advanced Stats Tab
- 🎲 **Play Everyone Analysis** - "What if every team played every other team each week?" comparison

### Interactive Features
- 🖱️ **Interactive Legend** - Hover over team names to highlight their line on charts
- 🎯 **Custom Tooltips** - Sorted, scrollable tooltips showing all teams ranked by performance
- 🔄 **No Caching** - Always fetches fresh data from Sleeper API
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Project Structure

```
.
├── web/                      # Next.js web application
│   ├── app/
│   │   ├── api/league/       # API route for Sleeper data
│   │   ├── page.tsx          # Main page with tabs
│   │   └── layout.tsx        # App layout
│   ├── components/           # React components
│   │   ├── Standings.tsx
│   │   ├── WeeklyScores.tsx
│   │   ├── WeeklyMatchups.tsx
│   │   ├── StandingsOverTime.tsx
│   │   ├── CumulativeScores.tsx
│   │   ├── PointsVsMedian.tsx
│   │   ├── WeeklyRankingsHeatmap.tsx
│   │   ├── PlayEveryoneAnalysis.tsx
│   │   └── CustomTooltip.tsx
│   └── lib/                  # Utilities and types
│       ├── types.ts
│       └── analyze.ts        # Data calculation functions
├── fetch_data.py             # Python script to fetch data
└── analyze_data.py           # Python script to analyze data
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
   uv run python fetch_data.py
   ```

3. Generate analysis Excel file:
   ```bash
   uv run python analyze_data.py
   ```

## Configuration

To use with a different Sleeper league:

1. Update the `LEAGUE_ID` in:
   - `web/app/api/league/route.ts`
   - `fetch_data.py`

2. Replace with your league ID from the Sleeper URL:
   ```
   https://sleeper.com/leagues/YOUR_LEAGUE_ID/league
   ```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Connect your repository to [Vercel](https://vercel.com)

3. Set the root directory to `web`

4. Deploy!

The app will automatically fetch live data from the Sleeper API on each page load.

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Interactive charting library
- **Sleeper API** - Fantasy football data source
- **Python** - Data fetching and analysis scripts

## Stats & Visualizations

The app provides comprehensive analytics including:

### Basic Stats
- **Current Standings** - Rankings with wins, losses, ties, points for/against
- **Weekly Scores** - Points scored by each team each week
- **Matchup History** - Head-to-head results with winners highlighted

### Advanced Analytics
- **Standings Progression** - How team rankings change week by week
- **Cumulative Performance** - Running totals of points and wins
- **Median Comparison** - Performance relative to league median
- **Weekly Rankings** - Heatmap showing weekly performance ranks (1-12)
- **Play Everyone Stats** - Hypothetical records if teams played all opponents each week

### Visualization Features
- All charts use interactive legends (hover to highlight)
- Custom tooltips show all teams sorted by performance
- Color-coded heatmaps for easy pattern recognition
- Responsive charts that work on all screen sizes

## Development Notes

- API route (`/api/league`) is configured with `no-cache` to ensure fresh data
- All fetch requests use `cache: 'no-store'` for real-time updates
- Charts use state management for interactive hover effects
- Custom tooltip component handles overflow and scrolling for 12+ teams

## License

MIT
