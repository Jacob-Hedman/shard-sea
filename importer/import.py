#!/usr/bin/env python3
"""Shard-sea Codex importer — CLI.

Parse a PHB Obsidian vault (markdown) into shardsea.db, then compute a detailed
changelog vs the previous imported version.

    python importer/import.py --version v17               # import sources/phb/v17
    python importer/import.py --version v17 --dry-run     # parse + report, write nothing
    python importer/import.py --version v18 --source path/to/vault

Latest-wins: the content tables are rebuilt each run; the site always shows the
newest version. History for the changelog is kept in snapshot/change_entry.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # make `shardsea` importable

from shardsea import changelog, datamap, db  # noqa: E402
from shardsea.parse import parse_file, parse_custom  # noqa: E402

REPO = Path(__file__).resolve().parent.parent


def discover(source: Path) -> list[tuple[str, str]]:
    """Return [(posix_rel_path, text)] for every .md under source (sorted, stable)."""
    files = []
    for p in sorted(source.rglob("*.md")):
        if p.name.endswith(".old"):
            continue
        rel = p.relative_to(source).as_posix()
        files.append((rel, p.read_text(encoding="utf-8", errors="replace")))
    return files


def source_hash(files: list[tuple[str, str]]) -> str:
    h = hashlib.sha256()
    for rel, text in files:
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        h.update(text.encode("utf-8"))
        h.update(b"\0")
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="Import a PHB version into shardsea.db")
    ap.add_argument("--version", required=True, help="version label, e.g. v17")
    ap.add_argument("--source", help="vault root (default: sources/phb/<version>)")
    ap.add_argument("--db", default=str(REPO / "shardsea.db"))
    ap.add_argument("--schema", default=str(REPO / "schema.sql"))
    ap.add_argument("--dry-run", action="store_true", help="parse + report; write nothing")
    ap.add_argument("--no-datamap", action="store_true", help="skip regenerating DATA_MAP.md")
    args = ap.parse_args()

    source = Path(args.source) if args.source else (REPO / "sources" / "phb" / args.version)
    # the vault may have a single wrapper dir (e.g. 'NU PHB no_DMG/') — descend into it
    if not any(source.glob("*.md")) and not any(source.glob("*/*.md")):
        subs = [d for d in source.iterdir() if d.is_dir()] if source.exists() else []
        if len(subs) == 1:
            source = subs[0]
    if not source.exists():
        print(f"ERROR: source not found: {source}")
        return 2

    files = discover(source)
    if not files:
        print(f"ERROR: no .md files under {source}")
        return 2
    print(f"Parsing {len(files)} files from {source} ...")

    pages = [parse_file(rel, text) for rel, text in files]

    # player-authored custom items live in custom/*.md (outside the PHB vault) and
    # are merged every import so they persist across PHB versions.
    custom_dir = REPO / "custom"
    if custom_dir.exists():
        for p in sorted(custom_dir.rglob("*.md")):
            rel = "custom/" + p.relative_to(custom_dir).as_posix()
            pages.append(parse_custom(rel, p.read_text(encoding="utf-8", errors="replace"), args.version))
        print(f"  custom items merged: {sum(len(pg['records']) for pg in pages if pg['role'] == 'custom')}")

    # ---- report ----
    # Global dedup: the book lists some buildings/units in several chapters (a
    # Wyvern Roost in both Cities and Building an Outpost). The catalog sweep
    # imports each — keep only the fullest copy per (kind, name). Restricted to
    # the kinds where a repeated name genuinely IS the same entry; feats,
    # materials, runes, activities legitimately reuse names across contexts.
    DEDUP_KINDS = {"structure", "city_zone", "battle_card", "ship"}
    best: dict[tuple, tuple] = {}
    for pi, p in enumerate(pages):
        for ri, e in enumerate(p["records"]):
            if e["kind"] not in DEDUP_KINDS or e.get("attrs", {}).get("custom"):
                continue
            key = (e["kind"], e["name"].strip().lower())
            weight = len(e.get("raw_md", "")) + 40 * len(e.get("attrs", {}))
            if key not in best or weight > best[key][0]:
                best[key] = (weight, pi, ri)
    keep = {(v[1], v[2]) for v in best.values()}
    n_dropped = 0
    for pi, p in enumerate(pages):
        kept = []
        for ri, e in enumerate(p["records"]):
            if e["kind"] not in DEDUP_KINDS or e.get("attrs", {}).get("custom") or (pi, ri) in keep:
                kept.append(e)
            else:
                n_dropped += 1
        p["records"] = kept
    if n_dropped:
        print(f"  deduped {n_dropped} cross-chapter duplicate record(s)")

    kinds = Counter()
    roles = Counter()
    errors = []
    for p in pages:
        roles[p["role"]] += 1
        for e in p["records"]:
            kinds[e["kind"]] += 1
        if p.get("parse_error"):
            errors.append((p["source_path"], p["parse_error"]))

    print(f"  pages: {len(pages)}  |  roles: " + ", ".join(f"{r}={n}" for r, n in roles.items()))
    print("  records: " + (", ".join(f"{k}={n}" for k, n in sorted(kinds.items())) or "none"))
    if errors:
        print(f"  PARSE ERRORS ({len(errors)}):")
        for path, err in errors:
            print(f"    - {path}: {err}")

    if args.dry_run:
        print("DRY RUN - nothing written.")
        return 0

    # ---- write ----
    conn = db.connect(args.db)
    db.init_schema(conn, args.schema)
    db.reset_content(conn)
    stats = db.write_all(conn, pages)

    changelog.build_snapshot(conn, args.version, pages)
    n_changes = changelog.diff_versions(conn, args.version)
    prev = changelog.previous_version(conn, args.version)

    conn.execute("DELETE FROM import_run WHERE version = ?", (args.version,))  # idempotent per version
    conn.execute("UPDATE import_run SET is_current = 0")
    conn.execute(
        """INSERT INTO import_run (version,imported_at,source_hash,is_current,page_count,entity_count,notes)
           VALUES (?,?,?,1,?,?,?)""",
        (args.version, datetime.now(timezone.utc).isoformat(timespec="seconds"),
         source_hash(files), stats["pages"], stats["entities"],
         f"prev={prev or 'baseline'}; changes={n_changes}"),
    )
    conn.commit()

    print(f"Wrote {stats['pages']} pages, {stats['entities']} entities to {args.db}")
    print(f"Changelog: {n_changes} change rows ({args.version} vs {prev or 'baseline'})")

    if not args.no_datamap:
        (REPO / "DATA_MAP.md").write_text(datamap.render(pages, args.version), encoding="utf-8")
        print("Wrote DATA_MAP.md")

    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
