#!/usr/bin/env python3
import sys, os, re, sqlite3, argparse
from typing import List, Dict, Any

try:
    from docling.document_converter import DocumentConverter
except ImportError:
    print("ERROR: Docling not installed", file=sys.stderr)
    print("Install with: pip install docling", file=sys.stderr)
    sys.exit(1)

def parse_pdf_iau_format(pdf_path: str) -> List[Dict[str, Any]]:
    """Parse PDF using Docling for table extraction"""
    print("Converting PDF with Docling...", file=sys.stderr)

    converter = DocumentConverter()
    result = converter.convert(pdf_path)

    runners = []
    entry_id = 1

    # Get all text to find country/gender headers
    full_text = result.document.export_to_markdown()

    # Extract country/gender for each table by finding headers in the markdown text
    # Build a mapping of text position to country/gender
    lines = full_text.split('\n')
    country_gender_headers = []  # List of (line_index, country, gender)

    for i, line in enumerate(lines):
        line_clean = line.strip()
        # Match "XXX MEN" or "XXX WOMEN" anywhere in the line (more lenient)
        # Also match variations like "XXX Men", "XXX Women", etc.
        match = re.search(r'\b([A-Z]{3})\s+(MEN|WOMEN|Men|Women)\b', line_clean)
        if match:
            country = match.group(1)
            gender_str = match.group(2).upper()
            gender = 'M' if gender_str == 'MEN' else 'W'
            # Avoid duplicates of same country/gender in consecutive lines
            if not country_gender_headers or country_gender_headers[-1][1:] != (country, gender):
                country_gender_headers.append((i, country, gender))

    print(f"\nFound {len(country_gender_headers)} country/gender headers in markdown", file=sys.stderr)
    print(f"First 15 headers:", file=sys.stderr)
    for i, (line_idx, c, g) in enumerate(country_gender_headers[:15]):
        gender_str = 'MEN' if g == 'M' else 'WOMEN'
        print(f"  {i}: Line {line_idx}: {c} {gender_str}", file=sys.stderr)
    print(file=sys.stderr)

    # First try table extraction
    tables_found = False
    country_gender_idx = 0

    for table in result.document.tables:
        tables_found = True

        # Convert table to grid (list of lists)
        try:
            table_grid = table.export_to_dataframe().values.tolist()
        except:
            # Fallback: iterate table cells directly
            print(f"Could not convert table to dataframe, skipping", file=sys.stderr)
            continue

        # Skip tables that are too small to be runner lists
        if len(table_grid) < 1:
            continue

        # Assign country/gender based on header list
        if country_gender_idx < len(country_gender_headers):
            _, current_country, current_gender = country_gender_headers[country_gender_idx]
            gender_str = 'MEN' if current_gender == 'M' else 'WOMEN'
            print(f"Table {country_gender_idx}: {current_country} {gender_str} - {len(table_grid)} rows", file=sys.stderr)
            country_gender_idx += 1
        else:
            # No more country/gender headers, skip remaining tables
            print(f"Skipping extra table (no header available) - {len(table_grid)} rows", file=sys.stderr)
            continue

        # Debug: Print first few rows to understand structure
        if country_gender_idx <= 2 or (current_country == 'DEN' and current_gender == 'W'):
            print(f"\n  DEBUG: ALL rows of table:", file=sys.stderr)
            for i, row in enumerate(table_grid):
                print(f"    Row {i}: {len(row)} columns -> {row}", file=sys.stderr)
            print(file=sys.stderr)

        # Process table rows - handle both 3-column and 4-column formats
        # Format 1: [Number, Surname, Firstname] (most common)
        # Format 2: [Number, Surname_Part1, Surname_Part2, Firstname] (compound surnames)
        # Format 3: [Number, Surname, Firstname_Part1, Firstname_Part2] (compound firstnames)
        for row_idx, row in enumerate(table_grid):
            if not row:
                continue

            try:
                # Handle different column counts
                if len(row) == 3:
                    # Standard 3-column: [Number, Surname, Firstname]
                    num = str(row[0]).strip() if row[0] and str(row[0]) != 'nan' else ""
                    lastname = str(row[1]).strip().title() if row[1] and str(row[1]) != 'nan' else ""
                    firstname = str(row[2]).strip().title() if row[2] and str(row[2]) != 'nan' else ""
                elif len(row) == 4:
                    # 4-column format - need to determine which is compound
                    # Check if row[1] and row[2] together look like a surname, or if row[2] and row[3] are firstname
                    num = str(row[0]).strip() if row[0] and str(row[0]) != 'nan' else ""

                    # Try both interpretations:
                    # Option A: [Number, Surname, Firstname_Part1, Firstname_Part2]
                    # Option B: [Number, Surname_Part1, Surname_Part2, Firstname]

                    # Heuristic: if row[1] is capitalized and row[2] is also capitalized, likely compound surname
                    # Otherwise, row[2]+row[3] is compound firstname
                    val1 = str(row[1]).strip() if row[1] and str(row[1]) != 'nan' else ""
                    val2 = str(row[2]).strip() if row[2] and str(row[2]) != 'nan' else ""
                    val3 = str(row[3]).strip() if row[3] and str(row[3]) != 'nan' else ""

                    # For now, assume: [Number, Surname, Firstname1, Firstname2]
                    # This matches "Eriksen | Bouchra | Lundgren" pattern
                    lastname = val1.title()
                    firstname = f"{val2} {val3}".strip().title()
                elif len(row) > 4:
                    # More than 4 columns - concatenate middle columns as surname
                    num = str(row[0]).strip() if row[0] and str(row[0]) != 'nan' else ""
                    lastname = ' '.join(str(row[i]).strip() for i in range(1, len(row)-1) if row[i] and str(row[i]) != 'nan').title()
                    firstname = str(row[-1]).strip().title() if row[-1] and str(row[-1]) != 'nan' else ""
                else:
                    # Less than 3 columns, skip
                    continue

                # Skip if not a valid entry (number must be digit or 'R' for reserve)
                if not (num.isdigit() or num == 'R'):
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
                    if len(runners) <= 10:
                        print(f"  -> {entry_id-1}. {firstname} {lastname} ({current_country}, {current_gender})", file=sys.stderr)
            except (ValueError, IndexError, AttributeError) as e:
                continue

    # Fallback to text extraction if no tables found
    if not tables_found or len(runners) < 50:
        print("Table extraction failed or insufficient data, using text fallback...", file=sys.stderr)
        runners = parse_from_text_fallback(result.document.export_to_markdown())

    return runners


def parse_from_text_fallback(markdown_text: str) -> List[Dict[str, Any]]:
    """Fallback parser using markdown/text extraction"""
    lines = [line.strip() for line in markdown_text.split('\n') if line.strip()]
    runners = []
    current_country = current_gender = None
    entry_id = 1

    skip = ['Entry List', 'IAU 24H', '2025', 'October', 'Albi', 'France', 'Surname', 'First name']
    
    for line in lines:
        if any(p in line for p in skip):
            continue
        
        header = re.match(r'^([A-Z]{3})\s+(MEN|WOMEN)', line)
        if header:
            current_country = header.group(1)
            current_gender = 'M' if header.group(2) == 'MEN' else 'W'
            continue
        
        if current_country and current_gender:
            runner = re.match(r'^(\d+)\s+(.+)$', line)
            if runner:
                name_part = runner.group(2).strip()
                words = name_part.split()
                
                if len(words) >= 2:
                    # PDF format: "NUMBER SURNAME(S) FIRSTNAME(S)"
                    # The PDF has 2 columns but PyPDF2 extracts as one line

                    # Handle multi-word surnames with prepositions (like "De Las Heras Maria")
                    if len(words) >= 3 and words[1].lower() in ['de', 'van', 'von', 'del', 'da', 'di', 'las', 'dos', 'la']:
                        # "De Las Heras Maria" -> lastname="De Las Heras", firstname="Maria"
                        # Find where preposition ends
                        prep_end = 2
                        if len(words) >= 4 and words[2].lower() in ['las', 'los', 'heras']:
                            prep_end = 3
                        lastname = ' '.join(words[:prep_end]).title()
                        firstname = ' '.join(words[prep_end:]).title()

                    elif len(words) == 2:
                        # "Ehm Moritz" -> lastname="Ehm", firstname="Moritz"
                        lastname = words[0].title()
                        firstname = words[1].title()

                    elif len(words) == 4:
                        # Spanish/Portuguese pattern: "Perez Serrano Carmen Maria"
                        # Heuristic: If all 4 words are similar length and capitalized,
                        # assume first 2 are lastnames, last 2 are firstnames
                        # Otherwise: first word is lastname, rest is firstname
                        if all(w[0].isupper() or w[0].isdigit() for w in words):
                            # Could be Spanish: try 2+2 split
                            lastname = ' '.join(words[:2]).title()
                            firstname = ' '.join(words[2:]).title()
                        else:
                            # Default: last word is firstname
                            lastname = ' '.join(words[:-1]).title()
                            firstname = words[-1].title()

                    elif len(words) >= 5:
                        # For 5+ words, assume 2-3 could be lastnames
                        # "Garcia Lopez Maria Carmen Rosa" -> try last 2-3 as firstnames
                        # Simple heuristic: split at midpoint, favoring more lastnames
                        mid = len(words) // 2
                        lastname = ' '.join(words[:mid]).title()
                        firstname = ' '.join(words[mid:]).title()

                    elif len(words) == 3:
                        # For 3 words: last word is typically firstname, rest is surname
                        # "Krog Ingerslev Emil" -> lastname="Krog Ingerslev", firstname="Emil"
                        # Check if last word looks like a firstname (not an initial)
                        if len(words[-1]) >= 3:
                            lastname = ' '.join(words[:-1]).title()
                            firstname = words[-1].title()
                        else:
                            # Last word too short, assume first word is lastname
                            lastname = words[0].title()
                            firstname = ' '.join(words[1:]).title()

                    else:
                        lastname = words[0].title()
                        firstname = ' '.join(words[1:]).title() if len(words) > 1 else ""
                    
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
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM match_candidates")
    cursor.execute("DELETE FROM performances")
    cursor.execute("DELETE FROM teams")
    cursor.execute("DELETE FROM runners")
    
    for runner in runners:
        cursor.execute("""
            INSERT INTO runners (entry_id, firstname, lastname, nationality, gender, match_status)
            VALUES (?, ?, ?, ?, ?, 'unmatched')
        """, (runner['entry_id'], runner['firstname'], runner['lastname'], runner['nationality'], runner['gender']))
    
    conn.commit()
    conn.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf_file')
    parser.add_argument('--db-path', default='data/iau24hwc.db')
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    
    runners = parse_pdf_iau_format(args.pdf_file)
    
    if args.preview:
        for i, r in enumerate(runners[:30], 1):
            try:
                print(f"{i:3d}. {r['firstname']:20s} {r['lastname']:20s} {r['nationality']:3s} {r['gender']}")
            except:
                print(f"{i:3d}. {r['firstname']} {r['lastname']} {r['nationality']} {r['gender']}")
        print(f"\nTotal: {len(runners)} runners")
        return
    
    db_path = args.db_path if os.path.isabs(args.db_path) else os.path.join(os.path.dirname(os.path.dirname(__file__)), args.db_path)
    save_to_database(runners, db_path)
    
    men = sum(1 for r in runners if r['gender']=='M')
    women = sum(1 for r in runners if r['gender']=='W')
    print(f"Saved {len(runners)} runners ({men} men, {women} women)")

if __name__ == '__main__':
    main()
