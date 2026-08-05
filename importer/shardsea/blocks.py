"""Generic record-block parser.

Every catalog file in the PHB is a sequence of *record blocks* that share one
grammar (see text.py). This module splits a file into blocks (driven by a small
list of name-line patterns) and parses each block into a structured dict. Because
attributes are captured generically into `attrs`, a new or renamed `*Field*` in a
future PHB version is picked up with ZERO code changes — that is what makes the
importer adaptive to "fundamental changes".
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import text as T


@dataclass
class RecordPattern:
    """A name-line matcher. `regex` must expose a 'name' group; 'num' optional."""
    kind: str
    regex: re.Pattern


@dataclass
class Block:
    kind: str
    name: str
    group: str
    num: int | None
    start: int
    section: str = ""          # nearest heading of level <= 2 (e.g. 'Melee Weapons')
    extra: dict = field(default_factory=dict)   # extra named groups from the pattern
    lines: list[str] = field(default_factory=list)

    def raw(self, header_line: str) -> str:
        return "\n".join([header_line] + self.lines).strip()


def split_blocks(raw: str, patterns: list[RecordPattern]) -> list[tuple[Block, str]]:
    """Walk the file; return [(Block, header_line)] for each detected record.

    A record starts at any line matching a pattern and runs until the next record
    start or the next `##`+ heading. Headings update the running `group` label.
    """
    lines = raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    current_group = ""
    current_section = ""
    blocks: list[tuple[Block, str]] = []
    cur: Block | None = None
    cur_header = ""

    for i, line in enumerate(lines):
        h = T.HEADING.match(line)
        if h:
            level = len(h.group(1))
            # tolerate messy source like `#### #### Reactions` (stray leading hashes)
            label = re.sub(r"^#+\s*", "", h.group(2)).strip()
            if level <= 2:
                current_section = label
                current_group = ""     # a new top-level section resets the sub-group
            else:
                current_group = label
            cur = None  # a heading closes any open record
            continue

        matched = None
        for pat in patterns:
            m = pat.regex.match(line)
            if m:
                matched = (pat, m)
                break

        if matched:
            pat, m = matched
            gd = m.groupdict()
            num = None
            if gd.get("num"):
                try:
                    num = int(gd["num"])
                except ValueError:
                    num = None
            extra = {k: v for k, v in gd.items() if k not in ("name", "num") and v}
            cur = Block(
                kind=pat.kind,
                name=T.strip_md(gd["name"]).strip(),
                group=current_group,
                num=num,
                start=i,
                section=current_section,
                extra=extra,
            )
            cur_header = line
            blocks.append((cur, cur_header))
            continue

        if cur is not None:
            cur.lines.append(line)

    return blocks


def parse_block(block: Block, header_line: str) -> dict:
    """Turn a Block's lines into structured fields.

    Returns keys: name, kind, group, num, attrs(dict), flavor, description,
    effects, sublabels(dict), raw.
    """
    attrs: dict[str, str] = {}
    flavor = ""
    description: list[str] = []
    effects: list[str] = []
    sublabels: dict[str, list[str]] = {}
    cur_label: str | None = None

    for raw_line in block.lines:
        line = T.close_backticks(raw_line)   # tolerate unterminated-backtick typos
        s = line.strip()
        if not s or T.HR_NOISE.match(s):
            continue

        q = T.QUOTE.match(s)
        if q:
            if not flavor:
                flavor = q.group(1).strip()
            continue

        # attribute line (`*Key*: val| *Key2*: val`) — only if it truly has pairs
        if T.looks_like_attr_line(s):
            for k, v in T.parse_attr_line(s):
                attrs[k] = v
            continue

        # a lone italic label opens a sub-section (Limits, Counter-Action, ...)
        lbl = T.ITALIC_LABEL.match(s)
        if lbl and not T.BACKTICK.search(s):
            cur_label = lbl.group(1).strip()
            sublabels.setdefault(cur_label, [])
            continue

        # content line: split backtick rules text from plain prose
        ticks = [t.strip() for t in T.BACKTICK.findall(line)]
        plain = T.strip_md(T.BACKTICK.sub(" ", line)).strip()

        # Ships / structures / battle units put their STATS inside backticks as
        # `Tier: 1| Durability: 3`. Those are attributes, not rules text.
        if ticks and not plain and cur_label is None:
            stat_pairs: list[tuple[str, str]] = []
            all_stats = True
            for t in ticks:
                p = T.parse_plain_pairs(t)
                if p:
                    stat_pairs.extend(p)
                else:
                    all_stats = False
            if all_stats and stat_pairs:
                for k, v in stat_pairs:
                    attrs.setdefault(k, v)
                continue

        bucket_text: list[str] = []
        if ticks:
            bucket_text.extend(ticks)
        if plain:
            bucket_text.append(plain)
        if not bucket_text:
            continue

        if cur_label is not None:
            sublabels[cur_label].extend(bucket_text)
        else:
            if ticks:
                effects.extend(ticks)
            if plain:
                description.append(plain)

    return {
        "name": block.name,
        "kind": block.kind,
        "group": block.group,
        "section": block.section,
        "extra": block.extra,
        "num": block.num,
        "attrs": attrs,
        "flavor": flavor,
        "description": "\n".join(description).strip(),
        "effects": "\n".join(effects).strip(),
        "sublabels": {k: "\n".join(v).strip() for k, v in sublabels.items() if v},
        "raw": block.raw(header_line),
    }
