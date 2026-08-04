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

# ---- file -> role ------------------------------------------------------
# (glob, role, human description for DATA_MAP)
FILE_RULES: list[tuple[str, str, str]] = [
    ("4_Disciplines/b_Feats/*/*.md", "discipline", "A Discipline: its Passive Effects + tiered Feats/Prayers/Runes"),
    ("1_Making Characters/b_Archetypes.md", "archetypes", "The 6 Archetypes (skill-pair, granted Feat, Panic Responses)"),
    ("5_Equipment/b_Weapons.md", "weapons", "Weapons (by Group) + Weapon Traits + Unique Materials"),
    ("5_Equipment/c_Armor and Shields.md", "armor", "Armor & Shields + Unique Materials"),
    ("3_Playing the Game/f_Conditions.md", "conditions", "Conditions grouped by Severity"),
    ("3_Playing the Game/a_Actions.md", "actions", "Actions grouped by type (Movement/Primary/...)"),
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
    "page": [],
}


def role_for(rel_path: str) -> tuple[str, str]:
    """Return (role, description) for a source path (posix, relative to version root)."""
    for glob, role, desc in FILE_RULES:
        if fnmatchcase(rel_path, glob):
            return role, desc
    return "page", "Prose page"
