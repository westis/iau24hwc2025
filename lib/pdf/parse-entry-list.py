#!/usr/bin/env python3
"""
IAU 24h World Championships Entry List PDF Parser

Parses entry list PDFs using Dockling to extract runner information.
Outputs JSON array matching the Runner type structure.

Usage:
    python parse-entry-list.py <path-to-pdf>

Output:
    JSON array of runners with: entryId, firstname, lastname, nationality, gender
"""

import sys
import json
import re
from typing import List, Dict, Optional
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import Table
except ImportError:
    print("Error: docling library not found. Install with: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


def normalize_name(name: str) -> str:
    """Normalize name by stripping whitespace and titlecasing"""
    return name.strip().title() if name else ""


def normalize_gender(gender: str) -> Optional[str]:
    """Normalize gender to 'M' or 'W'"""
    gender = gender.strip().upper()
    if gender in ['M', 'MALE', 'MEN', 'MAN']:
        return 'M'
    elif gender in ['W', 'F', 'FEMALE', 'WOMEN', 'WOMAN']:
        return 'W'
    return None


def normalize_nationality(nationality: str) -> str:
    """
    Normalize nationality to ISO 3166-1 alpha-3 code.
    Handles common variations and formats.
    """
    nationality = nationality.strip().upper()

    # Already ISO 3166-1 alpha-3 (3 letters)
    if len(nationality) == 3 and nationality.isalpha():
        return nationality

    # Common country code mappings (extend as needed)
    country_map = {
        'US': 'USA',
        'UK': 'GBR',
        'GB': 'GBR',
        'DE': 'DEU',
        'FR': 'FRA',
        'IT': 'ITA',
        'ES': 'ESP',
        'NL': 'NLD',
        'BE': 'BEL',
        'CH': 'CHE',
        'AT': 'AUT',
        'PL': 'POL',
        'CZ': 'CZE',
        'JP': 'JPN',
        'CN': 'CHN',
        'KR': 'KOR',
        'AU': 'AUS',
        'NZ': 'NZL',
        'CA': 'CAN',
        'BR': 'BRA',
        'MX': 'MEX',
        'AR': 'ARG',
        'ZA': 'ZAF',
        'RU': 'RUS',
        'IN': 'IND',
    }

    if nationality in country_map:
        return country_map[nationality]

    return nationality


def extract_from_table(table: Table) -> List[Dict]:
    """
    Extract runner data from a Dockling Table object.
    Handles various table formats and layouts.
    """
    runners = []

    # Convert table to data structure
    # Table structure varies, but typically has headers and rows
    table_data = table.export_to_dataframe()

    for idx, row in table_data.iterrows():
        try:
            # Try to find relevant columns (flexible column matching)
            entry_id = None
            firstname = None
            lastname = None
            nationality = None
            gender = None

            # Search through columns for data
            for col_name, value in row.items():
                col_lower = str(col_name).lower()
                val_str = str(value).strip()

                if not val_str or val_str in ['nan', 'None', '']:
                    continue

                # Entry ID (number, bib, start number, etc.)
                if entry_id is None and any(x in col_lower for x in ['id', 'number', 'nr', 'bib', 'entry', '#']):
                    entry_id = val_str

                # First name
                if firstname is None and any(x in col_lower for x in ['first', 'given', 'vorname', 'prénom']):
                    firstname = normalize_name(val_str)

                # Last name
                if lastname is None and any(x in col_lower for x in ['last', 'family', 'surname', 'nachname', 'nom']):
                    lastname = normalize_name(val_str)

                # Nationality
                if nationality is None and any(x in col_lower for x in ['nat', 'country', 'nation', 'land', 'pays']):
                    nationality = normalize_nationality(val_str)

                # Gender/Sex
                if gender is None and any(x in col_lower for x in ['gender', 'sex', 'geschlecht', 'sexe', 'm/w', 'm/f']):
                    gender = normalize_gender(val_str)

            # Validate we have minimum required fields
            if firstname and lastname and nationality and gender:
                # Generate entry ID if missing
                if not entry_id:
                    entry_id = str(len(runners) + 1)

                runners.append({
                    'entryId': entry_id,
                    'firstname': firstname,
                    'lastname': lastname,
                    'nationality': nationality,
                    'gender': gender,
                })
        except Exception as e:
            # Skip problematic rows
            print(f"Warning: Error processing row {idx}: {e}", file=sys.stderr)
            continue

    return runners


def extract_from_text(text: str) -> List[Dict]:
    """
    Fallback: Extract runner data from plain text when table extraction fails.
    Uses regex patterns to identify structured data.
    """
    runners = []

    # Pattern for common entry list formats
    # Example: "1  John  Smith  USA  M"
    # Example: "2  Jane  Doe  GBR  W"
    pattern = r'(\d+)\s+(\w+)\s+(\w+)\s+([A-Z]{2,3})\s+([MW])'

    matches = re.finditer(pattern, text, re.MULTILINE)

    for match in matches:
        entry_id, firstname, lastname, nationality, gender = match.groups()
        runners.append({
            'entryId': entry_id.strip(),
            'firstname': normalize_name(firstname),
            'lastname': normalize_name(lastname),
            'nationality': normalize_nationality(nationality),
            'gender': gender,
        })

    return runners


def parse_entry_list(pdf_path: str) -> List[Dict]:
    """
    Parse IAU 24h entry list PDF and extract runner data.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of runner dictionaries
    """
    # Initialize Dockling converter
    converter = DocumentConverter()

    # Convert PDF
    result = converter.convert(pdf_path)

    runners = []

    # Extract from tables (preferred method)
    if hasattr(result, 'document') and hasattr(result.document, 'tables'):
        for table in result.document.tables:
            table_runners = extract_from_table(table)
            runners.extend(table_runners)

    # Fallback: Extract from text if no tables found or insufficient data
    if len(runners) == 0:
        text = result.document.export_to_markdown() if hasattr(result.document, 'export_to_markdown') else ""
        if text:
            runners = extract_from_text(text)

    # Remove duplicates (by entryId)
    seen_ids = set()
    unique_runners = []
    for runner in runners:
        if runner['entryId'] not in seen_ids:
            seen_ids.add(runner['entryId'])
            unique_runners.append(runner)

    return unique_runners


def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python parse-entry-list.py <path-to-pdf>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not Path(pdf_path).exists():
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    try:
        runners = parse_entry_list(pdf_path)

        # Output JSON to stdout
        print(json.dumps(runners, indent=2, ensure_ascii=False))

        # Log statistics to stderr
        print(f"Extracted {len(runners)} runners from {pdf_path}", file=sys.stderr)

    except Exception as e:
        print(f"Error parsing PDF: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
