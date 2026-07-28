import { describe, expect, it } from "vitest";
import { applyMove, createInitialPosition } from "../domain/position";
import { positionToSfen, usiToMove } from "../domain/sfen";
import type { MoveRecord } from "../domain/types";
import { rewind } from "./rewind";

const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

function buildRecords(usiMoves: string[]): MoveRecord[] {
  let position = createInitialPosition();
  const records: MoveRecord[] = [];
  for (const usi of usiMoves) {
    const move = usiToMove(usi);
    const positionBefore = position;
    position = applyMove(position, move);
    records.push({ usi, move, positionBefore });
  }
  return records;
}

describe("rewind", () => {
  it("rewinds two plies back to the position before the pair of moves", () => {
    const records = buildRecords(["7g7f", "3c3d"]);
    const result = rewind(records, 2);
    if (!result) throw new Error("expected a result");
    expect(positionToSfen(result.position)).toBe(INITIAL_SFEN);
    expect(result.records).toHaveLength(0);
  });

  it("rewinds a single ply when only the player's move has been recorded", () => {
    const records = buildRecords(["7g7f"]);
    const result = rewind(records, 1);
    if (!result) throw new Error("expected a result");
    expect(positionToSfen(result.position)).toBe(INITIAL_SFEN);
    expect(result.records).toHaveLength(0);
  });

  it("keeps earlier records when rewinding fewer plies than recorded", () => {
    const records = buildRecords(["7g7f", "3c3d", "2g2f"]);
    const result = rewind(records, 2);
    if (!result) throw new Error("expected a result");
    expect(result.records).toHaveLength(1);
    expect(positionToSfen(result.position)).toBe(
      positionToSfen(records[1].positionBefore),
    );
  });

  it("is a no-op when there are no records", () => {
    expect(rewind([], 0)).toBeNull();
  });
});
