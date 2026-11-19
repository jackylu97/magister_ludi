import { expect, it, vi } from 'vitest';
import { bindScreenHotkeys } from '../../src/ui/screenHotkeys';

function keydown(board: EventTarget, key: string, modifiers = {}) {
  const event = Object.assign(new Event('keydown', { cancelable: true }), { key }, modifiers);
  board.dispatchEvent(event);
  return event.defaultPrevented;
}

it('opens each screen once after a failed boot and retry', () => {
  const board = new EventTarget();
  const first = new AbortController();
  const abandoned = vi.fn();
  bindScreenHotkeys(board as Window, first.signal, () => false, abandoned);
  first.abort();
  expect(keydown(board, 'W')).toBe(false);

  const opened: string[] = [];
  let blocked = false;
  bindScreenHotkeys(board as Window, new AbortController().signal, () => blocked, (key) => {
    opened.push(key);
    blocked = true;
  });
  for (const key of ['H', 'W', 'E', 'S', 'I']) {
    blocked = false;
    expect(keydown(board, key)).toBe(true);
    expect(keydown(board, key)).toBe(false);
    expect(keydown(board, 'Escape')).toBe(false);
  }
  expect(abandoned).not.toHaveBeenCalled();
  expect(opened).toEqual(['h', 'w', 'e', 's', 'i']);
});

it('leaves typing, unrelated keys and browser shortcuts alone', () => {
  const board = Object.assign(new EventTarget(), { tagName: 'INPUT', isContentEditable: false });
  const open = vi.fn();
  bindScreenHotkeys(board as unknown as Window, new AbortController().signal, () => false, open);
  for (const field of ['INPUT', 'TEXTAREA', 'SELECT']) {
    board.tagName = field;
    expect(keydown(board, 'h')).toBe(false);
  }
  board.tagName = 'DIV';
  board.isContentEditable = true;
  expect(keydown(board, 'w')).toBe(false);
  board.isContentEditable = false;
  for (const key of ['s', 'i']) {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      expect(keydown(board, key, { [modifier]: true })).toBe(false);
    }
  }
  expect(keydown(board, 'z')).toBe(false);
  expect(open).not.toHaveBeenCalled();
});
