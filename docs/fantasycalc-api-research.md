# FantasyCalc API Research

## Historical Player Values Discovery

After investigating the FantasyCalc website using Playwright and analyzing their API endpoints, I've discovered how to access historical player trade values.

## Key API Endpoint

The `/trades/implied/{player_id}` endpoint contains historical values:

```
https://api.fantasycalc.com/trades/implied/{player_id}?isDynasty=false&numQbs=1&ppr=0.5&numTeams=12
```

### Parameters
- `isDynasty`: `false` for redraft, `true` for dynasty
- `numQbs`: `1` for 1QB league, `2` for superflex
- `ppr`: `0` for standard, `0.5` for half-PPR, `1` for full PPR
- `numTeams`: `12` for 12-team league (optional)

## Response Structure

The endpoint returns two main arrays:

### 1. `historicalValues` (Daily Time Series)
Contains daily player values going back ~3-4 months:

```json
{
  "historicalValues": [
    {
      "date": "07/02/2025",
      "value": 7637
    },
    {
      "date": "07/03/2025",
      "value": 7637
    },
    ...
    {
      "date": "10/11/2025",
      "value": 10822
    }
  ]
}
```

**Example for Puka Nacua (player_id: 9822):**
- Data points: 102 days
- Date range: July 2, 2025 to October 11, 2025
- Starting value: 7,637
- Current value: 10,822
- Value increase: +3,185 (41.7% increase)

### 2. `impliedValues` (Trade Examples)
Contains 1,000 actual trade examples involving the player:

```json
{
  "impliedValues": [
    {
      "id": 9822,
      "date": "07/03/2025",
      "value": 6425,
      "side1": "Puka Nacua",
      "side2": "Jaylen Wright, Drake London",
      "isDynasty": false,
      "numQbs": 1
    },
    ...
  ]
}
```

This shows real trades from fantasy leagues with the calculated value difference.

## Other Useful Endpoints

### Current Player Values (All Players)
```
https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=12&ppr=0.5&includeAdp=false
```

Returns current trade values for all players with:
- `value`: Current trade value
- `overallRank`: Overall player rank
- `positionRank`: Position-specific rank
- `trend30Day`: Value change over last 30 days
- Player metadata (name, position, team, age, etc.)

### Specific Player Data
```
https://api.fantasycalc.com/players/{player_id}?isDynasty=false&numQbs=1
```

Returns current player data including:
```json
{
  "player": {
    "id": 9822,
    "name": "Puka Nacua",
    "position": "WR",
    "maybeTeam": "LAR",
    "maybeAge": 24.4,
    ...
  },
  "value": 10822,
  "overallRank": 1,
  "positionRank": 1,
  "trend30Day": 2848
}
```

### Last Updated Timestamp
```
https://api.fantasycalc.com/values/last-updated
```

Returns when values were last updated.

## Implementation Example for Your League

Since your league settings are:
- 12 teams
- Half-PPR (0.5)
- Redraft
- 1 QB

Here's a Python implementation:

```python
import requests
from datetime import datetime
import pandas as pd

class FantasyCalcAPI:
    BASE_URL = "https://api.fantasycalc.com"

    def __init__(self, is_dynasty=False, num_qbs=1, ppr=0.5, num_teams=12):
        self.params = {
            'isDynasty': str(is_dynasty).lower(),
            'numQbs': num_qbs,
            'ppr': ppr,
            'numTeams': num_teams
        }

    def get_historical_values(self, player_id):
        """Get historical trade values for a specific player."""
        response = requests.get(
            f"{self.BASE_URL}/trades/implied/{player_id}",
            params={
                'isDynasty': self.params['isDynasty'],
                'numQbs': self.params['numQbs']
            }
        )
        response.raise_for_status()
        data = response.json()

        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(data['historicalValues'])
        df['date'] = pd.to_datetime(df['date'], format='%m/%d/%Y')
        df = df.sort_values('date')

        return df

    def get_current_values(self, include_adp=False):
        """Get current values for all players."""
        params = self.params.copy()
        params['includeAdp'] = str(include_adp).lower()

        response = requests.get(
            f"{self.BASE_URL}/values/current",
            params=params
        )
        response.raise_for_status()
        return response.json()

    def get_player_data(self, player_id):
        """Get detailed data for a specific player."""
        response = requests.get(
            f"{self.BASE_URL}/players/{player_id}",
            params={
                'isDynasty': self.params['isDynasty'],
                'numQbs': self.params['numQbs']
            }
        )
        response.raise_for_status()
        return response.json()

    def get_trade_examples(self, player_id):
        """Get actual trade examples involving a player."""
        response = requests.get(
            f"{self.BASE_URL}/trades/implied/{player_id}",
            params={
                'isDynasty': self.params['isDynasty'],
                'numQbs': self.params['numQbs']
            }
        )
        response.raise_for_status()
        data = response.json()

        # Convert to DataFrame
        df = pd.DataFrame(data['impliedValues'])
        df['date'] = pd.to_datetime(df['date'], format='%m/%d/%Y')

        return df

# Usage example
api = FantasyCalcAPI(is_dynasty=False, num_qbs=1, ppr=0.5, num_teams=12)

# Get Puka Nacua's historical values
puka_history = api.get_historical_values(9822)
print(f"Puka Nacua value trend:")
print(f"  Starting (July 2): {puka_history.iloc[0]['value']}")
print(f"  Current (Oct 11): {puka_history.iloc[-1]['value']}")
print(f"  Change: +{puka_history.iloc[-1]['value'] - puka_history.iloc[0]['value']}")

# Get all current player values
all_values = api.get_current_values()
print(f"\nTotal players with values: {len(all_values)}")

# Get trade examples
trades = api.get_trade_examples(9822)
print(f"\nTrade examples available: {len(trades)}")
print(f"Most recent trade: {trades.iloc[-1]['side1']} for {trades.iloc[-1]['side2']}")
```

## Player ID Mapping

To find player IDs, you can:

1. **Search the player database:**
   ```
   https://api.fantasycalc.com/players/database/searchable?isDynasty=false
   ```
   Returns all players with their IDs

2. **Use the website URL:**
   Example: `https://fantasycalc.com/players/puka-nacua-9822`
   The ID is `9822`

## Notes on Data Quality

- Historical values go back approximately 3-4 months (102 daily data points in this example)
- Values are updated multiple times per day based on real trade data
- The system processes millions of trades (5,148,601 as of October 2025)
- Values are calculated algorithmically from actual fantasy league trades
- The `trend30Day` field shows value change over the last 30 days

## Integration with Your Trade Analyzer

For your trade scoring system, you can:

1. **Real-time Values**: Use `/values/current` to get all player values
2. **Historical Context**: Use `/trades/implied/{player_id}` to show value trends
3. **Trade Comparisons**: Compare proposed trades against the `impliedValues` examples
4. **Trend Analysis**: Use the 30-day trend and historical data to identify buy-low/sell-high opportunities

Example trade analyzer enhancement:
```python
def analyze_trade(api, team_gives_player_ids, team_receives_player_ids):
    """Analyze a trade proposal."""
    all_values = api.get_current_values()
    value_map = {p['player']['id']: p for p in all_values}

    gives_total = sum(value_map[pid]['value'] for pid in team_gives_player_ids)
    receives_total = sum(value_map[pid]['value'] for pid in team_receives_player_ids)

    # Check historical trends
    for pid in team_receives_player_ids:
        hist = api.get_historical_values(pid)
        trend = "rising" if hist.iloc[-1]['value'] > hist.iloc[0]['value'] else "falling"
        print(f"  {value_map[pid]['player']['name']}: {trend} ({hist.iloc[-30:]['value'].mean():.0f} avg last 30 days)")

    return {
        'gives_value': gives_total,
        'receives_value': receives_total,
        'difference': receives_total - gives_total,
        'fairness_score': min(gives_total, receives_total) / max(gives_total, receives_total) * 100
    }
```

## Rate Limiting & Best Practices

- No authentication required for these endpoints
- Reasonable rate limiting should be respected
- Consider caching responses (values update multiple times per day but not constantly)
- Store historical data locally if you need longer-term trends
