-- Shard-sea Codex — SQLite schema (HYBRID model)
-- =================================================
-- Design goal: the game ("Kriegsmesser", setting "Shard-sea") changes often and
-- sometimes fundamentally. So the schema is a HYBRID:
--   * a flexible CORE (`page` + `entity`) that survives fundamental changes because
--     every parsed field lands in `entity.attrs_json` and the verbatim source is kept
--     in `raw_md` — no migration needed when the book adds/renames a field.
--   * a few RIGID typed tables (`feat`, `discipline`, `weapon`, `armor`, `archetype`,
--     `condition`, `game_action`) that PROMOTE the stable, frequently-queried fields
--     for clean joins and the website's detail pages.
-- Latest-wins: an import wipes content tables and repopulates. History for the
-- *changelog* is preserved separately in `snapshot` + `change_entry` (see changelog.py).

PRAGMA foreign_keys = ON;

-- ---------- provenance ----------
CREATE TABLE IF NOT EXISTS import_run (
  id          INTEGER PRIMARY KEY,
  version     TEXT NOT NULL,            -- e.g. 'v17'
  imported_at TEXT NOT NULL,            -- ISO-8601
  source_hash TEXT,                     -- sha256 over the source tree
  is_current  INTEGER NOT NULL DEFAULT 0,
  page_count  INTEGER DEFAULT 0,
  entity_count INTEGER DEFAULT 0,
  notes       TEXT
);

-- ---------- flexible core ----------
-- One row per source .md file. Prose chapters render from `body_md`; catalog files
-- also spawn `entity` records. Nothing is ever lost: `raw_md` is verbatim.
CREATE TABLE IF NOT EXISTS page (
  id            INTEGER PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  chapter       TEXT,                   -- cleaned folder label, e.g. 'Disciplines'
  chapter_no    INTEGER,               -- from folder prefix '4_'
  section_order INTEGER,               -- from file prefix 'a_'/'b_' -> 1,2,...
  role          TEXT NOT NULL,          -- registry role that parsed it
  source_path   TEXT NOT NULL,          -- path relative to the version source root
  summary       TEXT,                   -- first meaningful paragraph
  body_md       TEXT NOT NULL,          -- cleaned markdown (full file)
  raw_md        TEXT NOT NULL,          -- verbatim file contents
  record_count  INTEGER NOT NULL DEFAULT 0
);

-- Every extracted record (a Feat, Weapon, Archetype, Condition, Rune, ...).
-- The adaptive part: attrs_json holds ALL parsed `*key*: value` pairs + sub-labels,
-- so new/renamed fields need zero schema change.
CREATE TABLE IF NOT EXISTS entity (
  id           INTEGER PRIMARY KEY,
  kind         TEXT NOT NULL,           -- feat|discipline|archetype|weapon|armor|shield|condition|action|rune|material|...
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  page_id      INTEGER REFERENCES page(id),
  group_name   TEXT,                    -- the '#### <Group>' the record sat under
  tier         INTEGER,                 -- promoted common field where present
  summary      TEXT,                    -- flavor / lead line
  effects      TEXT,                    -- concatenated rules (backtick) text
  attrs_json   TEXT NOT NULL DEFAULT '{}',
  raw_md       TEXT NOT NULL,
  source_path  TEXT NOT NULL,
  UNIQUE(kind, slug)
);
CREATE INDEX IF NOT EXISTS idx_entity_kind  ON entity(kind);
CREATE INDEX IF NOT EXISTS idx_entity_page  ON entity(page_id);
CREATE INDEX IF NOT EXISTS idx_entity_group ON entity(kind, group_name);

-- ---------- rigid typed catalogs ----------
CREATE TABLE IF NOT EXISTS discipline (
  entity_id   INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  skill       TEXT,                    -- governing Skill (folder)
  skill_no    INTEGER,
  passive     TEXT,                    -- Passive Effects text
  feat_count  INTEGER DEFAULT 0,
  is_special  INTEGER DEFAULT 0        -- has sub-systems (runes/pacts/prayers)
);

CREATE TABLE IF NOT EXISTS feat (
  entity_id       INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  discipline_slug TEXT,
  discipline_name TEXT,
  skill           TEXT,
  feat_tier       INTEGER,             -- the 'Feat N' number
  ap              TEXT,
  qualities       TEXT,
  flavor          TEXT,
  effect          TEXT,
  limits          TEXT
);
CREATE INDEX IF NOT EXISTS idx_feat_disc ON feat(discipline_slug);

CREATE TABLE IF NOT EXISTS weapon (
  entity_id    INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  weapon_group TEXT,
  mode         TEXT,                   -- Melee|Ranged (best-effort)
  tier         INTEGER,
  cost         TEXT,
  accuracy     TEXT,
  bulk         TEXT,
  durable      TEXT,
  traits       TEXT,
  special      TEXT
);

CREATE TABLE IF NOT EXISTS armor (
  entity_id        INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  armor_kind       TEXT,               -- Armor|Shield
  tier             INTEGER,
  cost             TEXT,
  bulk             TEXT,
  durability       TEXT,
  movement_penalty TEXT,
  resources        TEXT,
  rating           TEXT,
  special          TEXT
);

CREATE TABLE IF NOT EXISTS archetype (
  entity_id      INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  skills         TEXT,
  feat_name      TEXT,
  feat_effect    TEXT,
  quote          TEXT,
  panic_response TEXT,
  panic_json     TEXT                  -- {Clear:..., Dark:..., Morbid:...}
);

CREATE TABLE IF NOT EXISTS condition (
  entity_id  INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  severity   TEXT,
  effect     TEXT,
  extra_json TEXT
);

CREATE TABLE IF NOT EXISTS game_action (
  entity_id   INTEGER PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  action_type TEXT,                    -- Movement|Primary|Reaction|... (from group)
  ap          TEXT,
  effect      TEXT,
  extra_json  TEXT
);

-- ---------- changelog (history kept only here) ----------
-- Canonical state of every entity per version. Tiny; all versions retained so the
-- diff for any version pair can be (re)generated and the changelog is auditable.
CREATE TABLE IF NOT EXISTS snapshot (
  id             INTEGER PRIMARY KEY,
  version        TEXT NOT NULL,
  kind           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  canonical_json TEXT NOT NULL,        -- field map used for field-level diffs
  sig            TEXT NOT NULL,        -- sha256 of canonical_json
  UNIQUE(version, kind, slug)
);
CREATE INDEX IF NOT EXISTS idx_snapshot_ver ON snapshot(version);

CREATE TABLE IF NOT EXISTS change_entry (
  id           INTEGER PRIMARY KEY,
  version_from TEXT,
  version_to   TEXT NOT NULL,
  kind         TEXT NOT NULL,
  slug         TEXT,
  name         TEXT,
  change_type  TEXT NOT NULL,          -- added|removed|modified|baseline
  field        TEXT,                   -- for 'modified': which field changed
  old_value    TEXT,
  new_value    TEXT,
  summary      TEXT,                   -- human-readable one-liner
  seq          INTEGER                 -- ordering within a version
);
CREATE INDEX IF NOT EXISTS idx_change_ver ON change_entry(version_to);
