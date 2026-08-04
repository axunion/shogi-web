import type { Settings } from "../state/gameStore";

/** Reflects the user's color-scheme preference onto the document root. */
export function applyColorScheme(colorScheme: Settings["colorScheme"]): void {
  const root = document.documentElement;
  if (colorScheme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = colorScheme;
  }
}
