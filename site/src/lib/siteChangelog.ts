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
