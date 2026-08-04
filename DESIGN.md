# Design & data model

## Goals (from the brief)

1. **Adapt to change.** The game is a WIP that changes often, sometimes fundamentally.
   The schema and importer must absorb new/renamed fields and restructured content
   without a rewrite each time.
2. **Easy to identify where data lives.** One obvious place maps every source file to
   what it produces (`importer/shardsea/registry.py` → generated `DATA_MAP.md`).
3. **Detailed, readable changelog.** The site shows the latest version, but every import
   records the *exact* differences from the previous version in plain language.
4. **Import new PHB versions easily.** One command; the parser is resilient to the
   messy realities of a hand-authored Obsidian vault.

## The source

Each PHB version is an **Obsidian markdown vault** (`sources/phb/<version>/`). It uses a
consistent micro-format that the whole importer keys on:

| Element | Looks like | Meaning |
|---|---|---|
| Record name | `**Name**`, `Feat 1: **Name**`, `Rune 1: **Name**`, `Archetype: **Name**` | starts a record block |
| Attributes | `*Tier*: 3\| *Cost*: 10,000` | pipe-separated `*key*: value` pairs |
| Rules text | `` `You Maneuver plus your Tumble...` `` | mechanical effect |
| Flavor | `*"In the wind"*` | italic quote |
| Sub-section | `*Limits*` on its own line | labeled sub-block (Limits, Counter-Action, ...) |

## Hybrid schema (chosen decision)

A **flexible core** + a few **rigid typed tables**:

- **`page`** — one row per source file. Prose chapters render from `body_md`; every file
  keeps a verbatim `raw_md`, so nothing is ever lost even if a parser misses structure.
- **`entity`** — one row per extracted record (a Feat, Weapon, Rune, ...). The adaptive
  part is **`attrs_json`**, which stores *every* parsed `*key*: value` pair. A future PHB
  that adds `*Overload*: 3` to weapons needs **zero** code or schema changes — it just
  appears in `attrs_json` (and on the page). Common fields (`tier`, `summary`, `effects`)
  are promoted to columns for convenience.
- **Typed tables** (`feat`, `discipline`, `weapon`, `armor`, `archetype`, `condition`,
  `game_action`) promote the *stable, frequently-queried* fields for clean joins and the
  website's detail pages. When one of these changes shape, only its promotion (one handler
  in `parse.py`) and table changes — the core keeps working meanwhile.

Why hybrid and not fully rigid: a rigid-only schema means every fundamental game change is
a migration + parser rewrite. Why not fully flexible: pure key/value is awkward to query
and style. The hybrid keeps the adaptivity where change happens and the structure where
it pays off.

## The parser is generic on purpose

`blocks.py` splits any file into record blocks driven by a small list of name-line
**patterns**, and parses each block generically (attrs, flavor, effects, sub-labels).
Per-file behavior is declared in `registry.py` (glob → role → patterns). Adding a new
record type is: add one regex + one registry line + (optionally) one promotion handler.
The parser is deliberately tolerant of messy source (e.g. it recovers from a stray
`#### #### Reactions` double-heading), and any single file that fails to parse degrades to
"just a page" rather than breaking the import.

## Latest-wins + changelog

The content tables are rebuilt on every import, so the DB (and site) always show the
newest version. History needed for the changelog lives separately:

- **`snapshot`** — a canonical field map of every entity, per version (all versions kept;
  tiny). This is what diffs are computed against.
- **`change_entry`** — the computed diff for each version: `added` / `removed` /
  `modified` rows, with field-level `old_value → new_value` and a human-readable
  `summary` (e.g. *“Kiering: Cost changed from ‘10,000’ to ‘12,500’.”*). The first import
  emits a compact `baseline` summary instead of an "added" row per entity.

The website renders `change_entry` as a rich per-version changelog.

## Versioning workflow

```
sources/phb/v17/  ->  python importer/import.py --version v17   (baseline)
sources/phb/v18/  ->  python importer/import.py --version v18   (diff vs v17)
```

Slugs are derived deterministically from names (disambiguated by discipline/group), so an
entity keeps the same slug across versions and the diff tracks it correctly.
