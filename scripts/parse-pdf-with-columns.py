#!/usr/bin/env python3
"""
PDF Parser with Column Detection

This parser uses pdfplumber to detect column positions in the PDF
and correctly extract surname/firstname from their respective columns.
"""

import sys
import os
import argparse
import sqlite3
from typing import List, Dict, Any

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed", file=sys.stderr)
    print("Install with: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)


def parse_pdf_with_columns(pdf_path: str) -> List[Dict[str, Any]]:
    """Parse PDF using pdfplumber for better column detection"""
    runners = []
    entry_id = 1
    current_country = None
    current_gender = None

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Extract text with layout preservation
            text = page.extract_text(layout=True)
            if not text:
                continue

            lines = text.split('\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Skip headers
                if any(skip in line for skip in ['Entry List', 'IAU 24H', '2025', 'October', 'Albi', 'France', 'Surname', 'First name']):
                    continue

                # Detect country/gender headers
                import re
                header = re.match(r'^([A-Z]{3})\s+(MEN|WOMEN)', line)
                if header:
                    current_country = header.group(1)
                    current_gender = 'M' if header.group(2) == 'MEN' else 'W'
                    print(f"Found section: {current_country} {header.group(2)}", file=sys.stderr)
                    continue

                # Parse runner entries
                if current_country and current_gender:
                    # Try to extract number at start
                    entry_match = re.match(r'^(\d+)\s+(.+)$', line)
                    if entry_match:
                        entry_num = entry_match.group(1)
                        rest = entry_match.group(2)

                        # Use layout-based approach:
                        # pdfplumber preserves spacing, so we can detect columns by large gaps
                        # Split on multiple spaces (column separator)
                        parts = re.split(r'\s{2,}', rest)  # 2+ spaces = column boundary

                        if len(parts) >= 2:
                            # First part = surname column, second part = firstname column
                            lastname = parts[0].strip().title()
                            firstname = parts[1].strip().title()
                        else:
                            # Fallback: single column, assume last word is firstname
                            words = rest.split()
                            if len(words) >= 2:
                                lastname = ' '.join(words[:-1]).title()
                                firstname = words[-1].title()
                            else:
                                continue

                        if len(lastname) >= 2 and len(firstname) >= 2:
                            runners.append({
                                'entry_id': str(entry_id),
                                'firstname': firstname,
                                'lastname': lastname,
                                'nationality': current_country,
                                'gender': current_gender
                            })
                            entry_id += 1

    return runners


def save_to_database(runners: List[Dict[str, Any]], db_path: str):
    """Save runners to database"""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear existing data
    cursor.execute("DELETE FROM match_candidates")
    cursor.execute("DELETE FROM performances")
    cursor.execute("DELETE FROM teams")
    cursor.execute("DELETE FROM runners")

    # Insert runners
    for runner in runners:
        cursor.execute("""
            INSERT INTO runners (entry_id, firstname, lastname, nationality, gender, match_status)
            VALUES (?, ?, ?, ?, ?, 'unmatched')
        """, (runner['entry_id'], runner['firstname'], runner['lastname'], runner['nationality'], runner['gender']))

    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description='Parse PDF with column detection')
    parser.add_argument('pdf_file', help='Path to PDF file')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to database')
    parser.add_argument('--preview', action='store_true', help='Preview first 30 entries')

    args = parser.parse_args()

    if not os.path.exists(args.pdf_file):
        print(f"ERROR: PDF file not found: {args.pdf_file}", file=sys.stderr)
        sys.exit(1)

    print(f"Parsing {args.pdf_file} with pdfplumber...", file=sys.stderr)
    runners = parse_pdf_with_columns(args.pdf_file)

    if args.preview:
        print(f"\nPreview of first 30 runners:\n")
        for i, r in enumerate(runners[:30], 1):
            print(f"{i:3d}. firstname=\"{r['firstname']:20s}\" lastname=\"{r['lastname']:20s}\" {r['nationality']:3s} {r['gender']}")
        print(f"\nTotal: {len(runners)} runners")
        return

    # Save to database
    db_path = args.db_path if os.path.isabs(args.db_path) else os.path.join(os.path.dirname(os.path.dirname(__file__)), args.db_path)
    save_to_database(runners, db_path)

    men = sum(1 for r in runners if r['gender'] == 'M')
    women = sum(1 for r in runners if r['gender'] == 'W')
    print(f"Saved {len(runners)} runners ({men} men, {women} women) to database")


if __name__ == '__main__':
    main()
