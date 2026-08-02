import { describe, expect, it } from "vitest";
import { generateLegalMoves } from "./moves";
import { parseSfen } from "./sfen";
import type { Move, Square } from "./types";

function targets(moves: Move[]): Square[] {
  return moves.map((move) => move.to);
}

function hasTarget(moves: Move[], square: Square, promote?: boolean): boolean {
  return moves.some(
    (move) =>
      move.to.file === square.file &&
      move.to.rank === square.rank &&
      (promote === undefined ||
        (move.kind === "move" && move.promote === promote)),
  );
}

describe("piece move patterns", () => {
  it("pawn captures forward and is blocked by an own piece", () => {
    const capture = parseSfen("9/9/9/4p4/4P4/9/9/9/9 b - 1");
    expect(targets(generateLegalMoves(capture, { file: 5, rank: 5 }))).toEqual([
      { file: 5, rank: 4 },
    ]);

    const blocked = parseSfen("9/9/9/4P4/4P4/9/9/9/9 b - 1");
    expect(generateLegalMoves(blocked, { file: 5, rank: 5 })).toEqual([]);
  });

  it("knight jumps two ranks forward and one file sideways", () => {
    const position = parseSfen("9/9/9/9/9/4N4/9/9/9 b - 1");
    expect(
      targets(generateLegalMoves(position, { file: 5, rank: 6 })).sort(
        (a, b) => a.file - b.file,
      ),
    ).toEqual([
      { file: 4, rank: 4 },
      { file: 6, rank: 4 },
    ]);
  });

  it("silver moves diagonally and straight forward, not straight sideways or backward", () => {
    const position = parseSfen("9/9/9/9/4S4/9/9/9/9 b - 1");
    const result = targets(generateLegalMoves(position, { file: 5, rank: 5 }));
    expect(result).toHaveLength(5);
    for (const square of [
      { file: 4, rank: 4 },
      { file: 5, rank: 4 },
      { file: 6, rank: 4 },
      { file: 4, rank: 6 },
      { file: 6, rank: 6 },
    ]) {
      expect(result).toContainEqual(square);
    }
  });

  it("gold moves in six directions, excluding diagonal backward", () => {
    const position = parseSfen("9/9/9/9/4G4/9/9/9/9 b - 1");
    const result = targets(generateLegalMoves(position, { file: 5, rank: 5 }));
    expect(result).toHaveLength(6);
    for (const square of [
      { file: 4, rank: 4 },
      { file: 5, rank: 4 },
      { file: 6, rank: 4 },
      { file: 4, rank: 5 },
      { file: 6, rank: 5 },
      { file: 5, rank: 6 },
    ]) {
      expect(result).toContainEqual(square);
    }
  });

  it("king moves one square in any of the eight directions", () => {
    const position = parseSfen("9/9/9/9/4K4/9/9/9/9 b - 1");
    expect(generateLegalMoves(position, { file: 5, rank: 5 })).toHaveLength(8);
  });

  it("rook and bishop slide until blocked, capturing an enemy on the blocking square", () => {
    const position = parseSfen("9/4p4/9/9/1p2RP3/9/9/9/9 b - 1");
    const rookTargets = targets(
      generateLegalMoves(position, { file: 5, rank: 5 }),
    );
    // Blocked by an own pawn to the right (file 4) and captures the enemy pawn above (rank 2..5) and to the left (file 6..8)
    expect(rookTargets).toContainEqual({ file: 5, rank: 4 });
    expect(rookTargets).toContainEqual({ file: 5, rank: 2 });
    expect(rookTargets).not.toContainEqual({ file: 5, rank: 1 });
    expect(rookTargets).toContainEqual({ file: 6, rank: 5 });
    expect(rookTargets).not.toContainEqual({ file: 4, rank: 5 });

    const bishopPosition = parseSfen("9/9/2p6/9/4B4/9/6p2/9/9 b - 1");
    const bishopTargets = targets(
      generateLegalMoves(bishopPosition, { file: 5, rank: 5 }),
    );
    expect(bishopTargets).toContainEqual({ file: 7, rank: 3 });
    expect(bishopTargets).not.toContainEqual({ file: 8, rank: 2 });
    expect(bishopTargets).toContainEqual({ file: 3, rank: 7 });
  });

  it("lance slides forward until blocked", () => {
    const position = parseSfen("9/9/9/4p4/9/4L4/9/9/9 b - 1");
    expect(targets(generateLegalMoves(position, { file: 5, rank: 6 }))).toEqual(
      [
        { file: 5, rank: 5 },
        { file: 5, rank: 4 },
      ],
    );
  });
});

describe("promotion rules", () => {
  it("offers optional promotion when moving into the promotion zone", () => {
    const position = parseSfen("9/9/9/4S4/9/9/9/9/9 b - 1");
    const moves = generateLegalMoves(position, { file: 5, rank: 4 });
    expect(hasTarget(moves, { file: 4, rank: 3 }, true)).toBe(true);
    expect(hasTarget(moves, { file: 4, rank: 3 }, false)).toBe(true);
  });

  it("forces promotion for a pawn or lance reaching the last rank", () => {
    const pawn = parseSfen("9/4P4/9/9/9/9/9/9/9 b - 1");
    expect(generateLegalMoves(pawn, { file: 5, rank: 2 })).toEqual([
      {
        kind: "move",
        from: { file: 5, rank: 2 },
        to: { file: 5, rank: 1 },
        promote: true,
      },
    ]);

    const lance = parseSfen("9/4L4/9/9/9/9/9/9/9 b - 1");
    expect(generateLegalMoves(lance, { file: 5, rank: 2 })).toEqual([
      {
        kind: "move",
        from: { file: 5, rank: 2 },
        to: { file: 5, rank: 1 },
        promote: true,
      },
    ]);
  });

  it("forces promotion for a knight reaching the last two ranks", () => {
    const position = parseSfen("9/9/4N4/9/9/9/9/9/9 b - 1");
    const moves = generateLegalMoves(position, { file: 5, rank: 3 });
    expect(moves.every((move) => move.kind === "move" && move.promote)).toBe(
      true,
    );
    expect(moves).toHaveLength(2);
  });

  it("never offers promotion for an already-promoted piece moving within the zone", () => {
    const position = parseSfen("9/9/9/4+P4/9/9/9/9/9 b - 1");
    const moves = generateLegalMoves(position, { file: 5, rank: 4 });
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((move) => move.kind === "move" && !move.promote)).toBe(
      true,
    );
  });
});

describe("drop restrictions", () => {
  it("rejects dropping a pawn on a file that already has an unpromoted pawn (nifu)", () => {
    const position = parseSfen("9/9/9/9/9/9/4P4/9/4K4 b P 1");
    const moves = generateLegalMoves(position, "P");
    expect(moves.some((move) => move.to.file === 5)).toBe(false);
    expect(moves.some((move) => move.to.file === 4)).toBe(true);
  });

  it("rejects dropping a pawn, lance, or knight where it would have no legal moves", () => {
    const position = parseSfen("9/9/9/9/9/9/9/9/4K4 b PLN 1");
    const pawnDrops = generateLegalMoves(position, "P");
    const lanceDrops = generateLegalMoves(position, "L");
    const knightDrops = generateLegalMoves(position, "N");
    expect(pawnDrops.some((move) => move.to.rank === 1)).toBe(false);
    expect(lanceDrops.some((move) => move.to.rank === 1)).toBe(false);
    expect(
      knightDrops.some((move) => move.to.rank === 1 || move.to.rank === 2),
    ).toBe(false);
  });
});

describe("king safety", () => {
  it("forbids a pinned piece from moving off the pinning line", () => {
    const position = parseSfen("4r4/9/9/9/9/9/9/4S4/4K4 b - 1");
    const moves = generateLegalMoves(position, { file: 5, rank: 8 });
    expect(targets(moves)).toEqual([{ file: 5, rank: 7 }]);
  });

  it("generates only evasion moves when the king is in check", () => {
    const position = parseSfen("4r4/9/9/9/9/9/9/2S6/4K4 b - 1");

    // The silver is far from the checking line and cannot capture or block; it has no legal moves.
    expect(generateLegalMoves(position, { file: 7, rank: 8 })).toEqual([]);

    // The king may only step off the file the rook attacks.
    const kingMoves = targets(
      generateLegalMoves(position, { file: 5, rank: 9 }),
    ).sort((a, b) => a.file - b.file || a.rank - b.rank);
    expect(kingMoves).toEqual([
      { file: 4, rank: 8 },
      { file: 4, rank: 9 },
      { file: 6, rank: 8 },
      { file: 6, rank: 9 },
    ]);
  });
});
