import { describe, expect, it } from "vitest";
import { applyMove, createInitialPosition } from "./position";
import { replayUsiMoves } from "./replay";
import { positionToSfen, usiToMove } from "./sfen";

describe("replayUsiMoves", () => {
  it("replays a legal move sequence to the expected position", () => {
    const moves = ["7g7f", "3c3d", "2g2f"];
    const result = replayUsiMoves(moves);
    if (!result) throw new Error("expected a result");

    let expected = createInitialPosition();
    for (const usi of moves) {
      expected = applyMove(expected, usiToMove(usi));
    }

    expect(positionToSfen(result.position)).toBe(positionToSfen(expected));
    expect(result.records).toHaveLength(3);
    expect(result.records[0].usi).toBe("7g7f");
    expect(result.records[2].positionBefore).not.toBe(result.position);
  });

  it("returns null when an illegal move is mixed in", () => {
    // 5e5d has no piece to move from the initial position.
    expect(replayUsiMoves(["7g7f", "5e5d"])).toBeNull();
  });

  it("returns null for a garbled USI token", () => {
    expect(replayUsiMoves(["zzzz"])).toBeNull();
  });

  it("returns the initial position for an empty move list", () => {
    const result = replayUsiMoves([]);
    if (!result) throw new Error("expected a result");
    expect(result.records).toHaveLength(0);
    expect(positionToSfen(result.position)).toBe(
      positionToSfen(createInitialPosition()),
    );
  });
});
