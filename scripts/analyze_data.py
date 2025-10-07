"""
Analyze league data and generate statistics similar to Fantasy 2023.xlsx
"""
import json
import pandas as pd
from typing import Dict, List, Any, Tuple
from collections import defaultdict

def load_data() -> Dict[str, Any]:
    """Load data from JSON file"""
    with open('league_data.json', 'r') as f:
        return json.load(f)

def get_team_name(roster_id: int, data: Dict[str, Any]) -> str:
    """Get team name (username) from roster_id"""
    roster_to_user = data['roster_to_user_map']
    user_id = roster_to_user.get(str(roster_id))
    if user_id:
        user = data['user_map'].get(user_id, {})
        return user.get('display_name', user.get('username', f'Team {roster_id}'))
    return f'Team {roster_id}'

def create_raw_scores(data: Dict[str, Any]) -> pd.DataFrame:
    """Create raw scores DataFrame similar to Excel 'Raw Scores' sheet"""
    matchups = data['matchups']
    teams = {}

    for week_num, week_matchups in matchups.items():
        week = int(week_num)
        for matchup in week_matchups:
            roster_id = matchup['roster_id']
            team_name = get_team_name(roster_id, data)
            points = matchup.get('points', 0)

            if team_name not in teams:
                teams[team_name] = {}
            teams[team_name][f'Week {week}'] = points

    df = pd.DataFrame.from_dict(teams, orient='index')
    df.reset_index(inplace=True)
    df.rename(columns={'index': 'Team'}, inplace=True)

    # Sort columns properly
    week_cols = sorted([col for col in df.columns if col.startswith('Week')],
                      key=lambda x: int(x.split()[1]))
    df = df[['Team'] + week_cols]

    return df

def create_raw_records(data: Dict[str, Any]) -> pd.DataFrame:
    """Create raw records DataFrame showing wins/losses by week"""
    matchups = data['matchups']
    teams = {}

    # First, calculate wins for each week
    for week_num, week_matchups in matchups.items():
        week = int(week_num)

        # Group by matchup_id to determine winners
        matchup_groups = defaultdict(list)
        for matchup in week_matchups:
            matchup_id = matchup.get('matchup_id')
            if matchup_id:
                matchup_groups[matchup_id].append(matchup)

        # Determine winners
        for matchup_id, teams_in_matchup in matchup_groups.items():
            if len(teams_in_matchup) == 2:
                team1, team2 = teams_in_matchup
                points1 = team1.get('points', 0)
                points2 = team2.get('points', 0)

                # Determine winner
                winner_id = team1['roster_id'] if points1 > points2 else team2['roster_id']

                for team in teams_in_matchup:
                    roster_id = team['roster_id']
                    team_name = get_team_name(roster_id, data)

                    if team_name not in teams:
                        teams[team_name] = {}

                    teams[team_name][f'Week {week}'] = 1 if roster_id == winner_id else 0

    df = pd.DataFrame.from_dict(teams, orient='index')
    df.reset_index(inplace=True)
    df.rename(columns={'index': 'Team'}, inplace=True)

    # Calculate total wins and losses
    week_cols = [col for col in df.columns if col.startswith('Week')]
    df['Wins'] = df[week_cols].sum(axis=1).astype(int)
    df['Losses'] = len(week_cols) - df['Wins']

    # Sort columns
    week_cols_sorted = sorted(week_cols, key=lambda x: int(x.split()[1]))
    df = df[['Team', 'Wins', 'Losses'] + week_cols_sorted]

    return df

def create_scores_summary(raw_scores_df: pd.DataFrame) -> pd.DataFrame:
    """Create scores summary with totals and averages"""
    df = raw_scores_df.copy()

    week_cols = [col for col in df.columns if col.startswith('Week')]

    # Calculate totals and averages
    df['Total'] = df[week_cols].sum(axis=1)
    df['Avg/Game'] = df[week_cols].mean(axis=1)
    df['Median/Game'] = df[week_cols].median(axis=1)

    # Sort by total points
    df = df.sort_values('Total', ascending=False)
    df['Standings'] = range(1, len(df) + 1)

    # Reorder columns
    cols = ['Standings', 'Team'] + week_cols + ['Total', 'Avg/Game', 'Median/Game']
    df = df[cols]

    return df

def create_standings(raw_records_df: pd.DataFrame, scores_summary_df: pd.DataFrame) -> pd.DataFrame:
    """Create standings with win/loss records"""
    # Merge wins/losses with total scores
    standings = raw_records_df[['Team', 'Wins', 'Losses']].copy()
    scores = scores_summary_df[['Team', 'Total']].copy()

    df = standings.merge(scores, on='Team')

    # Create standing value (wins + decimal portion from total points)
    max_points = df['Total'].max()
    df['Standing Value'] = df['Wins'] + (df['Total'] / max_points) * 0.999999

    # Sort by standing value
    df = df.sort_values('Standing Value', ascending=False)
    df['Standings'] = range(1, len(df) + 1)

    # Reorder columns
    df = df[['Standings', 'Team', 'Wins', 'Losses', 'Total', 'Standing Value']]

    return df

def create_all_sheets(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """Create all analysis sheets"""
    raw_scores = create_raw_scores(data)
    raw_records = create_raw_records(data)
    scores_summary = create_scores_summary(raw_scores)
    standings = create_standings(raw_records, scores_summary)

    return {
        'Raw Scores': raw_scores,
        'Raw Records': raw_records,
        'Scores': scores_summary,
        'Standings': standings
    }

def main():
    """Generate all analysis and save to Excel"""
    print("Loading data...")
    data = load_data()

    print("Analyzing data...")
    sheets = create_all_sheets(data)

    print("Saving to Excel...")
    with pd.ExcelWriter('fantasy_analysis.xlsx', engine='openpyxl') as writer:
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print("\n✓ Analysis saved to fantasy_analysis.xlsx")
    print("\nStandings:")
    print(sheets['Standings'].to_string(index=False))

if __name__ == "__main__":
    main()
