import { generateLegalMoves } from "./moves";
import { applyMove, createInitialPosition } from "./position";
import { usiToMove } from "./sfen";
import type { Move, MoveRecord, Position } from "./types";

function sameMove(a: Move, b: Move): boolean {
  if (a.kind === "drop" && b.kind === "drop") {
    return (
      a.piece === b.piece && a.to.file === b.to.file && a.to.rank === b.to.rank
    );
  }
  if (a.kind === "move" && b.kind === "move") {
    return (
      a.from.file === b.from.file &&
      a.from.rank === b.from.rank &&
      a.to.file === b.to.file &&
      a.to.rank === b.to.rank &&
      a.promote === b.promote
    );
  }
  return false;
}

/** Replays USI moves from the initial position. Returns null on any illegal move. */
export function replayUsiMoves(
  usiMoves: string[],
): { position: Position; records: MoveRecord[] } | null {
  let position = createInitialPosition();
  const records: MoveRecord[] = [];

  for (const usi of usiMoves) {
    const move = usiToMove(usi);
    const source = move.kind === "move" ? move.from : move.piece;
    const legalMoves = generateLegalMoves(position, source);
    if (!legalMoves.some((candidate) => sameMove(candidate, move))) {
      return null;
    }

    const positionBefore = position;
    position = applyMove(position, move);
    records.push({ usi, move, positionBefore });
  }

  return { position, records };
}
