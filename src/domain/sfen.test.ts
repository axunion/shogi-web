import { describe, expect, it } from "vitest";
import {
  moveToUsi,
  parseSfen,
  positionToSfen,
  squareIndex,
  usiToMove,
} from "./sfen";
import type { Move } from "./types";

const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

describe("parseSfen", () => {
  it("places the initial position pieces correctly", () => {
    const position = parseSfen(INITIAL_SFEN);

    expect(position.sideToMove).toBe("black");
    expect(position.moveNumber).toBe(1);
    expect(position.hands.black).toEqual({});
    expect(position.hands.white).toEqual({});

    // Black king on file 5, rank 9 (bottom center)
    expect(position.board[squareIndex(5, 9)]).toEqual({
      type: "K",
      color: "black",
    });
    // White king on file 5, rank 1 (top center)
    expect(position.board[squareIndex(5, 1)]).toEqual({
      type: "K",
      color: "white",
    });

    // Nine black pawns on rank 7
    for (let file = 1; file <= 9; file++) {
      expect(position.board[squareIndex(file, 7)]).toEqual({
        type: "P",
        color: "black",
      });
    }
    // Nine white pawns on rank 3
    for (let file = 1; file <= 9; file++) {
      expect(position.board[squareIndex(file, 3)]).toEqual({
        type: "P",
        color: "white",
      });
    }

    // Black rook on file 2, rank 8; black bishop on file 8, rank 8
    expect(position.board[squareIndex(2, 8)]).toEqual({
      type: "R",
      color: "black",
    });
    expect(position.board[squareIndex(8, 8)]).toEqual({
      type: "B",
      color: "black",
    });
    // White rook on file 8, rank 2; white bishop on file 2, rank 2
    expect(position.board[squareIndex(8, 2)]).toEqual({
      type: "R",
      color: "white",
    });
    expect(position.board[squareIndex(2, 2)]).toEqual({
      type: "B",
      color: "white",
    });

    // Empty middle ranks
    for (let rank = 4; rank <= 6; rank++) {
      for (let file = 1; file <= 9; file++) {
        expect(position.board[squareIndex(file, rank)]).toBeNull();
      }
    }
  });
});

describe("SFEN round trip", () => {
  const cases = [
    INITIAL_SFEN,
    // White to move, mid-game with hand pieces on both sides
    "lnsgkgsnl/1r5b1/pppppp1pp/6p2/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w Pp 12",
    // Multiple pieces of the same type in hand, promoted pieces on board
    "l6nl/4gk1g1/2ns1pppp/pr1pp1s2/1p3P2P/2PPP1s2/PPBS3P1/1KG6/LN1G3NL b RB2P3p 45",
    // Promoted pieces and empty ranks
    "9/9/9/4+P4/9/4+p4/9/9/9 b - 20",
  ];

  it.each(cases)("parses and re-serializes %s identically", (sfen) => {
    const position = parseSfen(sfen);
    expect(positionToSfen(position)).toBe(sfen);
  });
});

describe("USI move conversion", () => {
  const cases: { usi: string; move: Move }[] = [
    {
      usi: "7g7f",
      move: {
        kind: "move",
        from: { file: 7, rank: 7 },
        to: { file: 7, rank: 6 },
        promote: false,
      },
    },
    {
      usi: "8h2b+",
      move: {
        kind: "move",
        from: { file: 8, rank: 8 },
        to: { file: 2, rank: 2 },
        promote: true,
      },
    },
    {
      usi: "P*5e",
      move: { kind: "drop", piece: "P", to: { file: 5, rank: 5 } },
    },
  ];

  it.each(cases)("converts $usi to a Move and back", ({ usi, move }) => {
    expect(usiToMove(usi)).toEqual(move);
    expect(moveToUsi(move)).toBe(usi);
  });
});
