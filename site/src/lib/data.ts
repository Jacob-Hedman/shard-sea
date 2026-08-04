// Build-time data access. Reads the JSON the exporter wrote into src/data/.
// These run only during `astro build` / `astro dev` (Node), never in the browser.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Resolve from the project root (cwd is always web/ for npm dev/build/export),
// not import.meta.url — Astro bundles this module into dist/chunks/ at build,
// which would shift a URL-relative path. Parsed files are memoised: several
// components (home, sidebar, layout, refs) read the same JSON per page.
const cache = new Map<string, any>();
const read = (file: string) => {
  let v = cache.get(file);
  if (v === undefined) {
    v = JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', file), 'utf8'));
    cache.set(file, v);
  }
  return v;
};

export type Rec = Record<string, any>;

export function loadFull(kind: string): Rec[] {
  return read(`${kind}.json`);
}

export interface Meta {
  builtAt: string;
  db: string;
  version: string;
  sections: { kind: string; count: number }[];
  sources: string[];
}
export function loadMeta(): Meta {
  return read('meta.json');
}

export interface Changes {
  current: string;
  versions: { version: string; imported_at: string; page_count: number; entity_count: number; is_current: number; notes: string }[];
  changelog: any[];
}
export function loadChanges(): Changes {
  return read('changes.json');
}

export function countFor(meta: Meta, kind: string): number {
  return meta.sections.find((s) => s.kind === kind)?.count ?? 0;
}
