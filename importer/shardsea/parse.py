"""Orchestrator: turn one source .md file into a page + typed records.

Every file yields a `page` (faithful prose, lossless `raw_md`). Catalog files also
yield `entity` records, some promoted into rigid typed tables. Roles are resolved
by registry.role_for(); each role has a handler below.
"""
from __future__ import annotations

import re

from . import text as T
from .blocks import parse_block, split_blocks
from .registry import CATALOG_SPECS, ROLE_PATTERNS, role_for

ITEM_KEYS = ("Tier", "Cost", "Price", "Bulk", "Durability", "Durable")
MATERIAL_PRICING = "Price + Bulk × (Material Value Multiplier)"


def _int(val: str | None) -> int | None:
    if not val:
        return None
    m = re.search(r"-?\d+", str(val))
    return int(m.group()) if m else None


def _clean_lead(text: str | None) -> str:
    """First real sentence of a block for use as a card summary — skips bullet
    markers, headings, and label-only lines like 'One Watch:'."""
    for line in (text or "").split("\n"):
        s = re.sub(r"^\s*[-*]\s*", "", line)
        s = re.sub(r"^#{1,6}\s*", "", s).strip()
        if len(s) >= 8 and not re.fullmatch(r"[A-Za-z][A-Za-z ]{0,30}:?", s):
            return s
    return ""


def _lead_from(*sources: str | None) -> str:
    """First usable lead text across several candidate blocks."""
    for src in sources:
        got = _clean_lead(src)
        if got:
            return got
    return ""


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
                "material", r["name"], group=applies, section=applies,  # group -> stable slug (caeline-armor)
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
    if role == "weapons":
        out.extend(extract_weapon_meta(rel_path, raw))
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
        extra = {k: v for k, v in r["sublabels"].items()}
        # some actions (e.g. Struggle) put all their rules in sub-labels
        effect = r["effects"] or r["description"] or (next(iter(extra.values()), None)) or None
        summary = _lead_from(r["effects"], r["description"], *extra.values())
        out.append(_entity(
            "action", r["name"], group=action_type, section=r["section"], summary=summary,
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
    """Consumable format: `**Name**` / `\\`Tier_.. Active_.. traits\\`` / `*Cost*:` /
    description / `*Effects*:\\`...\\`` / `*Overdose*:` / `*Withdrawal*:`. The bare
    top-level backtick is the TRAIT line; the real effect is the `*Effects*:` attr."""
    out = []
    for r in _records(raw, role, rel_path):
        a = r["attrs"]
        traits = r["effects"]  # the bare `Tier_.., Active_..` backtick line
        effect = a.get("Effects") or ""
        if not (a.get("Cost") or a.get("Price") or effect or traits):
            continue
        tier = None
        tm = re.search(r"Tier[_ ](\d+)", traits)
        if tm:
            tier = int(tm.group(1))
        extra = {k: a[k] for k in ("Overdose", "Withdrawal", "Addiction") if a.get(k)}
        out.append(_entity(
            "consumable", r["name"], group=r["group"] or r["section"], tier=tier,
            summary=r["description"], effects=effect,
            attrs={**a, "traits": traits, "extra": extra},
            raw=r["raw"], source=rel_path,
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
        # keep the FULL body (minus the invocation quote, shown separately) as
        # markdown, so the terms/benefit prose between the backticks isn't lost.
        body_md = T.clean_body(re.sub(r'\*"[^"]+"\*\s*', '', text, flags=re.S))
        lore = T.first_paragraph(body_md)
        effects = "\n".join(t.strip() for t in T.BACKTICK.findall(text))
        out.append(_entity(
            "pact", name, group="Pact", summary=flavor or lore, effects=effects,
            attrs={"invocation": flavor, "lore": lore, "body_md": body_md},
            raw="\n".join(lines[i:end]).strip(), source=source,
        ))
    return out


def handle_pacts(rel_path, raw, role, page):
    return _extract_pacts(raw, rel_path)


# ---- generic prefixed-catalog handler (driven by registry.CATALOG_SPECS) ----
PREFIX_RE = re.compile(r"^([A-Za-z][A-Za-z' -]{1,24})\s*:\s*\*\*")


def make_catalog_handler(role: str):
    """Build a handler for a CATALOG_SPECS entry — see registry.CATALOG_SPECS."""
    spec = CATALOG_SPECS[role]
    kind = spec["kind"]
    group_from = spec["group_from"]

    def handler(rel_path, raw, role_, page):
        out = []
        for r in _records(raw, role, rel_path):
            prefix = ""
            m = PREFIX_RE.match(r["raw"].lstrip())
            if m:
                prefix = m.group(1).strip()

            if group_from == "prefix":
                group = prefix or kind.replace("_", " ").title()
            elif group_from == "group":
                group = r["group"] or r["section"]
            elif group_from == "section":
                group = r["section"] or r["group"]
            else:
                group = group_from  # a literal label

            attrs = dict(r["attrs"])
            attrs.update(r["sublabels"])
            if spec.get("access_from_prefix") and prefix:
                # 'General Activity' / 'Exclusive Activity' -> who may use it
                attrs["access"] = prefix.split()[0].title() if " " in prefix else "General"
            if prefix:
                attrs["record_type"] = prefix

            # summary: flavor > a real lead sentence from description/effects >
            # the first sub-label's text (so sub-label-only records aren't blank).
            summary = r["flavor"] or _lead_from(r["description"], r["effects"],
                                                *r["sublabels"].values())

            # A damage type carries its own Injury Risk table as structured rows
            # ('- *8-12*: Minor| *Superficial Cut*: text `effect`'). Kept ON the
            # damage type rather than as 42 stub records — you look an injury up
            # by the damage that caused it.
            if kind == "damage_type":
                injuries = []
                for im in re.finditer(
                        r"^-\s*\*(?P<range>[^*]+)\*\s*:\s*(?P<sev>[^|]*?)\s*\|\s*\*(?P<iname>[^*]+)\*\s*:\s*(?P<body>.+?)\s*$",
                        r["raw"], re.M):
                    body = im.group("body")
                    injuries.append({
                        "roll": im.group("range").strip(),
                        "severity": T.strip_md(im.group("sev")).strip(" |") or "-",
                        "name": im.group("iname").strip(),
                        "text": T.strip_md(T.BACKTICK.sub(" ", body)).strip(),
                        "effect": "\n".join(t.strip() for t in T.BACKTICK.findall(body)),
                    })
                if injuries:
                    attrs["injuries"] = injuries
                    # the general rule is the backtick text OUTSIDE the injury
                    # rows — otherwise every row's effect repeats above the table
                    inj_effects = {i["effect"] for i in injuries if i["effect"]}
                    kept = [ln for ln in (r["effects"] or "").split("\n")
                            if ln.strip() and ln.strip() not in inj_effects]
                    r["effects"] = "\n".join(kept)

            out.append(_entity(
                kind, r["name"], group=group, section=r["section"],
                tier=_int(attrs.get("Tier")), summary=summary,
                effects=r["effects"] or r["description"],
                attrs=attrs | ({"description": r["description"]} if r["description"] else {}),
                raw=r["raw"], source=rel_path,
            ))
        return out

    return handler


# ---- weapon traits glossary + weapon group effects ---------------------
TRAIT_BULLET = re.compile(r"^-\s*\*\*(?P<name>[^*]+?)\*\*\s*:\s*(?P<desc>.+?)\s*$")


def extract_weapon_meta(rel_path, raw):
    """The Weaponry Traits glossary and each Weapon Group's Group Effects.
    Every weapon's `Traits` field references these, so they need to be lookups."""
    out = []
    # --- traits: '- **Vicious_x**: ...' bullets under '#### Weaponry Traits'
    sec = re.search(r"^#+\s*Weaponry Traits\s*$(?P<body>.*?)(?=^#{1,2}\s|\Z)", raw, re.M | re.S)
    if sec:
        lines = sec.group("body").split("\n")
        for i, line in enumerate(lines):
            m = TRAIT_BULLET.match(line)
            if not m:
                continue
            name = m.group("name").strip()
            desc = T.strip_md(m.group("desc")).strip()
            notes = []
            for nxt in lines[i + 1:]:
                if TRAIT_BULLET.match(nxt) or not nxt.strip():
                    break
                if re.match(r"^\s+[-*]", nxt):        # indented sub-note
                    notes.append(T.strip_md(nxt).strip().lstrip("-* "))
                else:
                    break
            out.append(_entity(
                "weapon_trait", name, group="Weapon Traits", summary=desc,
                effects=desc, attrs={"notes": "\n".join(notes)} if notes else {},
                raw=line.strip(), source=rel_path,
            ))
    # --- group effects: '#### Knives' ... '**Group Effects**: `...`'
    for m in re.finditer(
            r"^#+\s*(?P<name>[A-Za-z][A-Za-z '\-]{1,30})\s*$(?P<body>.*?)(?=^#|\Z)",
            raw, re.M | re.S):
        body = m.group("body")
        ge = re.search(r"\*\*Group Effects\*\*\s*:\s*(?P<eff>.+?)$", body, re.M)
        if not ge:
            continue
        name = m.group("name").strip()
        if name.lower().startswith("weaponry"):
            continue
        effect = "\n".join(t.strip() for t in T.BACKTICK.findall(ge.group("eff"))) \
            or T.strip_md(ge.group("eff")).strip()
        desc = T.first_paragraph(T.clean_body(body.split("**Group Effects**")[0]))
        out.append(_entity(
            "weapon_group", name, group="Weapon Groups", summary=desc, effects=effect,
            attrs={"description": desc}, raw=ge.group(0).strip(), source=rel_path,
        ))
    return out


# ---- Backgrounds -------------------------------------------------------
def handle_backgrounds(rel_path, raw, role, page):
    out = []
    sec = re.search(r"^#+\s*Backgrounds\s*$(?P<body>.*?)(?=^##\s|\Z)", raw, re.M | re.S)
    if not sec:
        return out
    for r in _records(sec.group("body"), "skills", rel_path):   # bold-name records
        if not any(k in r["attrs"] for k in ("Starting Wealth", "Contact Points")):
            continue
        desc = r["description"].strip()
        out.append(_entity(
            "background", r["name"], group="Background", summary=desc,
            effects=r["effects"], attrs=r["attrs"] | {"description": desc},
            raw=r["raw"], source=rel_path,
        ))
    return out


# ---- City zones (italic names with a threshold tier) -------------------
# 'Interior Structure 0: *Longhouse*', 'Corpus Zone 2: *Market*', 'Unit 3: *Levy*'
CITY_ZONE = re.compile(
    r"^(?:(?P<region>Interior|Corpus|Boundary|Exterior|Unique)\s+)?"
    r"(?P<cls>Structure|Zone|Unit)\s*(?P<tier>\d+)?\s*:\s*\*+(?P<name>[^*]+?)\*+\s*$")


def handle_cities(rel_path, raw, role, page):
    """a_Cities.md lists each Spoke's zones as `Interior Structure 0: *Longhouse*`
    (italic name + unlock threshold), unlike the bold outpost cards."""
    lines = raw.replace("\r\n", "\n").split("\n")
    spoke = ""
    starts = []
    for i, line in enumerate(lines):
        h = T.HEADING.match(line)
        if h:
            spoke = re.sub(r"^#+\s*", "", h.group(2)).strip()
            continue
        m = CITY_ZONE.match(line.strip())
        if m:
            starts.append((i, m, spoke))
    out = []
    for idx, (i, m, spoke) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(lines)
        block = []
        for k in range(i + 1, end):
            if T.HEADING.match(lines[k]):
                break
            block.append(lines[k])
        attrs, effects, desc = {}, [], []
        for bl in block:
            bl = T.close_backticks(bl)
            s = bl.strip()
            if not s or T.HR_NOISE.match(s):
                continue
            ticks = [t.strip() for t in T.BACKTICK.findall(bl)]
            plain = T.strip_md(T.BACKTICK.sub(" ", bl)).strip()
            if ticks and not plain:
                for t in ticks:
                    pairs = T.parse_plain_pairs(t.replace("/", "| "))
                    if pairs:
                        attrs.update(dict(pairs))
                    else:
                        effects.append(t)
                continue
            if plain:
                desc.append(plain)
            effects.extend(ticks)
        tier = m.group("tier")
        region = (m.group("region") or "").strip()
        cls = m.group("cls").strip()
        # a city's raisable troops are battle cards, not places
        kind = "battle_card" if cls == "Unit" else "city_zone"
        out.append(_entity(
            kind, m.group("name").strip(),
            group=("Unit" if kind == "battle_card" else (spoke or "City")),
            tier=_int(tier), summary=" ".join(desc)[:400],
            effects="\n".join(effects),
            attrs=attrs | {"class": (f"{region} {cls}".strip()), "region": region,
                           "spoke": spoke, "unlocks_at": tier or "",
                           "description": " ".join(desc)},
            raw="\n".join(lines[i:end]).strip(), source=rel_path,
        ))
    return out


# ---- the 10 core Skills (the spine every discipline/feat/activity references) --
def handle_skills(rel_path, raw, role, page):
    """Skills live under the '### Skills in Specific' heading as `**Name**` +
    a description paragraph + optional `- *X is a Principal Skill...*` bullet."""
    marker = re.search(r"^#{2,}\s*Skills in Specific\s*$", raw, re.M)
    if not marker:
        return []
    body = raw[marker.end():]
    out = []
    for r in _records(body, role, rel_path):
        desc = r["description"].strip()
        if len(desc) < 30:      # skip stray bold labels, keep real skill entries
            continue
        # the '- X is a Principal Skill used to…' bullet renders as its own
        # callout, so drop it from the prose description
        desc = re.sub(r"\s*-?\s*\b\w+ is a Principal Skill[^.]*\.\s*$", "", desc).strip()
        principal = bool(re.search(r"Principal Skill", r["raw"], re.I))
        attack = ""
        am = re.search(r"(Melee|Ranged) Attacks", r["raw"], re.I)
        if am:
            attack = am.group(1).title()
        out.append(_entity(
            "skill", r["name"], group="Skill", summary=desc,
            effects="", attrs={
                "description": desc,
                "principal": principal,
                "attack": attack,
            },
            raw=r["raw"], source=rel_path,
        ))
    return out


# ---- the kinds of Residue ---------------------------------------------
def handle_residue(rel_path, raw, role, page):
    out = []
    for r in _records(raw, role, rel_path):
        desc = r["description"].strip()
        if len(desc) < 20 and not r["effects"]:
            continue
        out.append(_entity(
            "residue", r["name"], group=r["group"] or "Residue",
            summary=desc, effects=r["effects"],
            attrs=r["attrs"] | {"description": desc},
            raw=r["raw"], source=rel_path,
        ))
    # Elemental Residues are an indented sub-catalog: `*Aether*| *Value*: ...`
    for m in re.finditer(
            r"^\s+\*(?P<name>[A-Z][A-Za-z]+)\*\s*\|\s*\*Value\*\s*:\s*(?P<value>.+?)$(?P<body>(?:\n(?!\s+\*[A-Z][A-Za-z]+\*\s*\|).*)*)",
            raw, re.M):
        name = m.group("name").strip()
        value = T.strip_md(m.group("value")).strip()
        body = m.group("body")
        effects = "\n".join(t.strip() for t in T.BACKTICK.findall(body))
        desc = T.first_paragraph(T.clean_body(T.BACKTICK.sub(" ", body)))
        out.append(_entity(
            "residue", f"{name} Residue", group="Elemental Residues",
            summary=desc, effects=effects,
            attrs={"Value": value, "aspect": name, "description": desc},
            raw=m.group(0).strip(), source=rel_path,
        ))
    return out


# ---- Resources (bullet catalogs with Bulk values) ----------------------
def handle_resources(rel_path, raw, role, page):
    out = []
    # general types: '- **Rare Metals**: Gold, Silver...' + a value table below
    values = {}
    vsec = re.search(r"\*\*Bulk Value\*\*(.*?)(?=\n\*\*|\Z)", raw, re.S)
    if vsec:
        for m in re.finditer(r"^-\s*\*\*(?P<n>[^*]+)\*\*\s*:\s*(?P<v>[\d,]+)\s*$", vsec.group(1), re.M):
            values[m.group("n").strip()] = m.group("v").strip()
    tsec = re.search(r"six general Types of Resource:(.*?)(?=\n\*\*|\Z)", raw, re.S)
    if tsec:
        for m in re.finditer(r"^-\s*\*\*(?P<n>[^*]+)\*\*\s*:\s*(?P<d>.+?)\s*$", tsec.group(1), re.M):
            name = m.group("n").strip()
            out.append(_entity(
                "resource", name, group="Resource Types",
                summary=T.strip_md(m.group("d")).strip(),
                attrs={"Value per Bulk": values.get(name, ""), "examples": T.strip_md(m.group("d")).strip()},
                raw=m.group(0).strip(), source=rel_path,
            ))
    # unique resources: '- **Caeline**: ...' followed by '  - *Value*: 1,600'
    usec = re.search(r"\*\*Unique Resources\*\*(.*)\Z", raw, re.S)
    if usec:
        for m in re.finditer(
                r"^-\s*\*\*(?P<n>[^*]+)\*\*\s*:\s*(?P<d>.+?)$(?P<body>(?:\n\s+-.*)*)",
                usec.group(1), re.M):
            name = m.group("n").strip()
            vm = re.search(r"\*Value\*\s*:\s*(.+?)\s*$", m.group("body") or "", re.M)
            out.append(_entity(
                "resource", name, group="Unique Resources",
                summary=T.strip_md(m.group("d")).strip(),
                attrs={"Value": T.strip_md(vm.group(1)).strip() if vm else "",
                       "description": T.strip_md(m.group("d")).strip()},
                raw=m.group(0).strip(), source=rel_path,
            ))
    return out


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
    "skills": handle_skills,
    "residue": handle_residue,
    "resources": handle_resources,
    "backgrounds": handle_backgrounds,
    "cities": handle_cities,
}
# generic prefixed catalogs (activities, ships, structures, battles, damage, fixations)
for _role in CATALOG_SPECS:
    HANDLERS[_role] = make_catalog_handler(_role)


SWEEP_ROLES = list(CATALOG_SPECS)  # prefixed catalogs can appear in ANY chapter


def parse_file(rel_path: str, raw: str) -> dict:
    """Return a page dict with its `records` populated.

    Two passes:
      1. the file's registered role handler (its primary content), then
      2. a SWEEP for every prefixed catalog (`Unit: **X**`, `General Activity: **X**`…)
         so records are found wherever the authors put them — activities live in
         discipline chapters, structures in both Cities and Building an Outpost —
         and so a future PHB that moves content still imports cleanly.
    """
    role, _desc = role_for(rel_path)
    page = build_page(rel_path, raw, role)
    records: list[dict] = []
    errors: list[str] = []

    handler = HANDLERS.get(role)
    if handler:
        try:
            records = handler(rel_path, raw, role, page)
        except Exception as exc:  # never let one file break the whole import
            errors.append(f"{role}: {type(exc).__name__}: {exc}")

    seen = {(r["kind"], r["name"].lower()) for r in records}
    for sweep_role in SWEEP_ROLES:
        if sweep_role == role:
            continue
        spec = CATALOG_SPECS[sweep_role]
        # cheap guard: only run the sweep when a prefix actually occurs in the file
        if not any(re.search(rf"^{p}\s*:\s*\*\*", raw, re.M | re.I) for p in spec["prefix_names"]):
            continue
        try:
            for rec in make_catalog_handler(sweep_role)(rel_path, raw, sweep_role, page):
                key = (rec["kind"], rec["name"].lower())
                if key not in seen:
                    seen.add(key)
                    records.append(rec)
        except Exception as exc:
            errors.append(f"sweep/{sweep_role}: {type(exc).__name__}: {exc}")

    page["records"] = records
    if errors:
        page["parse_error"] = "; ".join(errors)
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
