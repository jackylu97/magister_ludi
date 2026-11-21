import type { CellRef } from './mapView';

export interface ActionPreviewCell extends CellRef {
  /** Optional count of neighbours that contribute to this site. */
  count?: number;
  detail?: string;
}

const active = new WeakMap<Document, () => void>();

/** Mouse and keyboard users see the same cells. Escape also works when the pointer opened the preview. */
export function bindActionPreview(button: HTMLElement, show: () => void, clear: () => void, keepOnClick = false): void {
  const doc = button.ownerDocument;
  const dismiss = () => {
    if (active.get(doc) !== dismiss) return;
    active.delete(doc);
    doc.removeEventListener('keydown', escape);
    clear();
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss();
  };
  const open = () => {
    if (active.get(doc) === dismiss) return;
    active.get(doc)?.();
    active.set(doc, dismiss);
    show();
    doc.addEventListener('keydown', escape);
  };
  button.addEventListener('pointerenter', open);
  button.addEventListener('pointerleave', dismiss);
  button.addEventListener('focus', open);
  button.addEventListener('blur', dismiss);
  button.addEventListener('click', () => {
    if (keepOnClick) open();
    else dismiss();
  });
}
