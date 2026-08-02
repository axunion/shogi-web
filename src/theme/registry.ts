import { lishogiKanjiLightTheme } from "./lishogiKanjiLightTheme";
import { textTheme } from "./textTheme";
import type { PieceTheme } from "./types";

export const PIECE_THEMES: PieceTheme[] = [textTheme, lishogiKanjiLightTheme];

const THEMES_BY_ID: Record<string, PieceTheme> = Object.fromEntries(
  PIECE_THEMES.map((theme) => [theme.id, theme]),
);

export function pieceThemeById(id: string): PieceTheme | undefined {
  return THEMES_BY_ID[id];
}
