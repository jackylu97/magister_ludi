/** Data stores the discount a source gives alone. Its reciprocal gives the
 * exact buying power even for bonuses such as one third or two thirds. */
function buyingPower(pricePercent: number): number {
  return -pricePercent / (100 + pricePercent);
}

export function buyingPowerWords(pricePercent: number): string {
  const percent = 100 * buyingPower(pricePercent);
  return `${Number(percent.toFixed(2))}%`;
}

/** Apply all buying power to the same price. Round once, after combining
 * the bonuses, so the cost is independent of the order in which they appear. */
export function purchaseDiscountLines(
  base: number,
  modifiers: readonly { source: string; percent: number }[],
  minimum = 0,
): { source: string; amount: number }[] {
  const lines: { source: string; amount: number }[] = [];
  let surcharge = 0;
  let extra = 0;
  const sources: string[] = [];
  for (const { source, percent } of modifiers) {
    if (percent < 0) {
      extra += buyingPower(percent);
      sources.push(source);
    } else if (percent > 0) {
      const previous = surcharge;
      surcharge += percent;
      const difference = Math.ceil(base * (100 + surcharge) / 100) - Math.ceil(base * (100 + previous) / 100);
      if (difference) lines.push({ source: `${source} · +${percent}%`, amount: difference });
    }
  }
  if (extra === 0) return lines;
  const full = base * (100 + surcharge) / 100;
  const exact = full / (1 + extra);
  // A repeating fraction can leave an exact integer a few ulps above itself.
  const price = Math.max(base > 0 ? 1 : 0, minimum, Math.ceil(exact - 4 * Number.EPSILON * Math.max(1, exact)));
  const savings = price - Math.ceil(full);
  if (savings) lines.push({ source: `Buying power · ${sources.join(', ')}`, amount: savings });
  return lines;
}
