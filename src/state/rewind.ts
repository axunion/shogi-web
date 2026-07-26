import type { MoveRecord, Position } from "../domain/types";

export interface RewindResult {
  position: Position;
  records: MoveRecord[];
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
