/**
 * **E5's one-time data migration** — the eight yield-paying `CardEffect` kinds
 * rewritten as the one `pays` shape.
 *
 * `docs/audit/e5-yield-shape.md` is the proposal and the table of record; this
 * is the rewrite that was actually run, committed so the rows' history is a file
 * rather than a memory. Run once, from the repo root:
 *
 *   node scripts/migrate-pays.mjs          # rewrite the data files
 *   node scripts/migrate-pays.mjs --check  # count without writing
 *
 * It is **idempotent**: a row already wearing `kind: 'pays'` is left alone, so a
 * second run is a no-op and reports nothing rewritten.
 *
 * Two disciplines it keeps, both because the diff is what a reader will judge
 * this batch by:
 *
 *   · **the files round-trip.** Every `data/*.json` in this repo is exactly
 *     `JSON.stringify(value, null, 2) + '\n'`, so the rewrite reserialises the
 *     whole file the same way and the diff is the rows that moved and nothing
 *     else;
 *   · **the keys come out in one order.** `KEY_ORDER` below is the order the
 *     shape's docblock declares its fields in, so two migrated rows of the same
 *     basis read alike, and a field the script did not know about is appended in
 *     the row's own original order rather than dropped.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'data/statecraft.json',
  'data/religion.json',
  'data/buildings.json',
  'data/greatPeople.json',
  'data/techs.json',
  'data/resources.json',
];

const OLD_KINDS = [
  'cityYields',
  'tileYield',
  'empireYields',
  'routeYield',
  'mirrorYield',
  'countScaled',
  'rateConversion',
  'yieldConversion',
];

/** The order a migrated row's keys come out in. See the module docblock. */
const KEY_ORDER = [
  'kind',
  'where',
  'basis',
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
  'to',
  'amount',
  'percent',
  'basePercent',
  'stage',
  'from',
  'fromRate',
  'count',
  'per',
  'max',
  'building',
  'category',
  'categories',
  'class',
  'slot',
  'tally',
  'voice',
  'within',
  'on',
  'scope',
  'origin',
  'destination',
  'share',
  'perEndpointLuxury',
];

/** One old row → the fields of the one shape. Everything else is copied over. */
function rewrite(row) {
  const out = { kind: 'pays' };
  const rest = { ...row };
  delete rest.kind;

  switch (row.kind) {
    case 'cityYields':
      out.where = 'city';
      break;
    case 'tileYield':
      out.where = 'hex';
      break;
    case 'empireYields':
      out.where = 'empire';
      break;
    case 'routeYield':
      out.where = 'route';
      break;
    case 'mirrorYield':
      out.where = 'city';
      out.basis = 'mirror';
      break;
    case 'yieldConversion':
      out.where = 'city';
      out.basis = 'share';
      break;
    case 'countScaled': {
      const pays = rest.pays;
      delete rest.pays;
      out.basis = 'count';
      applyPayout(out, pays);
      break;
    }
    case 'rateConversion': {
      const pays = rest.pays;
      delete rest.pays;
      out.basis = 'rate';
      // The rate a conversion reads is a `RateSource`, not a voice — its own
      // field, so `from` stays the voice a mirror and a share read.
      out.fromRate = rest.from;
      delete rest.from;
      applyPayout(out, pays);
      break;
    }
    default:
      throw new Error(`unknown kind ${row.kind}`);
  }

  for (const [key, value] of Object.entries(rest)) out[key] = value;
  return order(out);
}

/**
 * `CardPayout`'s four arms as fields — `where` hoisted onto the shape, which is
 * the whole finding of `docs/audit/evaluations.md` §3d.
 *
 * A meter payout carries `where: 'empire'` and nothing reads it: a meter has one
 * bank per empire. A percentage payout is a **city** reading — it joins
 * `cityYieldPercents` at step 11 — and is discriminated by `stage`.
 */
function applyPayout(out, pays) {
  if (pays.to === 'yield') {
    out.where = pays.where;
    out.to = pays.yield;
    out.amount = pays.amount;
    return;
  }
  if (pays.to === 'happiness' || pays.to === 'authority') {
    out.where = 'empire';
    out.to = pays.to;
    out.amount = pays.amount;
    return;
  }
  if (pays.to === 'percent') {
    out.where = 'city';
    out.to = pays.yield;
    out.percent = pays.percent;
    out.stage = pays.stage;
    return;
  }
  throw new Error(`unknown payout ${JSON.stringify(pays)}`);
}

/** `KEY_ORDER` first, then whatever the row carried that this script never named. */
function order(row) {
  const out = {};
  for (const key of KEY_ORDER) if (key in row) out[key] = row[key];
  for (const key of Object.keys(row)) if (!(key in out)) out[key] = row[key];
  return out;
}

/** Walk a parsed file, rewriting in place. Answers the tally by old kind. */
function walk(node, tally) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (child && typeof child === 'object' && OLD_KINDS.includes(child.kind)) {
        tally[child.kind] = (tally[child.kind] ?? 0) + 1;
        node[i] = rewrite(child);
        continue;
      }
      walk(child, tally);
    }
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, child] of Object.entries(node)) {
    if (child && typeof child === 'object' && !Array.isArray(child) && OLD_KINDS.includes(child.kind)) {
      tally[child.kind] = (tally[child.kind] ?? 0) + 1;
      node[key] = rewrite(child);
      continue;
    }
    walk(child, tally);
  }
}

const check = process.argv.includes('--check');
let total = 0;
for (const file of FILES) {
  const text = readFileSync(file, 'utf8');
  const parsed = JSON.parse(text);
  const tally = {};
  walk(parsed, tally);
  const rows = Object.values(tally).reduce((sum, n) => sum + n, 0);
  total += rows;
  if (rows > 0 && !check) writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
  const detail = Object.entries(tally)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([kind, n]) => `${kind} ${n}`)
    .join(' · ');
  console.log(`${file}: ${rows}${detail ? ` — ${detail}` : ''}`);
}
console.log(`total: ${total} rows${check ? ' (checked, nothing written)' : ' rewritten'}`);
