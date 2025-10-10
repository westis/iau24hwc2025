#!/usr/bin/env python3
"""
Backend PDF Parser for IAU 24h World Championships Entry List

Usage:
    python scripts/parse-pdf-backend.py <pdf_file> [--db-path <path>]

This script:
1. Parses the PDF entry list using Dockling
2. Saves runners directly to SQLite database
3. Outputs summary statistics

Requirements:
    pip install docling sqlite3
"""

import sys
import os
import json
import sqlite3
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Import Dockling (install: pip install docling)
try:
    from docling.document_converter import DocumentConverter
except ImportError:
    print("ERROR: Dockling not installed. Run: pip install docling", file=sys.stderr)
    sys.exit(1)


def normalize_name(name: str) -> str:
    """Normalize name to title case and clean whitespace"""
    return name.strip().title()


def normalize_nationality(nat: str) -> str:
    """Normalize nationality to ISO 3166-1 alpha-3"""
    nat = nat.strip().upper()

    # Common mappings
    mapping = {
        'US': 'USA', 'USA': 'USA',
        'GB': 'GBR', 'UK': 'GBR', 'GBR': 'GBR',
        'DE': 'DEU', 'GER': 'DEU', 'DEU': 'DEU',
        'FR': 'FRA', 'FRA': 'FRA',
        'IT': 'ITA', 'ITA': 'ITA',
        'ES': 'ESP', 'SPA': 'ESP', 'ESP': 'ESP',
        'NL': 'NLD', 'NET': 'NLD', 'NLD': 'NLD',
        'BE': 'BEL', 'BEL': 'BEL',
        'CH': 'CHE', 'SUI': 'CHE', 'CHE': 'CHE',
        'AT': 'AUT', 'AUT': 'AUT',
        'PL': 'POL', 'POL': 'POL',
        'CZ': 'CZE', 'CZE': 'CZE',
        'JP': 'JPN', 'JPN': 'JPN',
        'CN': 'CHN', 'CHN': 'CHN',
        'AU': 'AUS', 'AUS': 'AUS',
        'NZ': 'NZL', 'NZL': 'NZL',
        'CA': 'CAN', 'CAN': 'CAN',
        'BR': 'BRA', 'BRA': 'BRA',
        'MX': 'MEX', 'MEX': 'MEX',
        'AR': 'ARG', 'ARG': 'ARG',
        'ZA': 'ZAF', 'RSA': 'ZAF', 'ZAF': 'ZAF',
        'IN': 'IND', 'IND': 'IND',
        'KR': 'KOR', 'KOR': 'KOR',
        'TW': 'TWN', 'TWN': 'TWN',
        'SG': 'SGP', 'SGP': 'SGP',
        'HK': 'HKG', 'HKG': 'HKG',
    }

    return mapping.get(nat, nat)


def normalize_gender(gender: str) -> str:
    """Normalize gender to M or W"""
    gender = gender.strip().upper()

    if gender in ['M', 'MALE', 'MEN', 'MAN']:
        return 'M'
    elif gender in ['W', 'F', 'FEMALE', 'WOMEN', 'WOMAN']:
        return 'W'

    return gender


def parse_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """Parse PDF entry list using Dockling"""
    print(f"Parsing PDF: {pdf_path}", file=sys.stderr)

    converter = DocumentConverter()
    result = converter.convert(pdf_path)

    runners = []
    entry_id_counter = 1

    # Try to extract table data
    if hasattr(result, 'pages'):
        for page in result.pages:
            if hasattr(page, 'tables'):
                for table in page.tables:
                    for row in table.rows:
                        runner_data = {}

                        for i, cell in enumerate(row.cells):
                            col_name = table.headers[i] if i < len(table.headers) else ""
                            col_lower = col_name.lower()
                            val = str(cell.value).strip()

                            if not val:
                                continue

                            # Map columns
                            if 'first' in col_lower or 'given' in col_lower or 'vorname' in col_lower:
                                runner_data['firstname'] = normalize_name(val)
                            elif 'last' in col_lower or 'surname' in col_lower or 'name' in col_lower or 'nachname' in col_lower:
                                runner_data['lastname'] = normalize_name(val)
                            elif 'nat' in col_lower or 'country' in col_lower or 'nation' in col_lower:
                                runner_data['nationality'] = normalize_nationality(val)
                            elif 'gender' in col_lower or 'sex' in col_lower or 'geschlecht' in col_lower:
                                runner_data['gender'] = normalize_gender(val)
                            elif 'id' in col_lower or 'bib' in col_lower or 'number' in col_lower:
                                runner_data['entry_id'] = str(val)

                        # Validate required fields
                        if runner_data.get('firstname') and runner_data.get('lastname'):
                            if 'entry_id' not in runner_data:
                                runner_data['entry_id'] = str(entry_id_counter)
                                entry_id_counter += 1

                            if 'gender' not in runner_data:
                                runner_data['gender'] = 'M'  # Default

                            if 'nationality' not in runner_data:
                                runner_data['nationality'] = 'UNK'

                            runners.append(runner_data)

    # Fallback: regex-based text extraction if no tables found
    if not runners:
        print("No tables found, using text extraction fallback", file=sys.stderr)
        # Implement regex fallback here if needed

    # Remove duplicates
    seen = set()
    unique_runners = []
    for runner in runners:
        key = (runner['firstname'], runner['lastname'], runner['nationality'])
        if key not in seen:
            seen.add(key)
            unique_runners.append(runner)

    return unique_runners


def save_to_database(runners: List[Dict[str, Any]], db_path: str) -> None:
    """Save parsed runners to SQLite database"""
    print(f"Saving {len(runners)} runners to database: {db_path}", file=sys.stderr)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear existing runners (fresh import)
    cursor.execute("DELETE FROM match_candidates")
    cursor.execute("DELETE FROM performances")
    cursor.execute("DELETE FROM teams")
    cursor.execute("DELETE FROM runners")

    # Insert runners
    for runner in runners:
        cursor.execute("""
            INSERT INTO runners (
                entry_id, firstname, lastname, nationality, gender,
                match_status
            ) VALUES (?, ?, ?, ?, ?, 'unmatched')
        """, (
            runner['entry_id'],
            runner['firstname'],
            runner['lastname'],
            runner['nationality'],
            runner['gender']
        ))

    conn.commit()
    conn.close()

    print(f"✓ Successfully saved {len(runners)} runners to database", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Parse IAU 24h WC entry list PDF to SQLite')
    parser.add_argument('pdf_file', help='Path to PDF entry list file')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')
    parser.add_argument('--json', action='store_true', help='Output JSON to stdout')

    args = parser.parse_args()

    if not os.path.exists(args.pdf_file):
        print(f"ERROR: PDF file not found: {args.pdf_file}", file=sys.stderr)
        sys.exit(1)

    # Parse PDF
    runners = parse_pdf(args.pdf_file)

    if not runners:
        print("ERROR: No runners found in PDF", file=sys.stderr)
        sys.exit(1)

    # Save to database
    db_path = args.db_path
    if not os.path.isabs(db_path):
        # Relative to project root
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    save_to_database(runners, db_path)

    # Output JSON if requested
    if args.json:
        print(json.dumps(runners, indent=2))

    # Print summary
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"SUMMARY:", file=sys.stderr)
    print(f"  Total runners: {len(runners)}", file=sys.stderr)
    print(f"  Men: {sum(1 for r in runners if r['gender'] == 'M')}", file=sys.stderr)
    print(f"  Women: {sum(1 for r in runners if r['gender'] == 'W')}", file=sys.stderr)
    print(f"  Countries: {len(set(r['nationality'] for r in runners))}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)


if __name__ == '__main__':
    main()
