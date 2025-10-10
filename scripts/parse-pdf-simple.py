#!/usr/bin/env python3
"""
Simple PDF Parser for IAU 24h Entry Lists

Usage:
    python scripts/parse-pdf-simple.py <pdf_file> [--db-path <path>]

Uses PyPDF2 for text extraction with regex patterns.
"""

import sys
import os
import re
import sqlite3
import argparse
from typing import List, Dict, Any

try:
    import PyPDF2
except ImportError:
    print("ERROR: PyPDF2 not installed. Run: pip install PyPDF2", file=sys.stderr)
    sys.exit(1)


NATIONALITY_MAP = {
    'US': 'USA', 'USA': 'USA',
    'GB': 'GBR', 'UK': 'GBR', 'GBR': 'GBR', 'GREAT BRITAIN': 'GBR',
    'DE': 'DEU', 'GER': 'DEU', 'DEU': 'DEU', 'GERMANY': 'DEU',
    'FR': 'FRA', 'FRA': 'FRA', 'FRANCE': 'FRA',
    'IT': 'ITA', 'ITA': 'ITA', 'ITALY': 'ITA',
    'ES': 'ESP', 'SPA': 'ESP', 'ESP': 'ESP', 'SPAIN': 'ESP',
    'NL': 'NLD', 'NET': 'NLD', 'NLD': 'NLD', 'NETHERLANDS': 'NLD',
    'BE': 'BEL', 'BEL': 'BEL', 'BELGIUM': 'BEL',
    'CH': 'CHE', 'SUI': 'CHE', 'CHE': 'CHE', 'SWITZERLAND': 'CHE',
    'AT': 'AUT', 'AUT': 'AUT', 'AUSTRIA': 'AUT',
    'PL': 'POL', 'POL': 'POL', 'POLAND': 'POL',
    'CZ': 'CZE', 'CZE': 'CZE', 'CZECH': 'CZE',
    'JP': 'JPN', 'JPN': 'JPN', 'JAPAN': 'JPN',
    'CN': 'CHN', 'CHN': 'CHN', 'CHINA': 'CHN',
    'AU': 'AUS', 'AUS': 'AUS', 'AUSTRALIA': 'AUS',
    'NZ': 'NZL', 'NZL': 'NZL', 'NEW ZEALAND': 'NZL',
    'CA': 'CAN', 'CAN': 'CAN', 'CANADA': 'CAN',
    'BR': 'BRA', 'BRA': 'BRA', 'BRAZIL': 'BRA',
    'ZA': 'ZAF', 'RSA': 'ZAF', 'ZAF': 'ZAF', 'SOUTH AFRICA': 'ZAF',
    'IRL': 'IRL', 'IRELAND': 'IRL',
    'SWE': 'SWE', 'SWEDEN': 'SWE',
    'NOR': 'NOR', 'NORWAY': 'NOR',
    'DEN': 'DNK', 'DNK': 'DNK', 'DENMARK': 'DNK',
    'FIN': 'FIN', 'FINLAND': 'FIN',
    'POR': 'PRT', 'PRT': 'PRT', 'PORTUGAL': 'PRT',
}


def parse_pdf_text(pdf_path: str) -> List[Dict[str, Any]]:
    """Extract text from PDF and parse runner entries"""
    print(f"Extracting text from PDF: {pdf_path}", file=sys.stderr)

    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"

    print(f"Extracted {len(text)} characters", file=sys.stderr)

    # Split into lines
    lines = text.split('\n')

    runners = []
    entry_id = 1

    # Try to detect format by looking for common patterns
    # Pattern 1: "FirstName LastName COUNTRY M/W"
    # Pattern 2: "LastName, FirstName (COUNTRY) M/W"
    # Pattern 3: Table format with columns

    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue

        # Skip header lines
        if any(word in line.upper() for word in ['NAME', 'COUNTRY', 'NATIONALITY', 'GENDER', 'ATHLETE']):
            continue

        # Try pattern: "FirstName LastName COUNTRY Gender"
        # Example: "John Smith USA M"
        match = re.match(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z][a-z]+)\s+([A-Z]{2,3}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([MWF])\s*$', line)
        if match:
            firstname = match.group(1).strip()
            lastname = match.group(2).strip()
            country = match.group(3).strip().upper()
            gender = match.group(4).strip()

            runners.append({
                'entry_id': str(entry_id),
                'firstname': firstname.title(),
                'lastname': lastname.title(),
                'nationality': normalize_nationality(country),
                'gender': 'W' if gender == 'F' else gender
            })
            entry_id += 1
            continue

        # Try pattern: Multiple words with country code
        # Look for 3-letter uppercase codes (likely country codes)
        country_matches = re.findall(r'\b([A-Z]{3})\b', line)
        gender_matches = re.findall(r'\b([MWF])\b', line)

        if country_matches and gender_matches:
            # Extract name parts (words that are title case or all caps)
            words = line.split()
            name_words = []
            country = country_matches[0]
            gender = gender_matches[0]

            for word in words:
                # Skip country codes, gender, numbers
                if word in country_matches or word in gender_matches:
                    continue
                if word.isdigit():
                    continue
                if len(word) > 1 and (word[0].isupper() or word.isupper()):
                    name_words.append(word)

            if len(name_words) >= 2:
                # Assume first name is first word, last name is rest
                firstname = name_words[0]
                lastname = ' '.join(name_words[1:])

                runners.append({
                    'entry_id': str(entry_id),
                    'firstname': firstname.title(),
                    'lastname': lastname.title(),
                    'nationality': normalize_nationality(country),
                    'gender': 'W' if gender == 'F' else gender
                })
                entry_id += 1

    return runners


def normalize_nationality(nat: str) -> str:
    """Normalize nationality to ISO 3166-1 alpha-3"""
    nat = nat.strip().upper()
    return NATIONALITY_MAP.get(nat, nat[:3] if len(nat) >= 3 else nat)


def save_to_database(runners: List[Dict[str, Any]], db_path: str) -> None:
    """Save parsed runners to SQLite database"""
    print(f"Saving {len(runners)} runners to database: {db_path}", file=sys.stderr)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear existing runners
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
    parser = argparse.ArgumentParser(description='Parse IAU 24h WC entry list PDF (simple text extraction)')
    parser.add_argument('pdf_file', help='Path to PDF entry list file')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')
    parser.add_argument('--preview', action='store_true', help='Preview extracted runners without saving')

    args = parser.parse_args()

    if not os.path.exists(args.pdf_file):
        print(f"ERROR: PDF file not found: {args.pdf_file}", file=sys.stderr)
        sys.exit(1)

    # Parse PDF
    runners = parse_pdf_text(args.pdf_file)

    if not runners:
        print("\nERROR: No runners found in PDF", file=sys.stderr)
        print("\nTry manually inspecting the PDF text:", file=sys.stderr)
        print(f"  python -c \"import PyPDF2; print(PyPDF2.PdfReader(open('{args.pdf_file}', 'rb')).pages[0].extract_text())\"", file=sys.stderr)
        sys.exit(1)

    # Preview mode
    if args.preview:
        print("\nPREVIEW - First 10 runners:")
        for i, runner in enumerate(runners[:10], 1):
            print(f"{i}. {runner['firstname']} {runner['lastname']} ({runner['nationality']}, {runner['gender']})")
        print(f"\nTotal: {len(runners)} runners found")
        print("\nRun without --preview to save to database")
        return

    # Save to database
    db_path = args.db_path
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    save_to_database(runners, db_path)

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
