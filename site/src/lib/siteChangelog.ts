// Hand-maintained changelog for the WEBSITE itself (features, fixes, content
// passes) — distinct from the PHB book-version diffs, which are generated into
// src/data/changes.json by the exporter. Add newest entries at the top.
export interface SiteChange {
  date: string;              // ISO yyyy-mm-dd
  title: string;
  items: { tag: 'feature' | 'fix' | 'content'; text: string }[];
}

export const siteChangelog: SiteChange[] = [
  {
    date: '2026-10-19',
    title: 'Codex 1.0: the D&D 3.5 Codex design, inverted',
    items: [
      { tag: 'feature', text: 'The whole site now uses the D&D 3.5 Codex 1.0 design, colour-inverted: black paper, hard white rules, signal red as the one accent. A black-and-white header with section drawers replaces the sidebar, every page uses the codex type (Schibsted Grotesk and IBM Plex Mono), and fonts and icons are served from the site itself.' },
      { tag: 'feature', text: 'Every entry is a file: a file number, a giant title, its key facts as a glance grid, and a sigil drawn from its own data (what it is, its Tier, the Ability that governs it, its themes), with a key that reads each mark. The side column lists Kin, the entries whose sigils share its marks.' },
      { tag: 'feature', text: 'Listings are numbered ledgers with a filter form, removable chips, a rolling count and the Tier / A-Z sort. Filters can be linked (e.g. /feats?skill=Vitality&tier=Tier 1).' },
      { tag: 'feature', text: 'New home page: the Orrery of cycling sigils, a Feats-by-Skill × Tier matrix (switchable to equipment), Start-here plates and an index of every section with shortcuts into its filters. Search remembers recently viewed entries.' },
      { tag: 'feature', text: 'Compare: pick two to four entries of one section with ⇄ and see them side by side.' },
      { tag: 'fix', text: 'No data changed: every page, link and character sheet works as before; the sheet and builder only took on the new look.' },
    ],
  },
  {
    date: '2026-10-19',
    title: 'Stowed items',
    items: [
      { tag: 'feature', text: 'Each item on the character sheet and in the builder has a “stowed” checkbox. Tick it for anything kept in an Imaginary Pocket or similar: its Bulk no longer counts toward Encumbrance, and the Encumbrance card shows the stowed total separately.' },
    ],
  },
  {
    date: '2026-10-19',
    title: 'Custom Magic Items, Antimony & Firearms Group Effects',
    items: [
      { tag: 'content', text: 'Antimony, a new Unique Material (Value 3,000, Multiplier 12,000T): Antimonic Weapons ignore Magical defenses of 2T or less, and Antimonic Armor shrugs off Spells and Magical Effects of 2T or less; either destroys Effects of T or less on contact. It can be added to a character from the builder.' },
      { tag: 'content', text: 'Firearms are now a proper Weapon Group with their own Group Effects page (Cartridges, Overpenetration, Notching on a Critical Failure), instead of repeating the rules on every Utari firearm.' },
      { tag: 'content', text: 'New homebrew Magic Items: the Lambent Clutch (Tier 3 gauntlets that store Charges to throw Unarmed Attacks up to 10 Meters), the Aegis Band (a Tier 3 ring that turns nearby Damage into its own Notches) and the Band of Comradery (a linked set that shares condition and lets wearers Aid at 10 Meters). They carry the Custom badge and can be added to a character from the builder.' },
      { tag: 'fix', text: 'Custom entries no longer list internal bookkeeping (Custom / Status) in their stat block, and Magic Item cards without a set price no longer read "Cost -".' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'Updated to PHB v1.8',
    items: [
      { tag: 'content', text: 'The codex now tracks Kriegsmesser PHB v1.8. The Book versions tab has the full, detailed diff — every entry added, removed and changed — led by a Highlights summary of what’s new and what may affect your character (new DR:x mechanic, the Poisoned condition, the consumables overhaul, Brawling & Arcane reworks, and more).' },
      { tag: 'content', text: 'Spirit Binding and the Gaea Magic Items graduated from homebrew to official book content in v1.8, so they lost their Custom/faction badges. Martech and the Utari firearms remain homebrew.' },
      { tag: 'fix', text: 'Battle Cards retired — the tactical Battle system and Defending an Outpost rules left the book in v1.8 — and City Zones were replaced by the new City Districts generator (15 Districts with Requirements, Size & Effects).' },
      { tag: 'fix', text: 'The character sheet was re-verified against v1.8: no derived formula changed, and it picks up the new Poisoned condition automatically.' },
    ],
  },
  {
    date: '2026-08-12',
    title: 'Homebrew content: Spirit Binding, Magic Items, Martech & more',
    items: [
      { tag: 'content', text: 'Spirit Binding — a whole new discipline: 43 Spirits across five Courts (Elemental, Forces, Memories, Nymphs, Faeyer), each Mitha or Akthe, with their Powers and Bonds, plus the Binder’s feats, Rites and Ampule prices. Browse them in the new Spirit Bindings section, next to the (now renamed) Demon Bindings.' },
      { tag: 'content', text: 'Gaea Magic Items — a new section (magic that is not the work of Artifice): 27 items and 12 weapon/armor enchantments.' },
      { tag: 'content', text: 'Martech — a new Equipment category next to Artifice: 20 cybernetic Moduli, Residue-fuelled body augmentations.' },
      { tag: 'content', text: 'Utari firearms (Ou’kiju, Rokuju, Infantry Rifle, Kenju) added to Weapons, plus the earlier custom Artifice, Ordnance, Relics and a Poison — 124 homebrew entries in all.' },
      { tag: 'feature', text: 'Faction tags: DM-made content now shows a coloured origin badge (Utari, Gaea…) alongside the Custom badge, and can be filtered by origin. Everything homebrew lives outside the PHB and survives future book imports.' },
      { tag: 'feature', text: 'You can now add Magic Items and Martech to a character — the builder’s equipment search includes the new kinds.' },
      { tag: 'fix', text: 'Damage Threshold again includes your equipped armor’s DT+ (a house rule the group’s sheet uses), so DT reads correctly (e.g. Body 10 + Dragon Armor 9 = 19).' },
    ],
  },
  {
    date: '2026-08-08',
    title: 'Rules audit: corrected derived stats & clearer calculations',
    items: [
      { tag: 'fix', text: 'Encumbrance now actually reduces Movement and Initiative when you are over your limit (before, it only warned), and equipped armor’s Movement Penalty is applied.' },
      { tag: 'fix', text: 'Damage Threshold and Strain Threshold are now labelled house rules (the PHB has neither); Corruption gained its fourth band, Terminal at 18.' },
      { tag: 'feature', text: 'Added the PHB’s missing character values: Size & Weight, push/lift, the Climb/Swim Speeds, and your Defenses — the numbers an attacker must beat.' },
      { tag: 'fix', text: 'Ability advances are never priced above your Tier, with a warning when you exceed the 6-per-Tier limit; equipment saved before a field existed now auto-heals from the codex on load.' },
      { tag: 'feature', text: 'Every shown calculation reads as real arithmetic that ends in its result, and the +/- trackers read as controls rather than numbers.' },
    ],
  },
  {
    date: '2026-08-07',
    title: 'Live play sheet, XP tracking & this split changelog',
    items: [
      { tag: 'feature', text: 'The character sheet is now live during play: strain (Standard / Persistent / Permanent), conditions, damage vs your Damage Threshold, injuries and armor notches are all added and removed on the sheet and saved automatically — no need to open the builder mid-session.' },
      { tag: 'feature', text: 'Temporary ability points — buffs from spells and items — are tracked separately from your real score, with the full calculation shown.' },
      { tag: 'feature', text: 'A manual XP log (feats, gear bought with XP, GM awards) that drives your available XP without double-counting abilities, disciplines and tier.' },
      { tag: 'feature', text: 'Click any ability, skill or weapon to build a copy-paste Foundry roll — now with live success odds against the tier difficulty ladder (DC 8 / Minor / Moderate / Major / Extreme) and natural crit / crit-fail chances, computed from the exact dice pool.' },
      { tag: 'feature', text: 'Rest and Catch-your-Breath buttons that shed strain by the book, and a collapsible Actions & AP quick-reference so combat options live on the sheet too.' },
      { tag: 'feature', text: 'A character-art portrait next to the name: paste an image link, click to view it full-size, and change it any time.' },
      { tag: 'feature', text: 'This changelog is now split into Book versions and Site updates.' },
    ],
  },
  {
    date: '2026-08-06',
    title: 'Character builder & playable sheet',
    items: [
      { tag: 'feature', text: 'Build and save characters under the shared login, with a builder that pulls skills, disciplines, feats and equipment straight from the codex.' },
      { tag: 'feature', text: 'Every derived number (ability bonus, DT, ST, Reserve, encumbrance, EXP) shows the formula behind it.' },
      { tag: 'feature', text: 'A playable sheet with a combat quick-reference, discipline feats, automatic threshold feats, archetype panic responses, and rich weapon / armor / artifice stats.' },
    ],
  },
  {
    date: '2026-08-05',
    title: 'Full PHB coverage & import QA',
    items: [
      { tag: 'content', text: 'Expanded the codex from 486 to 674 records across 14 new browsable sections — artifice, rituals, bindings, consumables, ships, structures, battle cards and more.' },
      { tag: 'fix', text: 'Import QA pass: fixed blank summaries, de-duplicated reused buildings, and tidied generic detail pages.' },
      { tag: 'feature', text: 'Push-to-deploy: every change to the main branch now builds and ships automatically.' },
    ],
  },
  {
    date: '2026-08-04',
    title: 'The Shard-sea Codex went live',
    items: [
      { tag: 'feature', text: 'Launched a browsable, searchable wiki of the Kriegsmesser PHB behind a shared password, with an importer that ingests each new book version.' },
    ],
  },
];
