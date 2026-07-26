import { describe, expect, it } from "vitest";
import { applyMove } from "./position";
import { parseSfen, positionToSfen, squareIndex } from "./sfen";
import type { Move } from "./types";

describe("applyMove", () => {
  it("adds a captured piece to the capturing side's hand", () => {
    const position = parseSfen("9/9/9/4p4/4P4/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 5 },
      to: { file: 5, rank: 4 },
      promote: false,
    };

    const result = applyMove(position, move);

    expect(result.hands.black).toEqual({ P: 1 });
    expect(result.hands.white).toEqual({});
    expect(result.board[squareIndex(5, 5)]).toBeNull();
    expect(result.board[squareIndex(5, 4)]).toEqual({
      type: "P",
      color: "black",
    });
  });

  it("demotes a captured promoted piece before adding it to hand", () => {
    const position = parseSfen("9/9/9/4+p4/4P4/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 5 },
      to: { file: 5, rank: 4 },
      promote: false,
    };

    const result = applyMove(position, move);

    expect(result.hands.black).toEqual({ P: 1 });
  });

  it("produces the expected SFEN after a board move", () => {
    const position = parseSfen(
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
    );
    const move: Move = {
      kind: "move",
      from: { file: 7, rank: 7 },
      to: { file: 7, rank: 6 },
      promote: false,
    };

    const result = applyMove(position, move);

    expect(positionToSfen(result)).toBe(
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL w - 2",
    );
  });

  it("produces the expected SFEN after a drop, decrementing the hand", () => {
    const position = parseSfen("9/9/9/9/9/9/9/9/4K4 b P 1");
    const move: Move = { kind: "drop", piece: "P", to: { file: 5, rank: 5 } };

    const result = applyMove(position, move);

    expect(positionToSfen(result)).toBe("9/9/9/9/4P4/9/9/9/4K4 w - 2");
  });
});
