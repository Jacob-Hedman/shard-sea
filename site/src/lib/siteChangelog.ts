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
