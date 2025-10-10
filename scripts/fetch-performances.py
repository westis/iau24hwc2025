#!/usr/bin/env python3
"""
CLI Tool: Fetch performance data from DUV for matched runners

Usage:
    python scripts/fetch-performances.py [--db-path data/iau24hwc.db]

This script:
1. Loads matched runners from SQLite
2. Fetches performance data from DUV API
3. Calculates PBs (all-time, last 2 years)
4. Saves performance history to database
"""

import sys
import os
import sqlite3
import argparse
import requests
import time
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import urllib3

# Suppress SSL warnings since we need to disable verification for DUV API
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DUV_API_BASE = "https://statistik.d-u-v.org/json"
RATE_LIMIT_DELAY = 1.0


def get_runner_profile(duv_id: int) -> Optional[Dict[str, Any]]:
    """Fetch runner profile from DUV JSON API"""
    url = f"{DUV_API_BASE}/mgetresultperson.php?runner={duv_id}&plain=1"

    try:
        # Disable SSL verification to avoid certificate revocation check issues
        response = requests.get(url, timeout=15, verify=False)
        response.raise_for_status()
        data = response.json()

        # Extract YOB from PersonHeader
        yob = None
        if 'PersonHeader' in data and 'YOB' in data['PersonHeader']:
            yob_str = data['PersonHeader']['YOB']
            if yob_str and yob_str != '0000' and yob_str != '&nbsp;':
                try:
                    yob = int(yob_str)
                except ValueError:
                    pass  # Skip invalid YOB values

        # Extract AllPBs for efficient PB lookup
        all_pbs = data.get('AllPBs', [])

        # Extract all performances (not just 24h)
        results = []
        all_perfs = data.get('AllPerfs', [])

        for year_data in all_perfs:
            perfs_per_year = year_data.get('PerfsPerYear', [])
            for perf in perfs_per_year:
                evt_dist = perf.get('EvtDist', '')
                perf_text = perf.get('Perf', '')

                # Skip if no distance/performance data
                if not evt_dist or not perf_text:
                    continue

                # Parse distance/result value
                # For time-based events (24h, 6h, etc.): distance in km
                # For distance-based events: could be time, laps, etc.
                distance = None

                # Try to extract numeric value (distance in km, or time, or laps)
                dist_match = re.search(r'([\d.,]+)', perf_text.replace(',', '.'))
                if dist_match:
                    try:
                        distance = float(dist_match.group(1).replace(',', '.'))
                    except ValueError:
                        continue

                if distance is None:
                    continue

                # Parse event date (format: "26.-27.04.2025" or "27.04.2025")
                evt_date = perf.get('EvtDate', '')
                event_date = None
                # Try two-day format first: "26.-27.04.2025" (day1.-day2.month.year)
                date_match = re.search(r'(\d{1,2})\.[-\s]*(\d{1,2})\.(\d{1,2})\.(\d{4})', evt_date)
                if date_match:
                    # Format: day1.-day2.month.year -> use day2 as the end date
                    day = date_match.group(2).zfill(2)
                    month = date_match.group(3).zfill(2)
                    year = date_match.group(4)
                    event_date = f"{year}-{month}-{day}"
                else:
                    # Try single date format: "27.04.2025" (day.month.year)
                    date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', evt_date)
                    if date_match:
                        day = date_match.group(1).zfill(2)
                        month = date_match.group(2).zfill(2)
                        year = date_match.group(3)
                        event_date = f"{year}-{month}-{day}"

                # Clean up event type
                event_type = evt_dist.strip()

                results.append({
                    'Event': perf.get('EvtName', ''),
                    'Startdate': event_date or evt_date,
                    'Performance': perf_text,
                    'Distance': distance,
                    'Length': event_type,  # Store actual event type
                    'EventID': perf.get('EvtID'),
                    'Rank': perf.get('RankOverall')
                })

        return {
            'YOB': yob,
            'results': results,
            'all_pbs': all_pbs
        }

    except Exception as e:
        print(f"  ERROR fetching profile: {e}", file=sys.stderr)
        return None


def parse_distance(performance: str) -> Optional[float]:
    """Parse distance from performance string (e.g., '245.123 km' -> 245.123)"""
    try:
        # Remove all non-numeric except decimal point
        cleaned = ''.join(c for c in performance if c.isdigit() or c == '.')
        return float(cleaned) if cleaned else None
    except:
        return None


def fetch_performances(db_path: str):
    """Main performance fetching logic"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get matched runners
    cursor.execute("""
        SELECT * FROM runners
        WHERE match_status IN ('auto-matched', 'manually-matched')
        AND duv_id IS NOT NULL
        ORDER BY entry_id
    """)

    runners = [dict(row) for row in cursor.fetchall()]

    if not runners:
        print("No matched runners found.", file=sys.stderr)
        print("Run match-runners.py first.", file=sys.stderr)
        return

    print(f"\nFetching performance data for {len(runners)} runners...\n", file=sys.stderr)

    # Race date: 2025-10-17, so 3 years before = 2022-10-18
    race_date = datetime(2025, 10, 17)
    three_years_ago = race_date - timedelta(days=1095)  # 2022-10-18
    current_year = datetime.now().year

    for i, runner in enumerate(runners, 1):
        print(f"[{i}/{len(runners)}] {runner['firstname']} {runner['lastname']} (DUV ID: {runner['duv_id']})", file=sys.stderr)

        # Fetch profile
        profile = get_runner_profile(runner['duv_id'])
        time.sleep(RATE_LIMIT_DELAY)

        if not profile:
            print(f"  Failed to fetch profile", file=sys.stderr)
            continue

        # Extract all race results
        results = profile.get('results', [])

        if not results:
            print(f"  → No race results", file=sys.stderr)
            continue

        print(f"  → Found {len(results)} race results", file=sys.stderr)

        # Extract PBs from AllPBs array (more reliable than manual calculation)
        pb_all_time = None
        pb_last_2_years = None
        all_pbs = profile.get('all_pbs', [])

        if all_pbs:
            # Find 24h PBs entry
            pb_24h = None
            for pb_entry in all_pbs:
                if '24h' in pb_entry or '24 h' in pb_entry:
                    pb_24h = pb_entry.get('24h') or pb_entry.get('24 h')
                    break

            if pb_24h and isinstance(pb_24h, dict):
                # Extract overall PB
                if 'PB' in pb_24h:
                    try:
                        pb_all_time = float(pb_24h['PB'])
                    except (ValueError, TypeError):
                        pass

                # Extract Last 3 Years PB (since Oct 2022)
                year_keys = [k for k in pb_24h.keys() if k != 'PB' and k.isdigit()]
                for year in year_keys:
                    year_int = int(year)
                    if year_int >= three_years_ago.year:
                        year_data = pb_24h[year]
                        if isinstance(year_data, dict) and 'Perf' in year_data:
                            try:
                                perf_value = float(year_data['Perf'])
                                if pb_last_2_years is None or perf_value > pb_last_2_years:
                                    pb_last_2_years = perf_value
                            except (ValueError, TypeError):
                                pass

        # Clear existing performances
        cursor.execute("DELETE FROM performances WHERE runner_id = ?", (runner['id'],))

        for result in results:
            # Use Distance field directly from our parser
            distance = result.get('Distance')
            if not distance:
                distance = parse_distance(result.get('Performance', ''))
            if not distance:
                continue

            # Get event type from Length field
            event_type = result.get('Length', 'Unknown')

            # Save performance
            cursor.execute("""
                INSERT INTO performances (
                    runner_id, event_id, event_name, event_date,
                    distance, rank, event_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                runner['id'],
                result.get('EventID'),
                result.get('Event', ''),
                result.get('Startdate', ''),
                distance,
                result.get('Rank'),
                event_type
            ))

        # Calculate age
        yob = profile.get('YOB')
        age = current_year - yob if yob else None
        dob = f"{yob}-01-01" if yob else None

        # Update runner with PBs (only 24h PBs are calculated)
        cursor.execute("""
            UPDATE runners
            SET personal_best_all_time = ?,
                personal_best_last_2_years = ?,
                date_of_birth = ?,
                age = ?
            WHERE id = ?
        """, (pb_all_time, pb_last_2_years, dob, age, runner['id']))

        if pb_all_time:
            pb_3y_str = f"{pb_last_2_years:.2f}" if pb_last_2_years else "N/A"
            print(f"  24h PB All-Time: {pb_all_time:.2f} km, Last 3Y: {pb_3y_str} km", file=sys.stderr)
        else:
            print(f"  No 24h races found (stored {len(results)} other race results)", file=sys.stderr)

    conn.commit()
    conn.close()

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"PERFORMANCE DATA FETCHED SUCCESSFULLY", file=sys.stderr)
    print(f"  Total runners processed: {len(runners)}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Fetch DUV performance data for matched runners')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')

    args = parser.parse_args()

    db_path = args.db_path
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    fetch_performances(db_path)


if __name__ == '__main__':
    main()
