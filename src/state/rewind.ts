import type { MoveRecord, Position } from "../domain/types";
import type { GameMode } from "./gameStore";

export interface RewindResult {
  position: Position;
  records: MoveRecord[];
}

/** Plies to drop for a single "undo". In human mode every ply is an
 * independent decision, so always drop 1. In engine mode, drop 2 for a
 * completed player+engine pair, 1 while only the player's move is recorded
 * (engine still thinking), 0 if empty. */
export function undoPlies(recordCount: number, mode: GameMode): number {
  if (recordCount === 0) return 0;
  if (mode === "human") return 1;
  return recordCount % 2 === 0 ? 2 : 1;
}

/** Pure undo logic: drops the last `plies` records and returns the resulting position. */
export function rewind(
  records: MoveRecord[],
  plies: number,
): RewindResult | null {
  if (records.length === 0 || plies <= 0) return null;
  const index = records.length - plies;
  return {
    position: records[index].positionBefore,
    records: records.slice(0, index),
  };
}
