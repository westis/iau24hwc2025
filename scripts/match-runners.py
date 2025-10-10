#!/usr/bin/env python3
"""
CLI Tool: Auto-match runners to DUV profiles

Usage:
    python scripts/match-runners.py [--db-path data/iau24hwc.db]

This script:
1. Loads unmatched runners from SQLite
2. Searches DUV API for each runner
3. Auto-matches with confidence >= 0.8
4. Saves candidates for manual review
5. Updates database with match results
"""

import sys
import os
import sqlite3
import argparse
import requests
import time
from typing import List, Dict, Any, Optional
from urllib.parse import urlencode

DUV_API_BASE = "https://statistik.d-u-v.org/json"
RATE_LIMIT_DELAY = 1.0  # 1 second between requests


def normalize_string(s: str) -> str:
    """Normalize string for comparison (lowercase, no diacritics except Nordic)"""
    import unicodedata
    s = s.lower().strip()

    # Keep Nordic characters (å, ä, ö, æ, ø) but remove other diacritics
    nordic_chars = {'å', 'ä', 'ö', 'æ', 'ø', 'đ'}
    result = []

    for char in unicodedata.normalize('NFD', s):
        if char.lower() in nordic_chars:
            result.append(char)
        elif unicodedata.category(char) != 'Mn':  # Not a combining mark
            result.append(char)

    return ''.join(result)


def normalize_for_search(s: str) -> str:
    """Normalize string for DUV API search (remove diacritics but keep Nordic åäöæø)"""
    import unicodedata
    s = s.strip()

    # Nordic characters to preserve (Scandinavian, not general European)
    nordic_preserve = {
        'å', 'Å', 'ä', 'Ä', 'ö', 'Ö',  # Swedish/Finnish
        'æ', 'Æ', 'ø', 'Ø',              # Danish/Norwegian
        'đ', 'Đ'                          # Sami
    }

    result = []
    # Decompose characters (NFD = canonical decomposition)
    for char in unicodedata.normalize('NFD', s):
        if char in nordic_preserve:
            # Keep Nordic characters as-is
            result.append(char)
        elif unicodedata.category(char) != 'Mn':
            # Not a combining mark (diacritic), keep it
            # This removes accent marks like ´ ` ˆ ¯ ˜ ¸
            result.append(char)
        # else: skip combining marks (removes the accents)

    return ''.join(result)


def normalize_nationality(nat: str) -> str:
    """Normalize nationality codes (IOC codes)"""
    nat = nat.upper().strip()
    # DUV uses IOC codes, keep them as-is
    return nat


def search_duv(lastname: str, firstname: str, gender: str, nationality: str = None) -> List[Dict[str, Any]]:
    """Search DUV API for runner with multiple strategies"""
    all_results = []
    url = f"{DUV_API_BASE}/msearchrunner.php"

    normalized_lastname = normalize_for_search(lastname)
    normalized_firstname = normalize_for_search(firstname)

    # Strategy 1: Exact search with fname, sname, and nat
    try:
        params = {
            'fname': normalized_firstname,
            'sname': normalized_lastname,
            'exact': '1'
        }
        if nationality:
            params['nat'] = nationality

        query_str = f"fname={normalized_firstname}&sname={normalized_lastname}&exact=1"
        if nationality:
            query_str += f"&nat={nationality}"
        print(f"  DEBUG: Query 1 (exact): {url}?{query_str}", file=sys.stderr)

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        hitlist = data.get('Hitlist', [])

        # Filter by gender (API doesn't have gender param)
        if gender and hitlist:
            hitlist = [r for r in hitlist if r.get('Gender') == gender]

        all_results.extend(hitlist)
    except Exception as e:
        print(f"  ERROR in exact search: {e}", file=sys.stderr)

    # Strategy 2: Fuzzy search by lastname only (if no exact match)
    if not all_results:
        try:
            params = {'sname': normalized_lastname}
            if nationality:
                params['nat'] = nationality

            query_str = f"sname={normalized_lastname}"
            if nationality:
                query_str += f"&nat={nationality}"
            print(f"  DEBUG: Query 2 (fuzzy lastname): {url}?{query_str}", file=sys.stderr)

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            hitlist = data.get('Hitlist', [])

            if gender and hitlist:
                hitlist = [r for r in hitlist if r.get('Gender') == gender]

            all_results.extend(hitlist)
        except Exception as e:
            print(f"  ERROR in fuzzy lastname search: {e}", file=sys.stderr)

    # Strategy 3: Try firstname as lastname (handles compound names or reversed order)
    if not all_results:
        try:
            params = {'sname': normalized_firstname}
            if nationality:
                params['nat'] = nationality

            query_str = f"sname={normalized_firstname}"
            if nationality:
                query_str += f"&nat={nationality}"
            print(f"  DEBUG: Query 3 (firstname as lastname): {url}?{query_str}", file=sys.stderr)

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            hitlist = data.get('Hitlist', [])

            if gender and hitlist:
                hitlist = [r for r in hitlist if r.get('Gender') == gender]

            all_results.extend(hitlist)
        except Exception as e:
            print(f"  ERROR in firstname-as-lastname search: {e}", file=sys.stderr)

    # Strategy 4: Try both names in reversed order with exact match
    if not all_results:
        try:
            params = {
                'fname': normalized_lastname,
                'sname': normalized_firstname,
                'exact': '1'
            }
            if nationality:
                params['nat'] = nationality

            query_str = f"fname={normalized_lastname}&sname={normalized_firstname}&exact=1"
            if nationality:
                query_str += f"&nat={nationality}"
            print(f"  DEBUG: Query 4 (reversed exact): {url}?{query_str}", file=sys.stderr)

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            hitlist = data.get('Hitlist', [])

            if gender and hitlist:
                hitlist = [r for r in hitlist if r.get('Gender') == gender]

            all_results.extend(hitlist)
        except Exception as e:
            print(f"  ERROR in reversed exact search: {e}", file=sys.stderr)

    # Strategy 5: For compound lastnames, try each word as lastname
    # "Brink Hansen" -> try both "Brink" and "Hansen"
    if ' ' in lastname:
        lastname_parts = lastname.split()
        for last_part in lastname_parts:
            try:
                new_sname = normalize_for_search(last_part)
                params = {'sname': new_sname}
                if nationality:
                    params['nat'] = nationality

                print(f"  DEBUG: Query 5 (trying lastname part '{last_part}'): {url}?{urlencode(params)}", file=sys.stderr)

                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                hitlist = data.get('Hitlist', [])

                if gender and hitlist:
                    hitlist = [r for r in hitlist if r.get('Gender') == gender]

                all_results.extend(hitlist)
                time.sleep(RATE_LIMIT_DELAY)
            except Exception as e:
                print(f"  ERROR searching lastname part '{last_part}': {e}", file=sys.stderr)

    # Strategy 6: For compound lastnames with exact firstname match
    # "Brian" + "Brink Hansen" -> fname=Brian&sname=Hansen&exact=1
    if ' ' in lastname:
        lastname_parts = lastname.split()
        for last_part in lastname_parts:
            try:
                new_fname = normalize_for_search(firstname)
                new_sname = normalize_for_search(last_part)

                params = {
                    'fname': new_fname,
                    'sname': new_sname,
                    'exact': '1'
                }
                if nationality:
                    params['nat'] = nationality

                print(f"  DEBUG: Query 6 (fname={firstname} + lastname part '{last_part}'): {url}?{urlencode(params)}", file=sys.stderr)

                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                hitlist = data.get('Hitlist', [])

                if gender and hitlist:
                    hitlist = [r for r in hitlist if r.get('Gender') == gender]

                all_results.extend(hitlist)
                time.sleep(RATE_LIMIT_DELAY)
            except Exception as e:
                print(f"  ERROR in fname+lastname-part search: {e}", file=sys.stderr)

    # Deduplicate by PersonID
    seen = set()
    unique_results = []
    for r in all_results:
        if r['PersonID'] not in seen:
            seen.add(r['PersonID'])
            unique_results.append(r)

    return unique_results


def fuzzy_match_score(s1: str, s2: str) -> float:
    """Simple fuzzy string matching using Levenshtein distance"""
    s1, s2 = normalize_string(s1), normalize_string(s2)

    if s1 == s2:
        return 1.0

    # Calculate Levenshtein distance
    if len(s1) < len(s2):
        s1, s2 = s2, s1

    if len(s2) == 0:
        return 0.0

    distances = range(len(s2) + 1)
    for i1, c1 in enumerate(s1):
        new_distances = [i1 + 1]
        for i2, c2 in enumerate(s2):
            if c1 == c2:
                new_distances.append(distances[i2])
            else:
                new_distances.append(1 + min((distances[i2], distances[i2 + 1], new_distances[-1])))
        distances = new_distances

    max_len = max(len(s1), len(s2))
    similarity = 1.0 - (distances[-1] / max_len)
    return similarity


def calculate_confidence(runner: Dict[str, Any], candidate: Dict[str, Any]) -> float:
    """Calculate match confidence score (0.0 - 1.0) with stricter matching"""
    score = 0.0

    runner_lastname = normalize_string(runner['lastname'])
    candidate_lastname = normalize_string(candidate['LastName'])
    runner_firstname = normalize_string(runner['firstname'])
    candidate_firstname = normalize_string(candidate['FirstName'])

    # Check both normal and reversed name order
    lastname_match = fuzzy_match_score(runner_lastname, candidate_lastname)
    firstname_match = fuzzy_match_score(runner_firstname, candidate_firstname)

    # Check reversed (in case names are swapped)
    lastname_match_rev = fuzzy_match_score(runner_lastname, candidate_firstname)
    firstname_match_rev = fuzzy_match_score(runner_firstname, candidate_lastname)

    # Use best match direction
    if (lastname_match + firstname_match) >= (lastname_match_rev + firstname_match_rev):
        # Normal order
        score += lastname_match * 0.5  # Increased weight for lastname
        score += firstname_match * 0.3
    else:
        # Reversed order
        score += lastname_match_rev * 0.5
        score += firstname_match_rev * 0.3

    # Nation match (15%)
    runner_nat = normalize_nationality(runner['nationality'])
    candidate_nat = normalize_nationality(candidate.get('Nationality', ''))
    if runner_nat == candidate_nat:
        score += 0.15

    # Gender match (5%)
    if runner['gender'] == candidate.get('Gender', ''):
        score += 0.05

    # Penalty for compound names that don't match exactly
    # "Brian Brink" should not fuzzy match "Brian Arreborg"
    if ' ' in runner_firstname or ' ' in candidate_firstname:
        if runner_firstname.lower() != candidate_firstname.lower():
            score *= 0.7  # 30% penalty for mismatched compound names

    if ' ' in runner_lastname or ' ' in candidate_lastname:
        if runner_lastname.lower() != candidate_lastname.lower():
            score *= 0.7  # 30% penalty for mismatched compound names

    return score


def interactive_select(runner: Dict[str, Any], candidates: List[Dict[str, Any]]) -> Optional[int]:
    """Interactive candidate selection"""
    print(f"\n{'='*80}", file=sys.stderr)
    print(f"Our DB:", file=sys.stderr)
    print(f"  firstname: \"{runner['firstname']}\"", file=sys.stderr)
    print(f"  lastname:  \"{runner['lastname']}\"", file=sys.stderr)
    print(f"  ({runner['nationality']}, {runner['gender']})", file=sys.stderr)
    print(f"{'='*80}", file=sys.stderr)
    print(f"\nFound {len(candidates)} DUV candidates:\n", file=sys.stderr)

    for i, c in enumerate(candidates, 1):
        print(f"{i:2d}. {c['FirstName']:20s} {c['LastName']:20s} {c.get('Nationality', 'N/A'):3s} {c.get('Gender', '?')}  "
              f"YOB:{c.get('YOB', 'N/A'):4s}  Conf:{c['confidence']:.2f}", file=sys.stderr)

    print(f"\n 0. Skip (no match)", file=sys.stderr)
    print(f" e. Edit our DB names before matching", file=sys.stderr)
    print(f" q. Quit interactive mode\n", file=sys.stderr)

    while True:
        try:
            choice = input("Select [0-{}, e, q]: ".format(len(candidates))).strip()

            if choice.lower() == 'q':
                return None

            if choice.lower() == 'e':
                return -1  # Signal to edit names

            choice_num = int(choice)

            if choice_num == 0:
                return 0  # Skip

            if 1 <= choice_num <= len(candidates):
                return choice_num - 1  # Return index

            print(f"Invalid choice. Enter 0-{len(candidates)}, e, or q.", file=sys.stderr)
        except ValueError:
            print(f"Invalid input. Enter a number 0-{len(candidates)}, e, or q.", file=sys.stderr)
        except (EOFError, KeyboardInterrupt):
            print("\nQuitting interactive mode.", file=sys.stderr)
            return None


def match_runners(db_path: str, auto_match_threshold: float = 0.95, interactive: bool = False):
    """Main matching logic"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get unmatched runners
    cursor.execute("""
        SELECT * FROM runners
        WHERE match_status = 'unmatched'
        ORDER BY entry_id
    """)

    runners = [dict(row) for row in cursor.fetchall()]

    if not runners:
        print("No unmatched runners found.", file=sys.stderr)
        return

    print(f"\nMatching {len(runners)} runners...\n", file=sys.stderr)

    matched_count = 0
    no_match_count = 0
    manual_review_count = 0

    for i, runner in enumerate(runners, 1):
        print(f"[{i}/{len(runners)}] firstname=\"{runner['firstname']}\" lastname=\"{runner['lastname']}\" ({runner['nationality']}, {runner['gender']})", file=sys.stderr)

        # Search DUV with nationality filtering
        candidates = search_duv(
            runner['lastname'],
            runner['firstname'],
            runner['gender'],
            runner['nationality']
        )

        time.sleep(RATE_LIMIT_DELAY)

        if not candidates:
            print(f"  → No candidates found", file=sys.stderr)
            cursor.execute("""
                UPDATE runners
                SET match_status = 'no-match'
                WHERE id = ?
            """, (runner['id'],))
            no_match_count += 1
            continue

        # Calculate confidence for each candidate
        scored_candidates = []
        for candidate in candidates:
            confidence = calculate_confidence(runner, candidate)
            scored_candidates.append({
                **candidate,
                'confidence': confidence
            })

        # Sort by confidence
        scored_candidates.sort(key=lambda x: x['confidence'], reverse=True)
        best = scored_candidates[0]

        print(f"  → Found {len(candidates)} candidates, best confidence: {best['confidence']:.2f}", file=sys.stderr)

        # Save all candidates for manual review
        cursor.execute("DELETE FROM match_candidates WHERE runner_id = ?", (runner['id'],))

        for candidate in scored_candidates[:10]:  # Top 10 only
            # Convert YOB to integer, handle "0" or empty values
            yob = candidate.get('YOB')
            if yob:
                try:
                    yob = int(yob) if int(yob) > 0 else None
                except (ValueError, TypeError):
                    yob = None
            else:
                yob = None

            cursor.execute("""
                INSERT INTO match_candidates (
                    runner_id, duv_person_id, lastname, firstname,
                    year_of_birth, nation, sex, personal_best, confidence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                runner['id'],
                candidate['PersonID'],
                candidate['LastName'],
                candidate['FirstName'],
                yob,
                candidate.get('Nationality'),
                candidate.get('Gender'),
                candidate.get('PersonalBest'),
                candidate['confidence']
            ))

        # Auto-match if confidence >= threshold
        if best['confidence'] >= auto_match_threshold:
            cursor.execute("""
                UPDATE runners
                SET duv_id = ?,
                    match_status = 'auto-matched',
                    match_confidence = ?
                WHERE id = ?
            """, (best['PersonID'], best['confidence'], runner['id']))

            print(f"  ✓ AUTO-MATCHED to DUV ID {best['PersonID']} ({best['FirstName']} {best['LastName']})", file=sys.stderr)
            matched_count += 1
        elif interactive and len(scored_candidates) > 0:
            # Interactive selection
            selected_idx = interactive_select(runner, scored_candidates[:10])

            if selected_idx is None:
                # User quit interactive mode
                print(f"\n  ⚠ Exiting interactive mode. Remaining runners marked for manual review.", file=sys.stderr)
                conn.commit()
                conn.close()
                return
            elif selected_idx == -1:
                # User wants to edit names
                print(f"\nCurrent names:", file=sys.stderr)
                print(f"  firstname: \"{runner['firstname']}\"", file=sys.stderr)
                print(f"  lastname:  \"{runner['lastname']}\"", file=sys.stderr)

                new_first = input(f"New firstname (or press Enter to keep): ").strip()
                new_last = input(f"New lastname (or press Enter to keep): ").strip()

                if new_first or new_last:
                    cursor.execute("""
                        UPDATE runners
                        SET firstname = ?,
                            lastname = ?
                        WHERE id = ?
                    """, (
                        new_first if new_first else runner['firstname'],
                        new_last if new_last else runner['lastname'],
                        runner['id']
                    ))
                    conn.commit()
                    print(f"  ✓ Updated names. Re-searching...", file=sys.stderr)

                    # Re-fetch runner with updated names
                    cursor.execute("SELECT * FROM runners WHERE id = ?", (runner['id'],))
                    runner = dict(cursor.fetchone())

                    # Re-search with new names
                    candidates = search_duv(
                        runner['lastname'],
                        runner['firstname'],
                        runner['gender'],
                        runner['nationality']
                    )
                    time.sleep(RATE_LIMIT_DELAY)

                    if candidates:
                        scored_candidates = []
                        for candidate in candidates:
                            confidence = calculate_confidence(runner, candidate)
                            scored_candidates.append({**candidate, 'confidence': confidence})
                        scored_candidates.sort(key=lambda x: x['confidence'], reverse=True)

                        # Show updated results and ask again
                        selected_idx = interactive_select(runner, scored_candidates[:10])
                        if selected_idx is None or selected_idx == -1:
                            manual_review_count += 1
                            continue
                        elif selected_idx == 0:
                            cursor.execute("UPDATE runners SET match_status = 'no-match' WHERE id = ?", (runner['id'],))
                            no_match_count += 1
                            continue
                    else:
                        print(f"  → No candidates found after edit", file=sys.stderr)
                        manual_review_count += 1
                        continue
                else:
                    print(f"  → No changes made", file=sys.stderr)
                    manual_review_count += 1
                    continue

            if selected_idx == 0:
                # User chose to skip
                cursor.execute("""
                    UPDATE runners
                    SET match_status = 'no-match'
                    WHERE id = ?
                """, (runner['id'],))
                print(f"  → Skipped (no match)", file=sys.stderr)
                no_match_count += 1
            elif selected_idx >= 0:
                # User selected a candidate
                selected = scored_candidates[selected_idx]
                cursor.execute("""
                    UPDATE runners
                    SET duv_id = ?,
                        match_status = 'manually-matched',
                        match_confidence = ?
                    WHERE id = ?
                """, (selected['PersonID'], selected['confidence'], runner['id']))
                print(f"  ✓ MANUALLY MATCHED to DUV ID {selected['PersonID']} ({selected['FirstName']} {selected['LastName']})", file=sys.stderr)
                matched_count += 1
        else:
            print(f"  ⚠ Manual review needed (best: {best['confidence']:.2f})", file=sys.stderr)
            manual_review_count += 1

    conn.commit()
    conn.close()

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"MATCHING SUMMARY:", file=sys.stderr)
    print(f"  Auto-matched: {matched_count}", file=sys.stderr)
    print(f"  Manual review: {manual_review_count}", file=sys.stderr)
    print(f"  No match: {no_match_count}", file=sys.stderr)
    print(f"  Total: {len(runners)}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Auto-match runners to DUV profiles')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')
    parser.add_argument('--threshold', type=float, default=0.95, help='Auto-match confidence threshold (0.0-1.0, default 0.95 for safety)')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode for manual selection')

    args = parser.parse_args()

    db_path = args.db_path
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found: {db_path}", file=sys.stderr)
        print(f"Run parse-pdf-backend.py first to create the database.", file=sys.stderr)
        sys.exit(1)

    match_runners(db_path, args.threshold, args.interactive)


if __name__ == '__main__':
    main()
