"""Changelog engine.

The site always shows the LATEST version, but the user wants a VERY detailed yet
readable changelog. So on every import we store a canonical `snapshot` of each
entity and diff it against the previous version's snapshot, writing human-readable
`change_entry` rows (added / removed / modified with field-level before -> after).
All snapshots are retained, so any version pair's diff can be regenerated.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3

# canonical fields compared for a "modified" diff, in display order
CORE_FIELDS = ["name", "tier", "group", "summary", "effects"]
FIELD_LABEL = {
    "name": "Name", "tier": "Tier", "group": "Group", "summary": "Summary",
    "effects": "Effect", "ap": "AP", "qualities": "Qualities", "cost": "Cost",
    "traits": "Traits", "flavor": "Flavor", "limits": "Limits", "passive": "Passive",
}


# Provenance/bookkeeping attrs that describe WHERE a record came from, not what it
# does. Excluded from the diff so that e.g. a homebrew item becoming official PHB
# content (custom→core, origin dropped) doesn't emit noise rows — only genuine
# rules changes (Effect, Cost, Tier…) surface in the changelog.
PROVENANCE_ATTRS = {"custom", "made on", "status", "origin", "outdated"}


def _canonical(ent: dict) -> dict:
    """Flat dict of stable fields for diffing (attrs + typed cols folded in)."""
    d: dict[str, str] = {
        "name": ent.get("name") or "",
        "tier": ent.get("tier"),
        "group": ent.get("group_name") or "",
        "summary": (ent.get("summary") or "").strip(),
        "effects": (ent.get("effects") or "").strip(),
    }
    for k, v in (ent.get("attrs") or {}).items():
        if k.lower().replace("_", " ") in PROVENANCE_ATTRS:
            continue
        d[f"attr:{k}"] = v
    typed = ent.get("typed")
    if typed:
        for k, v in (typed[1] or {}).items():
            if k not in ("discipline_name",) and v is not None:
                d.setdefault(k, v)
    return {k: v for k, v in d.items() if v not in (None, "")}


def _sig(canon: dict) -> str:
    return hashlib.sha256(
        json.dumps(canon, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _short(v) -> str:
    s = str(v).replace("\n", " ").strip()
    return s if len(s) <= 200 else s[:197] + "..."


def _focus(ov, nv):
    """Readable (old, new) snippets for a changed field.

    Short values pass through verbatim. When BOTH values are long and share a
    common leading run (a reworded clause deep inside an effect), that identical
    head is collapsed to a leading ellipsis so the actual change stays visible
    instead of being pushed past the truncation cap — this is what makes a PHB
    "changed X to Y" row legible rather than "changed <long text> to <same long
    text>"."""
    a = None if ov is None else str(ov).replace("\n", " ").strip()
    b = None if nv is None else str(nv).replace("\n", " ").strip()
    if a is not None and b is not None and len(a) > 90 and len(b) > 90:
        i, m = 0, min(len(a), len(b))
        while i < m and a[i] == b[i]:
            i += 1
        i = max(0, i - 30)   # keep a little context before the divergence
        if i > 8:
            a, b = "…" + a[i:], "…" + b[i:]
    return (None if a is None else _short(a), None if b is None else _short(b))


def _field_label(key: str) -> str:
    if key.startswith("attr:"):
        return key[5:]
    return FIELD_LABEL.get(key, key.replace("_", " ").title())


def previous_version(conn: sqlite3.Connection, version: str) -> str | None:
    row = conn.execute(
        "SELECT version FROM snapshot WHERE version != ? "
        "ORDER BY (SELECT MAX(id) FROM import_run r WHERE r.version = snapshot.version) DESC, version DESC "
        "LIMIT 1",
        (version,),
    ).fetchone()
    return row[0] if row else None


def build_snapshot(conn: sqlite3.Connection, version: str, pages: list[dict]) -> None:
    """Store canonical snapshot rows for this version (idempotent per version)."""
    conn.execute("DELETE FROM snapshot WHERE version = ?", (version,))
    rows = []
    for page in pages:
        for ent in page["records"]:
            canon = _canonical(ent)
            rows.append((version, ent["kind"], ent["slug"], ent["name"],
                         json.dumps(canon, ensure_ascii=False), _sig(canon)))
    conn.executemany(
        "INSERT OR REPLACE INTO snapshot (version,kind,slug,name,canonical_json,sig) "
        "VALUES (?,?,?,?,?,?)", rows)
    conn.commit()


def _load_snapshot(conn: sqlite3.Connection, version: str) -> dict:
    out = {}
    for r in conn.execute(
            "SELECT kind,slug,name,canonical_json,sig FROM snapshot WHERE version=?", (version,)):
        out[(r["kind"], r["slug"])] = {
            "name": r["name"], "canon": json.loads(r["canonical_json"]), "sig": r["sig"]}
    return out


def diff_versions(conn: sqlite3.Connection, version: str) -> int:
    """Compute change_entry rows for `version` vs the previous version. Returns count."""
    conn.execute("DELETE FROM change_entry WHERE version_to = ?", (version,))
    prev = previous_version(conn, version)
    new = _load_snapshot(conn, version)
    seq = 0
    entries: list[tuple] = []

    if prev is None:
        # baseline: one readable summary per kind (don't spam an "added" row per entity)
        counts: dict[str, int] = {}
        for (kind, _slug) in new:
            counts[kind] = counts.get(kind, 0) + 1
        for kind in sorted(counts):
            seq += 1
            entries.append((None, version, kind, None, None, "baseline", None, None, None,
                            f"Baseline {version}: imported {counts[kind]} {kind}"
                            f"{'s' if counts[kind] != 1 else ''}.", seq))
        conn.executemany(
            """INSERT INTO change_entry
               (version_from,version_to,kind,slug,name,change_type,field,old_value,new_value,summary,seq)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""", entries)
        conn.commit()
        return len(entries)

    old = _load_snapshot(conn, prev)
    new_keys, old_keys = set(new), set(old)

    # added
    for key in sorted(new_keys - old_keys):
        kind, slug = key
        seq += 1
        entries.append((prev, version, kind, slug, new[key]["name"], "added", None, None,
                        None, f"Added {kind} “{new[key]['name']}”.", seq))
    # removed
    for key in sorted(old_keys - new_keys):
        kind, slug = key
        seq += 1
        entries.append((prev, version, kind, slug, old[key]["name"], "removed", None, None,
                        None, f"Removed {kind} “{old[key]['name']}”.", seq))
    # modified (field-level)
    for key in sorted(new_keys & old_keys):
        if new[key]["sig"] == old[key]["sig"]:
            continue
        kind, slug = key
        name = new[key]["name"]
        oc, nc = old[key]["canon"], new[key]["canon"]
        fields = list(dict.fromkeys(CORE_FIELDS + sorted(set(oc) | set(nc))))
        seen: set[tuple] = set()  # collapse fields that promote to the same (label,before,after)
        for f in fields:
            ov, nv = oc.get(f), nc.get(f)
            if ov == nv:
                continue
            label = _field_label(f)
            fo, fn = _focus(ov, nv)   # collapse identical head on long text so the change shows
            dedupe_key = (label, fo, fn)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            seq += 1
            if ov is None:
                summ = f"{name}: {label} set to “{fn}”."
            elif nv is None:
                summ = f"{name}: {label} removed (was “{fo}”)."
            else:
                summ = f"{name}: {label} changed from “{fo}” to “{fn}”."
            entries.append((prev, version, kind, slug, name, "modified", label,
                            fo, fn, summ, seq))

    conn.executemany(
        """INSERT INTO change_entry
           (version_from,version_to,kind,slug,name,change_type,field,old_value,new_value,summary,seq)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""", entries)
    conn.commit()
    return len(entries)
