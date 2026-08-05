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
MATERIAL_PRICING = "Price + Bulk × (Material Value Multiplier)"


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
    # Binding's discipline page also defines the Arch-Demon Pacts (bindings).
    pacts = _extract_pacts(raw, rel_path, restrict_after="Arch-Demons") if "Arch-Demons" in raw else []
    return [disc] + feats + runes + pacts


def handle_items(rel_path, raw, role, page):
    """Weapons / Armor / Shields: bold-name blocks filtered by item attrs, + materials."""
    out = []
    for r in _records(raw, role, rel_path):
        if r["kind"] == "material":
            # A material's whole record sits on ONE bullet line:
            #   - *Caeline*| *Multipier*: 8,000T| `effect...`
            # so re-parse that line (the generic block body is empty here).
            line = r["raw"]
            pairs = dict(T.parse_attr_line(line))
            mult = pairs.get("Multipier") or pairs.get("Multiplier") or ""
            eff = "\n".join(t.strip() for t in T.BACKTICK.findall(line))
            applies = ("Weapon" if "weapon" in rel_path.lower()
                       else "Armor" if "armor" in rel_path.lower() else (r["section"] or "Equipment"))
            out.append(_entity(
                "material", r["name"], group="Unique Materials", section=applies,
                effects=eff,
                attrs={"Multiplier": mult, "applies_to": applies,
                       "pricing_formula": MATERIAL_PRICING,
                       "pricing_example": f"Price + Bulk × {mult}" if mult else ""},
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


# ---- rituals & consumables (generic bold-name catalogs) ----------------
def handle_rituals(rel_path, raw, role, page):
    out = []
    for r in _records(raw, role, rel_path):
        if not any(k in r["attrs"] for k in ("Runes", "Reagents", "Time")):
            continue
        out.append(_entity(
            "ritual", r["name"], group=r["group"], summary=r["description"] or r["flavor"],
            effects=r["effects"], attrs=r["attrs"], raw=r["raw"], source=rel_path,
        ))
    return out


def handle_consumables(rel_path, raw, role, page):
    out = []
    for r in _records(raw, role, rel_path):
        if not any(k in r["attrs"] for k in ("Cost", "Price", "Tier", "Traits", "Active")):
            continue
        out.append(_entity(
            "consumable", r["name"], group=r["group"] or r["section"],
            tier=_int(r["attrs"].get("Tier")), summary=r["description"] or r["flavor"],
            effects=r["effects"], attrs=r["attrs"], raw=r["raw"], source=rel_path,
        ))
    return out


# ---- artifice items (italic-name records with a *Pattern* of Runes) -----
ARTIFICE_NAME = re.compile(r"^\*(?P<name>[A-Z][A-Za-z0-9 ,/&'\-]{0,45})\*(?:\s*\||\s*$)")


def handle_artifice(rel_path, raw, role, page):
    lines = raw.replace("\r\n", "\n").split("\n")
    n = len(lines)

    def pattern_near(i):
        return any("*Pattern*" in lines[j] or "*R*" in lines[j] for j in range(i, min(i + 4, n)))

    starts, section = [], ""
    for i, line in enumerate(lines):
        h = T.HEADING.match(line)
        if h:
            section = re.sub(r"^#+\s*", "", h.group(2)).strip()
            continue
        m = ARTIFICE_NAME.match(line)
        if m and ("*Pattern*" in line or pattern_near(i + 1)):
            starts.append((i, m.group("name").strip(), section))

    out = []
    for idx, (i, name, section) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else n
        block = []
        tail = ARTIFICE_NAME.sub("", lines[i], count=1)  # automata carry stats on the name line
        if tail.strip():
            block.append(tail)
        for k in range(i + 1, end):
            if T.HEADING.match(lines[k]):
                break
            block.append(lines[k])

        attrs, effects, desc, flavor = {}, [], [], ""
        for bl in block:
            s = bl.strip()
            if not s or T.HR_NOISE.match(s):
                continue
            q = T.QUOTE.match(s)
            if q:
                flavor = flavor or q.group(1).strip()
                continue
            pairs = T.parse_attr_line(bl)
            ticks = [t.strip() for t in T.BACKTICK.findall(bl)]
            if pairs:
                attrs.update(dict(pairs))
            if ticks:
                effects.extend(ticks)
            elif not pairs:
                plain = T.strip_md(bl).strip()
                if plain:
                    desc.append(plain)

        cat = section or "Artifice"
        out.append(_entity(
            "artifice", name, group=cat, section=cat, tier=_int(attrs.get("Tier")),
            summary=flavor or (desc[0] if desc else ""), effects="\n".join(effects),
            attrs=attrs | {"description": "\n".join(desc), "category": cat},
            raw="\n".join(lines[i:end]).strip(), source=rel_path,
        ))
    return out


# ---- pacts (Arch-Demons / Rare Pacts — records defined by #### headings) -
def _extract_pacts(raw, source, restrict_after=None):
    lines = raw.replace("\r\n", "\n").split("\n")
    start_idx = 0
    if restrict_after:
        start_idx = None
        for i, l in enumerate(lines):
            h = T.HEADING.match(l)
            if h and restrict_after.lower() in h.group(2).lower():
                start_idx = i + 1
                break
        if start_idx is None:
            return []
    heads = []
    for i in range(start_idx, len(lines)):
        h = T.HEADING.match(lines[i])
        if h and len(h.group(1)) >= 4:  # a #### heading = one pact
            heads.append((i, re.sub(r"^#+\s*", "", h.group(2)).strip()))
    out = []
    for idx, (i, name) in enumerate(heads):
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        text = "\n".join(lines[i + 1:end])
        fl = re.search(r'\*"(.+?)"\*', text, re.S)
        flavor = fl.group(1).strip() if fl else ""
        effects = "\n".join(t.strip() for t in T.BACKTICK.findall(text))
        lore = T.first_paragraph(T.clean_body(re.sub(r'\*".+?"\*', '', text, flags=re.S)))
        out.append(_entity(
            "pact", name, group="Pact", summary=flavor or lore, effects=effects,
            attrs={"invocation": flavor, "lore": lore},
            raw="\n".join(lines[i:end]).strip(), source=source,
        ))
    return out


def handle_pacts(rel_path, raw, role, page):
    return _extract_pacts(raw, rel_path)


HANDLERS = {
    "discipline": handle_discipline,
    "weapons": handle_items,
    "armor": handle_items,
    "archetypes": handle_archetypes,
    "conditions": handle_conditions,
    "actions": handle_actions,
    "rituals": handle_rituals,
    "consumables": handle_consumables,
    "artifice": handle_artifice,
    "pacts": handle_pacts,
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


def parse_custom(rel_path: str, raw: str, version: str) -> dict:
    """Parse a player-authored custom-items file (same shape as the Artifice chapter).

    Records are tagged custom + their `made_on` PHB version. They live outside the
    PHB, so they are re-imported every time and never deleted — and are flagged
    `outdated` when the current PHB has moved past the version they were made on.
    """
    page = build_page(rel_path, raw, "custom")
    page["title"] = "Custom Items"
    page["chapter"] = "Custom"
    recs = handle_artifice(rel_path, raw, "artifice", page)
    for r in recs:
        made = r["attrs"].get("Made On") or r["attrs"].get("Made_On") or version
        status = (r["attrs"].get("Status") or "").strip().lower()
        if not status:
            status = "outdated" if made != version else "current"
        r["attrs"].update({"custom": True, "made_on": made, "status": status})
    page["records"] = recs
    return page
