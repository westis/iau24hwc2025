#!/usr/bin/env python3
"""
CLI Tool: Manual matching for unmatched runners

Usage:
    # List all unmatched runners
    python scripts/manual-match.py --list

    # Manually match a runner by ID
    python scripts/manual-match.py --runner-id 123 --duv-id 456789

    # Interactive manual matching
    python scripts/manual-match.py --interactive
"""

import sys
import os
import sqlite3
import argparse
from typing import Optional


def list_unmatched(db_path: str, status: str = 'unmatched'):
    """List all runners with given match status"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM runners
        WHERE match_status = ?
        ORDER BY nationality, gender, entry_id
    """, (status,))

    runners = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not runners:
        print(f"No runners with status '{status}'", file=sys.stderr)
        return

    print(f"\n{len(runners)} runners with status '{status}':\n")
    print(f"{'ID':>4} {'Entry':>6} {'First Name':20} {'Last Name':20} {'Nat':3} {'G':1}")
    print("=" * 80)

    for r in runners:
        print(f"{r['id']:>4} {r['entry_id']:>6} {r['firstname'][:20]:20} {r['lastname'][:20]:20} "
              f"{r['nationality']:3} {r['gender']:1}")

    print(f"\nTotal: {len(runners)} unmatched runners")
    print("\nTo manually match, use:")
    print("  python scripts/manual-match.py --runner-id <ID> --duv-id <DUV_ID>")
    print("Or use DB Browser for SQLite to edit the database directly.")


def manual_match(db_path: str, runner_id: int, duv_id: int, confidence: float = 1.0):
    """Manually match a runner to a DUV ID"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check runner exists
    cursor.execute("SELECT * FROM runners WHERE id = ?", (runner_id,))
    runner = cursor.fetchone()

    if not runner:
        print(f"ERROR: Runner ID {runner_id} not found", file=sys.stderr)
        conn.close()
        return False

    # Update runner
    cursor.execute("""
        UPDATE runners
        SET duv_id = ?,
            match_status = 'manually-matched',
            match_confidence = ?
        WHERE id = ?
    """, (duv_id, confidence, runner_id))

    conn.commit()
    conn.close()

    print(f"✓ Runner {runner_id} manually matched to DUV ID {duv_id}")
    return True


def interactive_match(db_path: str):
    """Interactive matching for unmatched runners"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM runners
        WHERE match_status = 'unmatched'
        ORDER BY nationality, gender, entry_id
    """)

    runners = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not runners:
        print("No unmatched runners found.", file=sys.stderr)
        return

    print(f"\nInteractive Manual Matching - {len(runners)} unmatched runners")
    print("Commands: [d]uv-id <ID>, [s]kip, [q]uit\n")

    for i, r in enumerate(runners, 1):
        print(f"\n[{i}/{len(runners)}] ID:{r['id']} Entry:{r['entry_id']}")
        print(f"  Name: {r['firstname']} {r['lastname']}")
        print(f"  Nationality: {r['nationality']} | Gender: {r['gender']}")

        # Show candidates if any
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM match_candidates
            WHERE runner_id = ?
            ORDER BY confidence DESC
            LIMIT 5
        """, (r['id'],))
        candidates = [dict(row) for row in cursor.fetchall()]
        conn.close()

        if candidates:
            print(f"\n  Suggested candidates:")
            for j, c in enumerate(candidates, 1):
                yob = f"YOB:{c['year_of_birth']}" if c['year_of_birth'] else "YOB:N/A"
                print(f"    {j}. DUV ID {c['duv_person_id']}: {c['firstname']} {c['lastname']} "
                      f"({c['nation']}, {c['sex']}) {yob} - Conf:{c['confidence']:.2f}")

        try:
            cmd = input("\nCommand [d <duv_id> / s / q]: ").strip().lower()

            if cmd == 'q':
                break
            elif cmd == 's' or cmd == '':
                continue
            elif cmd.startswith('d '):
                try:
                    duv_id = int(cmd.split()[1])
                    manual_match(db_path, r['id'], duv_id, 1.0)
                except (ValueError, IndexError):
                    print("Invalid DUV ID. Use: d <number>")
            elif cmd.isdigit() and candidates:
                # User selected candidate number
                choice = int(cmd)
                if 1 <= choice <= len(candidates):
                    selected = candidates[choice - 1]
                    manual_match(db_path, r['id'], selected['duv_person_id'], selected['confidence'])
                else:
                    print(f"Invalid choice. Enter 1-{len(candidates)}")
            else:
                print("Unknown command. Use: d <duv_id>, s, or q")

        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break

    print("\nDone!")


def main():
    parser = argparse.ArgumentParser(description='Manual matching for unmatched runners')
    parser.add_argument('--db-path', default='data/iau24hwc.db', help='Path to SQLite database')
    parser.add_argument('--list', action='store_true', help='List unmatched runners')
    parser.add_argument('--status', default='unmatched', help='Filter by status (unmatched, no-match, etc.)')
    parser.add_argument('--runner-id', type=int, help='Runner ID to match')
    parser.add_argument('--duv-id', type=int, help='DUV Person ID to match to')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive matching mode')

    args = parser.parse_args()

    db_path = args.db_path
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    if args.interactive:
        interactive_match(db_path)
    elif args.list:
        list_unmatched(db_path, args.status)
    elif args.runner_id and args.duv_id:
        manual_match(db_path, args.runner_id, args.duv_id)
    else:
        # Default: list unmatched
        list_unmatched(db_path, args.status)


if __name__ == '__main__':
    main()
