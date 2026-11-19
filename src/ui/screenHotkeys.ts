type ScreenKey = 'h' | 'w' | 'e' | 's' | 'i';

/** Screens handle their own keys while open. Only the board can open one here. */
export function bindScreenHotkeys(
  target: Window,
  signal: AbortSignal,
  isInputBlocked: () => boolean,
  open: (key: ScreenKey) => void,
): void {
  target.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key !== 'h' && key !== 'w' && key !== 'e' && key !== 's' && key !== 'i') return;
    if ((key === 's' || key === 'i') && (event.ctrlKey || event.metaKey || event.altKey)) return;
    if (isInputBlocked()) return;
    const field = event.target as HTMLElement | null;
    if (field?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(field?.tagName ?? '')) return;
    event.preventDefault();
    open(key);
  }, { signal });
}
