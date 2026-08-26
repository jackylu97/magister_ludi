import { describe, expect, it } from 'vitest';
import {
  cloneRng,
  hashSeed,
  makeRng,
  nextFloat,
  nextInt,
  nextRange,
  nextUint32,
  shuffle,
} from '../../src/sim/rng';

function take(seed: number, n: number): number[] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => nextFloat(rng));
}

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(12345, 50)).toEqual(take(12345, 50));
  });

  it('produces different sequences for different seeds', () => {
    expect(take(1, 50)).not.toEqual(take(2, 50));
  });

  it('advances state on every draw', () => {
    const rng = makeRng(7);
    const before = rng.state;
    nextUint32(rng);
    expect(rng.state).not.toBe(before);
  });

  it('clones without coupling the streams', () => {
    const a = makeRng(99);
    const b = cloneRng(a);
    expect(nextFloat(a)).toBe(nextFloat(b));
    nextFloat(a);
    expect(a.state).not.toBe(b.state);
  });

  it('keeps nextUint32 in the unsigned 32-bit range', () => {
    const rng = makeRng(-77);
    for (let i = 0; i < 5000; i++) {
      const v = nextUint32(rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('keeps nextInt within [min, max) and hits both ends', () => {
    const rng = makeRng(2024);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = nextInt(rng, 3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(9);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(8)).toBe(true);
    expect(seen.size).toBe(6);
  });

  it('returns min for an empty nextInt range', () => {
    const rng = makeRng(1);
    expect(nextInt(rng, 5, 5)).toBe(5);
    expect(nextInt(rng, 5, 2)).toBe(5);
  });

  it('keeps nextRange within bounds', () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 5000; i++) {
      const v = nextRange(rng, -2.5, 7.5);
      expect(v).toBeGreaterThanOrEqual(-2.5);
      expect(v).toBeLessThan(7.5);
    }
  });

  it('spreads floats roughly uniformly across ten buckets', () => {
    const rng = makeRng(555);
    const buckets = new Array<number>(10).fill(0);
    const draws = 100000;
    for (let i = 0; i < draws; i++) {
      buckets[Math.floor(nextFloat(rng) * 10)]! += 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(draws / 10 - draws / 100);
      expect(count).toBeLessThan(draws / 10 + draws / 100);
    }
  });

  it('shuffles deterministically and keeps every element', () => {
    const source = Array.from({ length: 32 }, (_, i) => i);
    const a = shuffle(makeRng(8), [...source]);
    const b = shuffle(makeRng(8), [...source]);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(source);
    expect(a).not.toEqual(source);
  });

  it('hashes strings to stable, distinct seeds', () => {
    expect(hashSeed('webciv')).toBe(hashSeed('webciv'));
    expect(hashSeed('webciv')).not.toBe(hashSeed('webcvi'));
    expect(Number.isInteger(hashSeed('anything'))).toBe(true);
  });
});
