import type {BufferGeometry} from 'three';

/** Weld bit-identical vertices in place, preserving every attribute. */
export function indexGeometry<T extends BufferGeometry>(geometry: T): T;
