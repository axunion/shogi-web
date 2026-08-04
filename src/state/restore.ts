import { createInitialPosition } from "../domain/position";
import { replayUsiMoves } from "../domain/replay";
import type { Move, MoveRecord, Position, Square } from "../domain/types";
import { pieceThemeById } from "../theme/registry";
import { textTheme } from "../theme/textTheme";
import type { Settings } from "./gameStore";
import type { ParsedSavedGame } from "./storage";

export const DEFAULT_SETTINGS: Settings = {
  movetimeMs: 1000,
  soundEnabled: true,
  mode: "engine",
  boardFlip: false,
  pieceTheme: textTheme.id,
  colorScheme: "system",
};

export interface LastMove {
  from: Square | null;
  to: Square;
}

export function lastMoveOf(move: Move): LastMove {
  return move.kind === "move"
    ? { from: move.from, to: move.to }
    : { from: null, to: move.to };
}

export interface InitialState {
  settings: Settings;
  position: Position;
  records: MoveRecord[];
  lastMove: LastMove | null;
  /** True when a saved game was present but failed to replay (corrupt/illegal). */
  invalidSavedGame: boolean;
}

/** Pure: merges saved settings/game into a ready-to-use initial store state. */
export function resolveInitialState(
  savedSettings: Partial<Settings> | null,
  savedGame: ParsedSavedGame | null,
): InitialState {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...savedSettings };
  if (!pieceThemeById(settings.pieceTheme)) {
    settings.pieceTheme = textTheme.id;
  }

  const empty = {
    settings,
    position: createInitialPosition(),
    records: [],
    lastMove: null,
  };

  if (!savedGame) return { ...empty, invalidSavedGame: false };

  const replay = replayUsiMoves(savedGame.usiMoves);
  if (!replay) return { ...empty, invalidSavedGame: true };

  const lastRecord = replay.records[replay.records.length - 1];
  return {
    settings,
    position: replay.position,
    records: replay.records,
    lastMove: lastRecord ? lastMoveOf(lastRecord.move) : null,
    invalidSavedGame: false,
  };
}
