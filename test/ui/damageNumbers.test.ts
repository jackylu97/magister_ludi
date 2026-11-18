/**
 * The floating damage numbers' placement (render speed pass five, second
 * batch). They follow the camera on every frame the board draws. They are
 * placed with the `translate` property, which the compositor applies before the
 * stylesheet's `transform` (the resting offset and the rise), and not with
 * `left`/`top`, which would lay the page out again on each of those frames.
 */
import { describe, expect, it } from 'vitest';

import { braceBody, uiSource } from './sourceHelpers';

describe('the damage numbers', () => {
  it('follow the camera by translate, not by left and top', () => {
    const reposition = braceBody(uiSource('damageNumbers.ts'), 'function reposition(');
    expect(reposition).toContain('floater.root.style.translate = `${Math.round(point.x)}px ${Math.round(point.y)}px`;');
    expect(reposition).not.toMatch(/style\.(left|top)\s*=/);
  });

  it('start at the sheet\'s corner, with the rise in transform', () => {
    const css = uiSource('style.css');
    const at = css.indexOf('\n.damage-number {');
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('top: 0;');
    expect(rule).toContain('left: 0;');
    expect(rule).toContain('transform: translate(-50%, -160%);');
    expect(rule).toContain('animation: damage-rise');
  });
});
