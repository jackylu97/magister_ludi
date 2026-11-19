import { expect } from 'vitest';
// @ts-expect-error The Node test runner provides Buffer.
import { Buffer } from 'node:buffer';

/** Compare exactly the bytes in each typed view, including its first and last elements. */
export function expectSameArray(actual: ArrayBufferView, expected: ArrayBufferView, name: string): void {
  expect(actual.constructor.name, name).toBe(expected.constructor.name);
  const left = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
  const right = Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength);
  if (left.equals(right)) return;
  expect(left.length, name).toBe(right.length);
  const offset = left.findIndex((byte: number, i: number) => byte !== right[i]);
  expect(left[offset], `${name}, byte ${offset}`).toBe(right[offset]);
}
