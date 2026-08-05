"""Text / markdown helpers shared by every parser.

The PHB is an Obsidian vault. It uses a consistent micro-format:
  * `**Name**`                     a record's bold name (sometimes prefixed:
                                   `Feat 1:`, `Rune 1:`, `Archetype:`, `Minor Condition:`)
  * `*Field*: value| *Field2*: v`  pipe-separated attribute pairs (italic key)
  * `` `text` ``                   backtick-wrapped RULES text (mechanical effect)
  * `*"quote"*`                    italic flavor quote
  * `*Label*` on its own line      a sub-section label (Limits, Counter-Action, ...)
  * `****` / `************`         Obsidian horizontal-rule noise (dropped)
"""
from __future__ import annotations

import re
import unicodedata

# ---- slugs -------------------------------------------------------------
_slug_strip = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    text = _slug_strip.sub("-", text.lower()).strip("-")
    return text or "x"


# ---- filename / heading titles ----------------------------------------
_file_prefix = re.compile(r"^[0-9a-zA-Z]{1,2}[_\-]")   # 'a_', 'b-', '1_', '10_'


def title_from_filename(name: str) -> str:
    """'b_Attacks, Damage, and Injuries.md' -> 'Attacks, Damage, and Injuries'."""
    stem = re.sub(r"\.md$", "", name, flags=re.I)
    stem = _file_prefix.sub("", stem)
    return stem.strip().replace("_", " ")


def order_from_filename(name: str) -> int | None:
    """Leading 'a_'/'b_'... -> 1/2..., '1_'/'2_' -> that number, else None."""
    m = re.match(r"^([0-9]+)[_\-]", name)
    if m:
        return int(m.group(1))
    m = re.match(r"^([a-z])[_\-]", name, flags=re.I)
    if m:
        return ord(m.group(1).lower()) - ord("a") + 1
    return None


def clean_folder_label(folder: str) -> str:
    return _file_prefix.sub("", folder).replace("_", " ").strip()


# ---- inline extraction -------------------------------------------------
BACKTICK = re.compile(r"`([^`]+)`")
QUOTE = re.compile(r'^\*"(.+?)"\*\s*$')
# one `*Key*: value` segment (value runs until a `|` pair-separator or line end)
ATTR_SEG = re.compile(r"^\s*\*([A-Za-z][A-Za-z 0-9/_\-]*?)\*\s*:\s*(.*)$")
BOLD_ONLY = re.compile(r"^\s*\*\*(.+?)\*\*\s*$")
ITALIC_LABEL = re.compile(r"^\s*\*([A-Za-z][A-Za-z 0-9/_\-']*?)\*\s*$")
HR_NOISE = re.compile(r"^\s*(\*{3,}|-{3,}|_{3,})\s*$")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")


def strip_md(s: str) -> str:
    """Remove **bold**/*italic*/`code` markers for a plain-text value."""
    s = BACKTICK.sub(r"\1", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = re.sub(r"\[\[([^\]|]+)\|?([^\]]*)\]\]", lambda m: (m.group(2) or m.group(1)), s)  # wikilinks
    return s.strip()


def parse_attr_line(line: str) -> list[tuple[str, str]]:
    """`*Tier*: 3| *Cost*: 10,000` -> [('Tier','3'), ('Cost','10,000')].

    Splits on the pipe pair-separator, then matches each segment. Segments that
    are not `*key*: value` shaped are ignored (handled elsewhere).
    """
    pairs: list[tuple[str, str]] = []
    for seg in line.split("|"):
        m = ATTR_SEG.match(seg)
        if m:
            key = m.group(1).strip()
            val = strip_md(m.group(2)).strip().rstrip("|").strip()
            pairs.append((key, val))
    return pairs


def close_backticks(line: str) -> str:
    """Repair an unterminated backtick (a recurring typo in this hand-authored
    vault — 11 such lines in v17). Without this the opening tick leaks into the
    rendered text and the rules text is lost. An odd count means the last tick
    was meant to close at end-of-line."""
    if line.count("`") % 2 == 1:
        return line.rstrip() + "`"
    return line


def looks_like_attr_line(line: str) -> bool:
    return bool(ATTR_SEG.match(line.split("|")[0]))


# `Tier: 1| Durability: 3` — the stat form used inside backticks by ships,
# structures, battle units... (plain `Key: value` pairs, no italic markers).
PLAIN_PAIR = re.compile(r"^\s*([A-Za-z][A-Za-z 0-9/_\-]*?)\s*:\s*(.+?)\s*$")


def parse_plain_pairs(text: str) -> list[tuple[str, str]]:
    """Parse `Key: val| Key2: val2`. Returns [] unless EVERY non-empty segment
    is a Key: value pair, so prose sentences containing a colon aren't eaten."""
    segs = [s for s in str(text).split("|") if s.strip()]
    if not segs:
        return []
    pairs = []
    for seg in segs:
        m = PLAIN_PAIR.match(seg)
        if not m:
            return []
        key = m.group(1).strip()
        val = strip_md(m.group(2)).strip()
        # a real stat key is short and not a sentence
        if len(key) > 24 or " " in key.strip() and len(key.split()) > 3:
            return []
        pairs.append((key, val))
    return pairs


def first_paragraph(body: str) -> str:
    """First real prose paragraph as a summary (plain text, markdown stripped).

    Skips leading heading / horizontal-rule lines even when a heading is glued to
    the paragraph without a blank line, so summaries never leak `##` / `-` markers.
    """
    for block in re.split(r"\n\s*\n", body):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        while lines and (HR_NOISE.match(lines[0]) or re.match(r"^#{1,6}\s", lines[0])):
            lines.pop(0)
        if not lines:
            continue
        joined = " ".join(re.sub(r"^(#{1,6}|[-*+])\s+", "", l) for l in lines)
        txt = strip_md(joined).strip()
        if len(txt) >= 15:
            return txt[:400]
    return ""


def clean_body(raw: str) -> str:
    """Light cleanup for the page body: drop Obsidian `****` HR noise, trim.

    Kept intentionally conservative — we preserve the author's wording and
    structure so prose pages render faithfully.
    """
    out = []
    for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if HR_NOISE.match(line):
            continue
        out.append(line.rstrip())
    text = "\n".join(out)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text
