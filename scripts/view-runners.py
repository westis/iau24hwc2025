#!/usr/bin/env python3
"""
CLI Tool: View and edit runners in database

Usage:
    python scripts/view-runners.py [--db-path data/iau24hwc.db] [--filter COUNTRY]
"""

import sys
import os
import sqlite3
import argparse
from typing import Optional


def view_runners(db_path: str, filter_country: Optional[str] = None):
    """Display all runners with option to edit"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT * FROM runners ORDER BY entry_id"
    params = ()

    if filter_country:
        query = "SELECT * FROM runners WHERE nationality = ? ORDER BY entry_id"
        params = (filter_country.upper(),)

    cursor.execute(query, params)
    runners = [dict(row) for row in cursor.fetchall()]

    if not runners:
        print("No runners found.", file=sys.stderr)
        conn.close()
        return

    print(f"\nTotal runners: {len(runners)}\n")
    print(f"{'ID':>4} {'Entry':>6} {'First Name':20} {'Last Name':20} {'Nat':3} {'G':1} {'Match':12}")
    print("=" * 90)

    for r in runners:
        match_status = r.get('match_status', 'unmatched')[:12]
        print(f"{r['id']:>4} {r['entry_id']:>6} {r['firstname'][:20]:20} {r['lastname'][:20]:20} "
              f"{r['nationality']:3} {r['gender']:1} {match_status:12}")

    conn.close()


def edit_runner(db_path: str, runner_id: int, firstname: str = None, lastname: str = None):
    """Edit a runner's name"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if firstname and lastname:
        cursor.execute("""
            UPDATE runners
            SET firstname = ?, lastname = ?
            WHERE id = ?
        """, (firstname, lastname, runner_id))
        print(f"✓ Updated runner {runner_id}: {firstname} {lastname}")
    elif firstname:
        cursor.execute("""
            UPDATE runners
            SET firstname = ?
            WHERE id = ?
        """, (firstname, runner_id))
        print(f"✓ Updated runner {runner_id} firstname: {firstname}")
    elif lastname:
        cursor.execute("""
            UPDATE runners
            SET lastname = ?
            WHERE id = ?
        """, (lastname, runner_id))
        print(f"✓ Updated runner {runner_id} lastname: {lastname}")

    conn.commit()
    conn.close()


def interactive_edit(db_path: str):
    """Interactive editing mode"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM runners ORDER BY entry_id")
    runners = [dict(row) for row in cursor.fetchall()]
    conn.close()

    print(f"\nInteractive Edit Mode - {len(runners)} runners")
    print("Commands: [n]ext, [e]dit, [s]wap names, [q]uit\n")

    i = 0
    while i < len(runners):
        r = runners[i]
        print(f"\n[{i+1}/{len(runners)}] ID:{r['id']} Entry:{r['entry_id']}")
        print(f"  Name: {r['firstname']} {r['lastname']}")
        print(f"  Nationality: {r['nationality']} | Gender: {r['gender']}")
        print(f"  Match: {r.get('match_status', 'unmatched')}")

        try:
            cmd = input("\nCommand [n/e/s/q]: ").strip().lower()

            if cmd == 'q':
                break
            elif cmd == 'n' or cmd == '':
                i += 1
            elif cmd == 's':
                # Swap firstname and lastname
                edit_runner(db_path, r['id'], r['lastname'], r['firstname'])
                print(f"✓ Swapped: {r['lastname']} {r['firstname']}")
                # Reload
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM runners ORDER BY entry_id")
                runners = [dict(row) for row in cursor.fetchall()]
                conn.close()
            elif cmd == 'e':
                new_first = input(f"  Firstname [{r['firstname']}]: ").strip() or r['firstname']
                new_last = input(f"  Lastname [{r['lastname']}]: ").strip() or r['lastname']
                edit_runner(db_path, r['id'], new_first, new_last)
                # Reload
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM runners ORDER BY entry_id")
                runners = [dict(row) for row in cursor.fetchall()]
                conn.close()
                i += 1
            else:
                print("Unknown command")

        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break

    print(f"\nDone!")


def main():
    parser = argparse.ArgumentParser(description='View and edit runners in database')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')
    parser.add_argument('--filter', help='Filter by country code (e.g., DEN)')
    parser.add_argument('--edit', action='store_true', help='Interactive edit mode')
    parser.add_argument('--id', type=int, help='Edit specific runner by ID')
    parser.add_argument('--firstname', help='New firstname')
    parser.add_argument('--lastname', help='New lastname')

    args = parser.parse_args()

    db_path = args.db_path
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    if args.edit:
        interactive_edit(db_path)
    elif args.id:
        if args.firstname or args.lastname:
            edit_runner(db_path, args.id, args.firstname, args.lastname)
        else:
            print("ERROR: Must provide --firstname and/or --lastname with --id")
            sys.exit(1)
    else:
        view_runners(db_path, args.filter)


if __name__ == '__main__':
    main()
