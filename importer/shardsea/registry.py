"""The registry: WHERE DATA LIVES.

One table maps each source file (by glob, first match wins) to a *role* — the
parser that understands it. This is the single place to look to answer "which
file produces which records", and it drives the generated DATA_MAP.md. When a new
PHB version moves or adds files, adjust the globs here and nothing else.
"""
from __future__ import annotations

import re
from fnmatch import fnmatchcase

from .blocks import RecordPattern

# ---- record name-line patterns (see blocks.py) ------------------------
P_FEAT = RecordPattern("feat", re.compile(r"^Feat\s+(?P<num>\d+)\s*:\s*\*\*(?P<name>.+?)\*\*"))
P_PRAYER = RecordPattern("feat", re.compile(r"^Prayer\s+(?P<num>\d+)\s*:\s*\*\*(?P<name>.+?)\*\*"))
P_RUNE = RecordPattern("rune", re.compile(r"^Rune\s+(?P<num>\d+)\s*:\s*\*\*(?P<name>.+?)\*\*"))
P_ARCHETYPE = RecordPattern("archetype", re.compile(r"^Archetype\s*:\s*\*\*(?P<name>.+?)\*\*"))
P_CONDITION = RecordPattern("condition", re.compile(r"^(?:Minor|Moderate|Major|Exceptional)\s+[Cc]ondition\s*:\s*\*\*(?P<name>.+?)\*\*"))
# exceptional conditions are written as inline bullets: `- **Unconscious**: desc`
P_COND_BULLET = RecordPattern("condition", re.compile(r"^-\s*\*\*(?P<name>[^*]+?)\*\*\s*:\s*(?P<rest>.+)$"))
P_ACTION = RecordPattern("action", re.compile(r"^\*{0,2}\s*AP\*{0,2}\s*:\s*(?P<ap>[^|]+?)\s*\|\s*\*\*(?P<name>.+?)\*\*"))
# bare bold name on its own line — used for item catalogs, then filtered by attrs
P_ITEM = RecordPattern("item", re.compile(r"^\*\*(?P<name>[^*].*?)\*\*\s*$"))
# `- *Caeline*| *Multipier*: ...` bullet materials
P_MATERIAL = RecordPattern("material", re.compile(r"^-\s*\*(?P<name>[^*]+?)\*\s*\|\s*\*Multip"))

# ---- generic prefixed-record catalogs ---------------------------------
# Most of the book's catalogs share one shape: `<Prefix>: **Name**` followed by
# attribute lines (italic `*Key*: v` or backtick `Key: v| Key2: v`), a flavor
# quote, backtick rules text and `*Sub-Label*` blocks. Declaring one here is all
# it takes to make a new record kind — no new handler code.
#
#   role      : the registry role name (also used in FILE_RULES below)
#   kind      : entity kind emitted
#   prefixes  : the `<Prefix>:` tokens that start a record (regex-escaped)
#   group_from: 'section' (nearest ##) | 'group' (nearest ####) | a literal string
def prefixed(name: str) -> re.Pattern:
    return re.compile(rf"^{name}\s*:\s*\*\*(?P<name>.+?)\*\*", re.I)


CATALOG_SPECS: dict[str, dict] = {
    "activities": {
        "kind": "activity",
        # 'General Activity: **X**' / 'Exclusive Activity: **X**' (+ stray 'Activity:')
        "prefixes": [r"(?:General|Exclusive)\s+Activity", r"Activity"],
        "group_from": "group",     # #### <Skill>
        "access_from_prefix": True,  # General vs Exclusive
    },
    "ships": {
        "kind": "ship",
        "prefixes": [r"Ship", r"Ship Weapon", r"Ship Expansion", r"Crew Card", r"Ship Action"],
        "group_from": "prefix",    # the prefix itself is the sub-category
    },
    "structures": {
        # Outpost/city buildings. Supplement & Emplacement Cards are outpost
        # constructions too (they live in Building an Outpost), NOT battle cards.
        "kind": "structure",
        "prefixes": [r"Structure", r"Exterior Structure", r"Interior Structure",
                     r"Unique Structure", r"Supplement Card", r"Emplacement Card"],
        "group_from": "prefix",
    },
    "battles": {
        "kind": "battle_card",
        "prefixes": [r"Unit", r"Commander"],
        "group_from": "prefix",
    },
    "thresholds": {
        "kind": "threshold_feat",
        # 'Threshold 6: **Power Attack**| Ability Bonus: `Begins at +1`'
        "prefixes": [r"Threshold\s+\d+"],
        "group_from": "group",   # #### Body / Mind / Reflex
    },
    "damage": {
        "kind": "damage_type",
        "prefixes": [r"Physical Damage", r"Energy Damage"],
        "group_from": "prefix",
    },
    "fixations": {
        "kind": "fixation",
        "prefixes": [r"Fixation"],
        "group_from": "Fixation",
    },
}

# Longest prefix first so 'Ship Weapon:' isn't swallowed by 'Ship:'.
for _spec in CATALOG_SPECS.values():
    _spec["patterns"] = [
        RecordPattern(_spec["kind"], prefixed(p))
        for p in sorted(_spec["prefixes"], key=len, reverse=True)
    ]
    _spec["prefix_names"] = sorted(_spec["prefixes"], key=len, reverse=True)


# ---- file -> role ------------------------------------------------------
# (glob, role, human description for DATA_MAP)
FILE_RULES: list[tuple[str, str, str]] = [
    ("4_Disciplines/b_Feats/*/*.md", "discipline", "A Discipline: its Passive Effects + tiered Feats/Prayers/Runes"),
    ("1_Making Characters/b_Archetypes.md", "archetypes", "The 6 Archetypes (skill-pair, granted Feat, Panic Responses)"),
    ("5_Equipment/b_Weapons.md", "weapons", "Weapons (by Group) + Weapon Traits + Unique Materials"),
    ("5_Equipment/c_Armor and Shields.md", "armor", "Armor & Shields + Unique Materials"),
    ("3_Playing the Game/f_Conditions.md", "conditions", "Conditions grouped by Severity"),
    ("3_Playing the Game/a_Actions.md", "actions", "Actions grouped by type (Movement/Primary/...)"),
    ("5_Equipment/g_Artifice and Magic Items.md", "artifice", "Artifice items, automata & augmentations"),
    ("5_Equipment/d_Consumables.md", "consumables", "Consumables (alcohols, tonics, poisons...)"),
    ("Appendix/d_Rituals.md", "rituals", "Arcane rituals (Runes / Reagents / Time / effect)"),
    ("Appendix/f_Rare Pacts.md", "pacts", "Rare demonic pacts (bindings)"),
    ("1_Making Characters/d_Activities and Time.md", "activities", "Skill Activities (General/Exclusive), grouped by Skill"),
    ("1_Making Characters/e_Tests and Skills.md", "skills", "The 10 core Skills + the Test/Coin-Flip rules"),
    ("5_Equipment/h_Ships.md", "ships", "Ship cards, ship weapons, expansions, crew & ship actions"),
    ("5_Equipment/e_Resources.md", "resources", "Resource types & unique resources (with Bulk values)"),
    ("5_Equipment/f_The Kinds of Residue.md", "residue", "The kinds of Residue (artificial, natural, elemental)"),
    ("6_Cities, Battles, and Outposts/e_Structures.md", "structures", "Outpost/city structures & institutions"),
    ("6_Cities, Battles, and Outposts/b_Battles.md", "battles", "Battle cards: units, commanders, supplements"),
    ("2_Survival/b_Attacks, Damage, and Injuries.md", "damage", "Damage types with their injury tables"),
    ("2_Survival/c_Panic, Corruption, and Fixations.md", "fixations", "Fixations (corruption-driven psyche states)"),
    ("1_Making Characters/c_Backgrounds and Contacts.md", "backgrounds", "Backgrounds (starting wealth, contacts, environment)"),
    ("6_Cities, Battles, and Outposts/a_Cities.md", "cities", "City zones & structures by Spoke of Civilization"),
    ("*", "page", "Prose rules / lore page (rendered faithfully; no record extraction)"),
]

# role -> the record patterns its parser feeds to the block splitter
ROLE_PATTERNS: dict[str, list[RecordPattern]] = {
    "discipline": [P_FEAT, P_PRAYER, P_RUNE],
    "archetypes": [P_ARCHETYPE],
    "weapons": [P_ITEM, P_MATERIAL],
    "armor": [P_ITEM, P_MATERIAL],
    "conditions": [P_CONDITION, P_COND_BULLET],
    "actions": [P_ACTION],
    "rituals": [P_ITEM],
    "consumables": [P_ITEM],
    "artifice": [],   # dedicated handler (italic-name lookahead)
    "pacts": [],      # dedicated handler (#### heading records)
    "skills": [P_ITEM],       # the 10 Skills are bold-name records
    "residue": [P_ITEM],      # residue kinds are bold-name records
    "backgrounds": [P_ITEM],  # bold-name records with Starting Wealth
    "resources": [],          # dedicated handler (bullet lists)
    "cities": [],             # dedicated handler (italic names + thresholds)
    "page": [],
}
# generic prefixed catalogs get their patterns from CATALOG_SPECS
for _role, _spec in CATALOG_SPECS.items():
    ROLE_PATTERNS[_role] = _spec["patterns"]


def role_for(rel_path: str) -> tuple[str, str]:
    """Return (role, description) for a source path (posix, relative to version root)."""
    for glob, role, desc in FILE_RULES:
        if fnmatchcase(rel_path, glob):
            return role, desc
    return "page", "Prose page"
