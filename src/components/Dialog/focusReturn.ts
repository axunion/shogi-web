import { createComputed } from "solid-js";

/**
 * Remembers what had focus when a dialog opens and puts focus back there when
 * it closes. Kobalte only does this itself for dialogs opened through their
 * own Trigger; ours are opened from controlled state. Pass the returned
 * handler as the content's onCloseAutoFocus (Kobalte also calls it when a
 * dialog is unmounted while open).
 *
 * `fallback` names somewhere sensible to land when the opener is gone, e.g.
 * a dialog opened by a button that the same action removed.
 */
export function createFocusReturn(
  open: () => boolean,
  fallback?: () => HTMLElement | null,
) {
  let opener: HTMLElement | null = null;

  // A computed runs as soon as `open` flips, before the dialog renders and
  // moves focus inside itself.
  createComputed(() => {
    if (!open()) return;
    const active = document.activeElement;
    opener =
      active instanceof HTMLElement && active !== document.body ? active : null;
  });

  return (event: Event) => {
    const recorded = opener;
    opener = null;
    const target = recorded?.isConnected ? recorded : (fallback?.() ?? null);
    if (!target) return;
    event.preventDefault();
    target.focus();
  };
}
