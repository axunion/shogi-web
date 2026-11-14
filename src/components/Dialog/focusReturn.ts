import { createComputed, onCleanup } from "solid-js";

/**
 * Remembers what had focus when a dialog opens and puts focus back there when
 * it closes. Kobalte only does this itself for dialogs opened through their
 * own Trigger; ours are opened from controlled state. Pass the returned
 * handler as the content's onCloseAutoFocus.
 */
export function createFocusReturn(open: () => boolean) {
  let opener: HTMLElement | null = null;

  // A computed runs as soon as `open` flips, before the dialog renders and
  // moves focus inside itself.
  createComputed(() => {
    if (!open()) return;
    const active = document.activeElement;
    opener = active instanceof HTMLElement ? active : null;
  });

  function restore(): boolean {
    const target = opener;
    opener = null;
    if (!target?.isConnected) return false;
    target.focus();
    return true;
  }

  // A dialog unmounted while open (e.g. PromotionDialog) never gets a close
  // event, so restore on cleanup too.
  onCleanup(() => {
    const target = opener;
    if (target) queueMicrotask(() => target.isConnected && target.focus());
  });

  return (event: Event) => {
    if (restore()) event.preventDefault();
  };
}
