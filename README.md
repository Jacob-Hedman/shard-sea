# Shard-sea Codex

A browsable reference database + wiki for **Kriegsmesser**, the tabletop RPG set in
the **Shard-sea** (working titles; the book also calls the system "Shards of Life").
The game is an evolving work-in-progress, so this project is built around **importing
new Player's Handbook versions easily** and showing a **detailed, readable changelog**
of what changed each version.

Three parts, one repo:

1. **`importer/`** — a Python tool that parses a PHB (an Obsidian markdown vault) into
   `shardsea.db` and computes the changelog vs the previous version.
2. **`shardsea.db`** — the SQLite database (small; committed, no Git LFS).
3. **`site/`** — an Astro wiki that renders the DB (same look/feel as the D&D 3.5 Codex),
   deployed privately to Cloudflare Pages. *(added in a follow-up milestone)*

## Quick start — import a PHB version

```bash
# dry-run: parse and report, write nothing
python importer/import.py --version v17 --dry-run

# real import: (re)build shardsea.db from sources/phb/v17 and refresh DATA_MAP.md
python importer/import.py --version v17
```

To import a **new** version, drop its vault under `sources/phb/<version>/` and run
`python importer/import.py --version <version>`. The DB always reflects the newest
import (latest-wins); the changelog (`snapshot` + `change_entry` tables) records the
exact differences from the previous version.

## Where the data lives

See **[DATA_MAP.md](DATA_MAP.md)** (auto-generated) for the file→role→table mapping,
and **[DESIGN.md](DESIGN.md)** for the data-model rationale. In short:

- Every source `.md` becomes a **`page`** (faithful prose; verbatim `raw_md`).
- Catalog files also produce typed **records** in **`entity`** (the flexible core:
  `attrs_json` holds every parsed field so new/renamed fields need no migration),
  promoted into rigid tables (`feat`, `discipline`, `weapon`, `armor`, `archetype`,
  `condition`, `game_action`) for clean queries.

## Layout

```
importer/
  import.py              # CLI entry point
  shardsea/
    registry.py          # WHERE DATA LIVES: file glob -> role -> record patterns
    blocks.py            # generic record-block parser (the adaptive core)
    parse.py             # per-role handlers + typed-field promotion
    changelog.py         # snapshot + version diff engine
    db.py                # schema init, latest-wins reset, stable-slug writers
    text.py, datamap.py  # helpers / DATA_MAP generator
schema.sql               # the hybrid SQLite schema
sources/phb/<version>/   # vendored PHB vaults (import inputs)
shardsea.db              # generated database
DATA_MAP.md              # generated: where each file's data ends up
DESIGN.md                # architecture + data-model rationale
```

## Requirements

- Python 3.10+ (standard library only — no third-party packages).
