"""SQLite layer: schema init, latest-wins reset, and stable-slug writers."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from . import text as T

# content tables wiped on each import (latest-wins). snapshot/change_entry/import_run persist.
CONTENT_TABLES = [
    "feat", "discipline", "weapon", "armor", "archetype", "condition", "game_action",
    "entity", "page",
]


def connect(db_path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_schema(conn: sqlite3.Connection, schema_path: str | Path) -> None:
    conn.executescript(Path(schema_path).read_text(encoding="utf-8"))
    conn.commit()


def reset_content(conn: sqlite3.Connection) -> None:
    for tbl in CONTENT_TABLES:
        conn.execute(f"DELETE FROM {tbl}")
    conn.commit()


# ---- slug allocation (deterministic + stable across versions) ----------
class SlugPool:
    def __init__(self):
        self.used: set[str] = set()

    def take(self, base: str, qualifiers: list[str]) -> str:
        base = T.slugify(base)
        if base not in self.used:
            self.used.add(base)
            return base
        for q in qualifiers:
            if not q:
                continue
            cand = f"{base}-{T.slugify(q)}"
            if cand not in self.used:
                self.used.add(cand)
                return cand
        i = 2
        while f"{base}-{i}" in self.used:
            i += 1
        cand = f"{base}-{i}"
        self.used.add(cand)
        return cand


def _entity_qualifiers(ent: dict) -> list[str]:
    typed = ent.get("typed") or (None, {})
    cols = typed[1] if typed else {}
    return [ent.get("group_name") or "", ent.get("section") or "",
            cols.get("discipline_name") or "", cols.get("skill") or ""]


def write_all(conn: sqlite3.Connection, pages: list[dict]) -> dict:
    """Insert pages + entities + typed rows. Returns {'pages':n,'entities':n,'by_kind':{}}.

    Also attaches a stable `slug` to each entity dict (used by the changelog).
    """
    page_pool = SlugPool()
    ent_pools: dict[str, SlugPool] = {}
    by_kind: dict[str, int] = {}
    n_ent = 0

    for page in pages:
        pslug = page_pool.take(page["title"], [page.get("chapter") or "", page["source_path"]])
        cur = conn.execute(
            """INSERT INTO page (slug,title,chapter,chapter_no,section_order,role,
                                 source_path,summary,body_md,raw_md,record_count)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (pslug, page["title"], page.get("chapter"), page.get("chapter_no"),
             page.get("section_order"), page["role"], page["source_path"],
             page.get("summary"), page["body_md"], page["raw_md"], len(page["records"])),
        )
        page_id = cur.lastrowid

        for ent in page["records"]:
            pool = ent_pools.setdefault(ent["kind"], SlugPool())
            slug = pool.take(ent["name"], _entity_qualifiers(ent))
            ent["slug"] = slug  # back-annotate for changelog
            cur = conn.execute(
                """INSERT INTO entity (kind,slug,name,page_id,group_name,tier,summary,
                                       effects,attrs_json,raw_md,source_path)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (ent["kind"], slug, ent["name"], page_id, ent.get("group_name"),
                 ent.get("tier"), ent.get("summary"), ent.get("effects"),
                 json.dumps(ent.get("attrs") or {}, ensure_ascii=False),
                 ent["raw_md"], ent["source_path"]),
            )
            eid = cur.lastrowid
            typed = ent.get("typed")
            if typed:
                table, cols = typed
                cols = {k: v for k, v in cols.items() if v is not None}
                keys = ["entity_id"] + list(cols)
                ph = ",".join("?" * len(keys))
                conn.execute(
                    f"INSERT INTO {table} ({','.join(keys)}) VALUES ({ph})",
                    [eid] + list(cols.values()),
                )
            n_ent += 1
            by_kind[ent["kind"]] = by_kind.get(ent["kind"], 0) + 1

    conn.commit()
    return {"pages": len(pages), "entities": n_ent, "by_kind": by_kind}
