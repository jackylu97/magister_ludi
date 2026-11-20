import { RULES } from './rulesData';

/** Each line shows its share of the original price. A separate line explains the limit. */
export function purchaseDiscountLines(
  base: number,
  modifiers: readonly { source: string; percent: number }[],
  minimum = 0,
): { source: string; amount: number }[] {
  const lines: { source: string; amount: number }[] = [];
  let percent = 0;
  let discounts = 0;
  let strongest = 0;
  let previous = base;
  const priceAt = (rate: number) => Math.max(minimum, Math.floor(base * (100 + rate) / 100));
  for (const modifier of modifiers) {
    percent += modifier.percent;
    discounts += Math.min(0, modifier.percent);
    strongest = Math.min(strongest, modifier.percent);
    const price = priceAt(percent);
    if (price !== previous) {
      lines.push({ source: `${modifier.source} · ${modifier.percent}%`, amount: price - previous });
    }
    previous = price;
  }
  const limit = Math.min(-RULES.production.purchaseDiscountCap, strongest);
  if (discounts < limit) {
    const amount = priceAt(percent - discounts + limit) - previous;
    if (amount !== 0) lines.push({ source: `Combined discount limit · ${-limit}%`, amount });
  }
  return lines;
}
