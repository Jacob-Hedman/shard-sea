# Character Builder — Plan

A plan for letting the playtest group **build, save and share characters** on the
Shard-sea Codex. Derived from the group's Google Sheet character sheet
(`MAIN` / `TEMPLATES` / `ADVANCEMENT` tabs) cross-referenced with the PHB rules
already in the database.

The guiding requirement: **every field that is calculated from your stats, strain,
armor, etc. must always make its formula obvious.** That shapes the whole design —
the character math is written once as pure functions that return *both the number
and its breakdown*, and the UI shows the breakdown everywhere.

---

## 1. What the sheet does (analysis)

### 1a. `MAIN` — the live character sheet

**Identity**
- Name, **Tier**, **Strain** (current, live-play value)

**Abilities** — Body, Mind, Reflex, each with:
- `Base` (entered), `Bonus` (entered manual adjustment)
- **`Adjusted = Base − Strain + Bonus`**  → strain lowers *every* ability at once
- **`Ability Bonus`** (threshold): from the Base value — `6 → +1, 12 → +2, 18 → +3`
  *(the sheet's note reads `18: +2`; the PHB `f_Ability Thresholds` says `+3`. Flagged as a decision — the DB/PHB is treated as authoritative.)*

**Derived secondary values**
| Field | Formula (from the sheet) |
|---|---|
| **Movement** | `Adjusted Reflex (+ move bonus)` |
| **DT** (Damage/Injury Threshold) | `Adjusted Body + Armor DT+ (+ bonus)` |
| **Scrapes** (injury tiers) | Minor `> DT` · Moderate `DT+10` · Major `DT+20` · Lethal/Incap `DT+30` |
| **ST** (Strain/Stress Threshold) | `Adjusted Mind + 3 (+ bonus)` |
| **Shakes** (strain tiers) | Minor `> ST` · Moderate `ST+10` · Major `ST+20` · Lethal `ST+30` |
| **Corruption** | tracked value (drives the Panic scale, PHB) |
| **Max Encumbrance** | `3 × Adjusted Body` |
| **Carried / Penalty** | `Σ item Bulk`; penalty `= max(0, carried − maxEnc)` (over-encumbrance cuts Movement & Initiative) |

**Skills** (all ten) — each has a `rank` (entered) and shows its governing
**Ability Bonus** (`(+n)`). Governing ability per PHB:
- Body → Vitality, Traversal, Unity
- Mind → Immanence, Resolve, Creation, Luminance
- Reflex → Action, Potence, Darkness
- A Skill Test modifier is `rank + governing Ability Bonus`.

**Equipment**
- **Weapon** block: Tier, Damage, Accuracy, Traits, Price, Hardness, Durability, Notches
- **Armor** block: name, Tier, Durability, Notches, **DT+** (feeds DT), Bulk
- **Inventory**: item name + Bulk (Σ vs Max Encumbrance)
- **Price calculator**: `Price = Base × Tier × Quality`
- **Money**: `Total`, `Change` → `New Total`

**Threshold feats** are pasted in as a text note (Power Attack, Greater Resistance, Wits…).

### 1b. `ADVANCEMENT` — the EXP economy

| Concept | Formula (from the sheet) |
|---|---|
| **Ability advancement** | `100 × Tier` each; max 6 per Tier before advancing Tier |
| **Discipline degree `d`** | `50 × d` for that degree; total to reach degree `D` = `50 × D(D+1)/2` |
| **Discipline caps** | ≤ `2 × Tier` per discipline; ≤ `6 × Tier` degrees total |
| **Tier advancement** | Tier 2 = `300`, Tier 3 = `+1000` (cumulative `1300`); needs 6 ability advances + 6 discipline degrees |
| **EXP** | `spent = Σ ability + Σ discipline + tier`; `remaining = earned − spent` |
| **Creation grant** | `500 EXP` at character creation (PHB) |

The sheet keeps a **log** of each advancement (which ability `+1`, at which Tier;
which discipline at which degree) and sums the cost. Each discipline degree also
grants the corresponding **Feat** at that tier.

### 1c. `TEMPLATES`

Just blank "SAMPLE WEAPON / SAMPLE FEAT" stamps the player copies into MAIN — the
sheet has **no reference data**; weapon/feat/armor stats are typed by hand.

> **This is exactly where the site adds value.** Instead of hand-typing, the
> builder picks from the **674-record reference codex we already have** (weapons,
> armor, artifice, consumables, materials, disciplines, feats, skills, threshold
> feats, archetypes, backgrounds, conditions…), auto-fills the stats, and links
> each choice back to its codex page.

---

## 2. The calculation model (the transparency engine)

All character math lives in one framework-agnostic module, e.g.
`site/src/lib/character/derive.ts`. **Every derived value is returned as an
explained value**, not a bare number:

```ts
interface Derived {
  value: number | string;
  formula: string;                 // "3 × Body"
  parts: { label: string; value: number | string }[];  // [{Body, 10}]
  note?: string;                   // links to a rule, caveats
}
```

So `movement`, `dt`, `scrapes`, `st`, `shakes`, `maxEncumbrance`,
`abilityBonus`, `skillMod`, `expSpent`, `expRemaining`, `weaponDamage`,
`price`… each come back with a `formula` + `parts`. The **same module** feeds
the live builder *and* the read-only sheet page, so the two can never disagree,
and any UI can render `value` with a hover/inline "= formula" breakdown.

A companion `validate.ts` enforces the PHB build limits (skill count, principal
skill ≤ 2, discipline caps `2×Tier` / `6×Tier`, abilities ≤ 6 per tier, EXP not
overspent) and returns friendly warnings rather than blocking.

This module is the single source of truth for the rules; if a future PHB changes
a formula, it changes in exactly one place.

---

## 3. Architecture

The current site is **static** (Astro → Cloudflare Pages, read-only, one shared
password). Saving characters needs **identity + writable storage + an API**. The
clean split:

```
Reference codex (weapons, feats, rules…)   →  build-time static JSON  (unchanged)
Character data (user-generated, mutable)   →  Cloudflare D1  (SQLite at the edge)
Read/write API                             →  Cloudflare Pages Functions (functions/api/…)
Per-user identity                          →  see §4
Builder UI                                 →  Astro + a small Preact island
```

- **Cloudflare D1** — a serverless SQLite bound to the Pages project. Perfect fit:
  same SQLite mental model, no separate server, generous free tier, and the edge
  auth middleware already proves Functions work.
- The reference codex stays exactly as it is (committed JSON, rebuilt by the
  importer). Characters *reference* it by slug but live in D1.
- **Pages Functions** provide `functions/api/characters/*` (list/get/create/
  update/delete) and `functions/api/me`. Every write is gated by the session and
  scoped to the authenticated user.

---

## 4. Auth / accounts (a decision is needed)

Today: one shared password gates the whole private site — good enough for a
read-only wiki, but characters need to know **who you are**.

- **Option A — Cloudflare Access (email OTP)** *(recommended)*. Add the Pages app
  to Cloudflare Access, allow-list the friends' emails. Cloudflare handles login
  (email one-time code, or Google SSO) and passes a signed identity to every
  Function — **no passwords to store, minimal code, strong security**. The wiki
  gate is replaced by Access. Cost: a little Zero-Trust dashboard setup.
- **Option B — Custom accounts in D1**. A `user` table (handle/email + PBKDF2
  hash via Web Crypto), signup gated by the existing shared invite password,
  login issues the same HMAC cookie now carrying `user_id`. Full control, no new
  vendor dependency, but more code (signup/login/reset) and we store credentials.
- **Option C — Shared gate + pick-a-name**. Lowest friction, but anyone with the
  shared password can edit anyone's sheet — too weak for "your and your friends'
  sheets".

**Recommendation: A**, falling back to **B** if you'd rather avoid the Access
dependency. Either way the reference wiki stays private behind the same identity.

---

## 5. Data model (Cloudflare D1)

Reference tables are unchanged (static). New **character** tables:

```sql
-- who
CREATE TABLE user (
  id           TEXT PRIMARY KEY,      -- uuid (or the Access email)
  handle       TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at   TEXT NOT NULL
);

-- the character (abilities as columns — always exactly 3)
CREATE TABLE character (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL REFERENCES user(id),
  name          TEXT NOT NULL,
  archetype_slug TEXT,               -- -> reference archetype
  background_slug TEXT,              -- -> reference background
  tier          INTEGER NOT NULL DEFAULT 1,
  body_base     INTEGER, body_bonus  INTEGER DEFAULT 0,
  mind_base     INTEGER, mind_bonus  INTEGER DEFAULT 0,
  reflex_base   INTEGER, reflex_bonus INTEGER DEFAULT 0,
  strain        INTEGER DEFAULT 0,   -- live-play current strain
  corruption    INTEGER DEFAULT 0,
  exp_earned    INTEGER DEFAULT 500, -- creation grant
  money         INTEGER DEFAULT 0,
  visibility    TEXT DEFAULT 'friends', -- private | friends
  notes         TEXT,
  schema_version INTEGER DEFAULT 1,  -- so old saves can be migrated
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE character_skill (
  character_id TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  skill_slug   TEXT NOT NULL,        -- -> reference skill
  rank         INTEGER NOT NULL DEFAULT 0,
  is_principal INTEGER DEFAULT 0,
  PRIMARY KEY (character_id, skill_slug)
);

CREATE TABLE character_discipline (
  character_id    TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  discipline_slug TEXT NOT NULL,     -- -> reference discipline
  degree          INTEGER NOT NULL DEFAULT 1,   -- Training level
  PRIMARY KEY (character_id, discipline_slug)
);

CREATE TABLE character_feat (        -- feats/prayers/runes the character has
  character_id TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  feat_slug    TEXT,                 -- -> reference feat (null if free-text)
  name         TEXT NOT NULL,
  source       TEXT,                 -- discipline | archetype | threshold | manual
  note         TEXT,
  PRIMARY KEY (character_id, feat_slug, source)
);

CREATE TABLE character_item (        -- weapons, armor, inventory
  id           TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,        -- weapon | armor | artifice | consumable | material | generic
  ref_slug     TEXT,                 -- -> reference record (null for a custom item)
  name         TEXT NOT NULL,
  bulk         REAL DEFAULT 0,
  qty          INTEGER DEFAULT 1,
  equipped     INTEGER DEFAULT 0,
  notches      INTEGER DEFAULT 0,
  overrides    TEXT,                 -- JSON: per-item stat overrides / custom stats
  sort         INTEGER DEFAULT 0
);

CREATE TABLE character_advancement ( -- the EXP log (audit + history)
  id           TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  seq          INTEGER,
  type         TEXT NOT NULL,        -- ability | discipline | tier | skill
  detail       TEXT,                 -- 'body' | 'artifice->4' | 'tier 2'
  tier_when    INTEGER,
  exp_cost     INTEGER,
  created_at   TEXT
);

CREATE TABLE character_condition (   -- optional live-play state
  character_id  TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  condition_slug TEXT NOT NULL,
  value         INTEGER,             -- for Stunned_x etc.
  note          TEXT
);
```

**Derived values are never stored** (Movement, DT, ST, encumbrance, EXP spent…) —
they are computed from this state by `derive.ts` at render, so they always reflect
current inputs and current rules. `exp_earned` and the advancement log are stored;
`exp_spent`/`remaining` are computed. Skill ranks / discipline degrees / ability
bases are the truth; the log is for history and cross-checking.

---

## 6. Site structure

New nav group **"Characters"** (visible once signed in as a person):

| Route | What |
|---|---|
| `/characters` | Your characters + friends' (per `visibility`) as cards |
| `/characters/new` | The builder (Preact island) |
| `/characters/[id]` | **Read-only sheet** — SSR, every derived field shows its breakdown |
| `/characters/[id]/edit` | The builder, owner only |
| `/account` | Handle / display name / sign out |

**API** (`functions/api/`): `me`, `characters` (GET list, POST create),
`characters/[id]` (GET / PUT / DELETE). All scoped to the session user; friends'
sheets are read-only.

**Builder UX** — sections mirroring the sheet, each a collapsible panel:
1. **Identity** — name, archetype (→ derives the skill pair + granted feat),
   background (→ starting wealth + contacts), tier.
2. **Abilities** — Body/Mind/Reflex base + bonus; live-shows Adjusted, each
   Ability Bonus, and the derived block (Movement / DT+Scrapes / ST+Shakes /
   Max Encumbrance) with formulas.
3. **Skills** — pick from the 10; rank steppers; principal-skill guard (≤2);
   shows `rank + ability bonus`.
4. **Disciplines & Feats** — add a discipline, set its degree (with the
   `2×Tier` / `6×Tier` guards); each degree auto-offers the matching **Feat**
   from the codex; threshold feats appear automatically from ability values.
5. **Equipment** — search the codex for weapons/armor/artifice/consumables,
   add with auto-filled stats (editable overrides), track Bulk vs Encumbrance,
   equipped armor feeds DT.
6. **Advancement / EXP** — running `earned / spent / remaining` with the cost of
   every choice shown; the advancement log.
7. **Conditions / live play** *(optional, later)* — set current strain,
   corruption, active conditions; the whole sheet re-derives live.

**Autosave**: debounced `PUT` while editing + a `localStorage` draft as a safety
net, so a character is "remembered until next login" (and beyond) with nothing lost.

---

## 7. Calculation transparency (the core requirement)

Because `derive.ts` returns `{value, formula, parts}` for everything:

- Every derived number renders with a small **`= ƒ`** affordance; hover/tap (and
  an always-on toggle) reveals the breakdown, e.g.
  - `Movement 6 = Reflex 6`
  - `DT 19 = Body 10 + Dragon Armor 9`  → armor name links to its codex page
  - `Max Encumbrance 30 = 3 × Body 10`
  - `Scrapes: Minor >19 · Moderate 29 · Major 39 · Lethal 49  (DT +0/+10/+20/+30)`
  - `Resolve test +4 = rank 2 + Mind bonus 2`
  - `Artifice degree 4 cost 500 = 50 × (1+2+3+4)`
- A page-level **"Show all formulas"** switch expands every breakdown inline for a
  full audit of the sheet.
- Every referenced thing (weapon, feat, discipline, threshold feat, condition)
  **links to its codex entry**, so "why" is one click away.

---

## 8. Build phases (the batches)

Each batch is independently shippable and verifiable.

1. **Rules module** — `derive.ts` + `validate.ts` + unit tests that reproduce the
   sheet's numbers for the sample character (Joe the Jackal). No UI, no infra. *(Pure, safe.)*
2. **Storage + auth** — D1 schema + binding, the chosen auth (§4), `functions/api/*`,
   `/account`. Proves read/write end to end with a seeded row.
3. **Read-only sheet** — `/characters/[id]` rendering a character with full formula
   breakdowns. This is the "concept picture" made real.
4. **Builder** — the Preact island, section by section (Identity → Abilities →
   Skills → Disciplines/Feats → Equipment → EXP), with autosave.
5. **Characters list + sharing** — `/characters`, visibility, friends' read-only view.
6. **Live-play polish** — strain/corruption/conditions, "show all formulas",
   print/export, codex cross-links everywhere.

---

## 9. Decisions needed

1. **Auth** — Cloudflare Access email OTP (recommended, least code), custom
   accounts in D1 (no new vendor), or the light shared-gate + name?
2. **Ability Bonus at 18** — PHB says `+3`, your sheet says `+2`. Which is canon?
3. **Builder framework** — a small **Preact** island (recommended) or zero-framework vanilla?
4. **v1 scope** — builder + save + *your own* sheets first, friends'-browsing section next?
5. **Custom content** — allow hand-entered weapons/feats alongside codex picks?
   (Recommended: yes — the `overrides`/free-text fields already allow it.)
