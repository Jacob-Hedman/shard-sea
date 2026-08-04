"""Orchestrator: turn one source .md file into a page + typed records.

Every file yields a `page` (faithful prose, lossless `raw_md`). Catalog files also
yield `entity` records, some promoted into rigid typed tables. Roles are resolved
by registry.role_for(); each role has a handler below.
"""
from __future__ import annotations

import re

from . import text as T
from .blocks import parse_block, split_blocks
from .registry import ROLE_PATTERNS, role_for

ITEM_KEYS = ("Tier", "Cost", "Price", "Bulk", "Durability", "Durable")


def _int(val: str | None) -> int | None:
    if not val:
        return None
    m = re.search(r"-?\d+", str(val))
    return int(m.group()) if m else None


def _entity(kind, name, *, group="", section="", tier=None, summary="", effects="",
            attrs=None, raw="", source="", typed=None):
    return {
        "kind": kind, "name": name, "group_name": group or None, "section": section,
        "tier": tier, "summary": summary or None, "effects": effects or None,
        "attrs": attrs or {}, "raw_md": raw, "source_path": source,
        "typed": typed,  # (table, {cols}) or None
    }


def build_page(rel_path: str, raw: str, role: str) -> dict:
    parts = rel_path.split("/")
    fname = parts[-1]
    chapter_folder = parts[0] if len(parts) > 1 else ""
    body = T.clean_body(raw)
    return {
        "title": T.title_from_filename(fname),
        "chapter": T.clean_folder_label(chapter_folder) if chapter_folder else None,
        "chapter_no": T.order_from_filename(chapter_folder) if chapter_folder else None,
        "section_order": T.order_from_filename(fname),
        "role": role,
        "source_path": rel_path,
        "summary": T.first_paragraph(body),
        "body_md": body,
        "raw_md": raw,
        "records": [],
    }


# ---- role handlers -----------------------------------------------------
def _records(raw: str, role: str, source: str):
    """Run the block splitter for a role and yield parsed-block dicts."""
    for blk, header in split_blocks(raw, ROLE_PATTERNS[role]):
        yield parse_block(blk, header)


def handle_discipline(rel_path, raw, role, page):
    parts = rel_path.split("/")
    fname = parts[-1]
    folder = parts[-2] if len(parts) >= 2 else ""      # '3_Potence'
    skill = T.clean_folder_label(folder)
    skill_no = T.order_from_filename(folder)
    disc_name = T.title_from_filename(fname)

    # passive effects block
    passive = ""
    m = re.search(r"\*\*Passive Effects\*\*(.*?)(?:\n\s*\n|\Z)", raw, re.S)
    if m:
        ticks = T.BACKTICK.findall(m.group(1))
        passive = "\n".join(t.strip() for t in ticks) or T.strip_md(m.group(1)).strip()

    feats, runes = [], []
    for r in _records(raw, role, rel_path):
        summary = r["flavor"] or (r["description"].split("\n")[0] if r["description"] else "")
        if r["kind"] == "rune":
            runes.append(_entity(
                "rune", r["name"], group=r["group"], summary=summary,
                effects=r["effects"], attrs=r["attrs"] | {"description": r["description"]},
                raw=r["raw"], source=rel_path,
            ))
        else:  # feat / prayer
            is_prayer = r["raw"].lstrip().lower().startswith("prayer")
            feats.append(_entity(
                "feat", r["name"], group=r["group"], tier=r["num"], summary=summary,
                effects=r["effects"], attrs=r["attrs"], raw=r["raw"], source=rel_path,
                typed=("feat", {
                    "discipline_name": disc_name, "skill": skill, "feat_tier": r["num"],
                    "ap": r["attrs"].get("AP"), "qualities": r["attrs"].get("Qualities"),
                    "flavor": r["flavor"] or None, "effect": r["effects"] or None,
                    "limits": r["sublabels"].get("Limits"),
                }),
            ))
            if is_prayer:
                feats[-1]["attrs"]["Record"] = "Prayer"

    is_special = bool(runes) or disc_name.isupper() or any(
        f["attrs"].get("Record") == "Prayer" for f in feats)
    disc = _entity(
        "discipline", disc_name, group=skill, summary=page["summary"],
        attrs={"skill": skill, "passive": passive}, raw=raw, source=rel_path,
        typed=("discipline", {
            "skill": skill, "skill_no": skill_no, "passive": passive or None,
            "feat_count": len(feats), "is_special": int(is_special),
        }),
    )
    return [disc] + feats + runes


def handle_items(rel_path, raw, role, page):
    """Weapons / Armor / Shields: bold-name blocks filtered by item attrs, + materials."""
    out = []
    for r in _records(raw, role, rel_path):
        if r["kind"] == "material":
            mult = r["attrs"].get("Multipier") or r["attrs"].get("Multiplier")
            out.append(_entity(
                "material", r["name"], group="Unique Materials", section=r["section"],
                effects=r["effects"], attrs=r["attrs"] | {"applies_to": r["section"]},
                raw=r["raw"], source=rel_path,
            ))
            continue
        # item candidate: keep only bold-name blocks that carry item stats
        if not any(k in r["attrs"] for k in ITEM_KEYS):
            continue
        tier = _int(r["attrs"].get("Tier"))
        special = "\n".join(x for x in (r["description"], r["effects"]) if x).strip() or None
        if role == "weapons":
            mode = "Ranged" if "rang" in r["section"].lower() else (
                "Melee" if "mel" in r["section"].lower() else None)
            out.append(_entity(
                "weapon", r["name"], group=r["group"], section=r["section"], tier=tier,
                summary=r["description"] or r["flavor"], effects=r["effects"],
                attrs=r["attrs"], raw=r["raw"], source=rel_path,
                typed=("weapon", {
                    "weapon_group": r["group"] or None, "mode": mode, "tier": tier,
                    "cost": r["attrs"].get("Cost"), "accuracy": r["attrs"].get("Accuracy"),
                    "bulk": r["attrs"].get("Bulk"), "durable": r["attrs"].get("Durable"),
                    "traits": r["attrs"].get("Traits"), "special": special,
                }),
            ))
        else:  # armor
            grp = (r["group"] or r["section"]).lower()
            armor_kind = "Shield" if "shield" in grp else "Armor"
            out.append(_entity(
                "armor", r["name"], group=r["group"] or r["section"], section=r["section"],
                tier=tier, summary=r["description"] or r["flavor"], effects=r["effects"],
                attrs=r["attrs"], raw=r["raw"], source=rel_path,
                typed=("armor", {
                    "armor_kind": armor_kind, "tier": tier, "cost": r["attrs"].get("Cost"),
                    "bulk": r["attrs"].get("Bulk"), "durability": r["attrs"].get("Durability"),
                    "movement_penalty": r["attrs"].get("Movement Penalty"),
                    "resources": r["attrs"].get("Resources"), "rating": r["attrs"].get("Rating"),
                    "special": special,
                }),
            ))
    return out


PANIC_RE = re.compile(r"-\s*\*(Clear|Dark|Morbid)\*\s*:\s*`?(.+?)`?\s*$", re.I | re.M)


def handle_archetypes(rel_path, raw, role, page):
    import json
    out = []
    for r in _records(raw, role, rel_path):
        # split raw at Panic Response to separate the granted-feat effect from panic
        head, _, tail = r["raw"].partition("*Panic Response*")
        feat_effect = "\n".join(t.strip() for t in T.BACKTICK.findall(head))
        panic = {m.group(1).title(): T.strip_md(m.group(2)).strip()
                 for m in PANIC_RE.finditer(tail)}
        panic_flavor = ""
        q2 = re.findall(r'\*"(.+?)"\*', tail)
        if q2:
            panic_flavor = q2[0]
        out.append(_entity(
            "archetype", r["name"], summary=r["flavor"], effects=feat_effect,
            attrs=r["attrs"] | ({"panic_flavor": panic_flavor} if panic_flavor else {}),
            raw=r["raw"], source=rel_path,
            typed=("archetype", {
                "skills": r["attrs"].get("Skills"), "feat_name": r["attrs"].get("Feat"),
                "feat_effect": feat_effect or None, "quote": r["flavor"] or None,
                "panic_response": r["attrs"].get("Panic Response"),
                "panic_json": json.dumps(panic) if panic else None,
            }),
        ))
    return out


def handle_conditions(rel_path, raw, role, page):
    import json
    out = []
    for r in _records(raw, role, rel_path):
        severity = re.sub(r"\s+Conditions?:?\s*$", "", r["group"], flags=re.I).strip() or None
        effect = r["effects"] or r["description"] or r["extra"].get("rest") or None
        extra = {k: v for k, v in r["sublabels"].items()}
        if r["description"] and r["effects"]:
            extra["notes"] = r["description"]
        out.append(_entity(
            "condition", r["name"], group=severity, summary=effect, effects=r["effects"],
            attrs=r["attrs"], raw=r["raw"], source=rel_path,
            typed=("condition", {
                "severity": severity, "effect": effect,
                "extra_json": json.dumps(extra) if extra else None,
            }),
        ))
    return out


def handle_actions(rel_path, raw, role, page):
    import json
    out = []
    for r in _records(raw, role, rel_path):
        ap = (r["extra"].get("ap") or r["attrs"].get("AP") or "").strip() or None
        grp = r["group"] or r["section"]
        action_type = re.sub(r"\s+Actions?\s*$", "", grp, flags=re.I).strip() or None
        effect = r["effects"] or r["description"] or None
        extra = {k: v for k, v in r["sublabels"].items()}
        out.append(_entity(
            "action", r["name"], group=action_type, section=r["section"], summary=effect,
            effects=r["effects"], attrs=r["attrs"] | ({"AP": ap} if ap else {}),
            raw=r["raw"], source=rel_path,
            typed=("game_action", {
                "action_type": action_type, "ap": ap, "effect": effect,
                "extra_json": json.dumps(extra) if extra else None,
            }),
        ))
    return out


HANDLERS = {
    "discipline": handle_discipline,
    "weapons": handle_items,
    "armor": handle_items,
    "archetypes": handle_archetypes,
    "conditions": handle_conditions,
    "actions": handle_actions,
}


def parse_file(rel_path: str, raw: str) -> dict:
    """Return a page dict with its `records` populated."""
    role, _desc = role_for(rel_path)
    page = build_page(rel_path, raw, role)
    handler = HANDLERS.get(role)
    if handler:
        try:
            page["records"] = handler(rel_path, raw, role, page)
        except Exception as exc:  # never let one file break the whole import
            page["records"] = []
            page["parse_error"] = f"{type(exc).__name__}: {exc}"
    return page
