import { describe, expect, it } from "vitest";
import { formatMove } from "./notation";
import { parseSfen } from "./sfen";
import type { Move } from "./types";

describe("formatMove", () => {
  it("formats a plain pawn move for black", () => {
    const position = parseSfen(
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
    );
    const move: Move = {
      kind: "move",
      from: { file: 7, rank: 7 },
      to: { file: 7, rank: 6 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("▲7六歩");
  });

  it("formats a plain pawn move for white with △", () => {
    const position = parseSfen("9/9/6p2/9/9/9/9/9/9 w - 1");
    const move: Move = {
      kind: "move",
      from: { file: 3, rank: 3 },
      to: { file: 3, rank: 4 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("△3四歩");
  });

  it("appends 成 for a promoting move", () => {
    const position = parseSfen("9/9/9/4S4/9/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 4 },
      to: { file: 5, rank: 3 },
      promote: true,
    };
    expect(formatMove(position, move)).toBe("▲5三銀成");
  });

  it("appends 不成 for a promotable move that declines to promote", () => {
    const position = parseSfen("9/9/9/4S4/9/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 4 },
      to: { file: 5, rank: 3 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("▲5三銀不成");
  });

  it("appends 打 for a drop", () => {
    const position = parseSfen("9/9/9/9/9/9/9/9/9 b P 1");
    const move: Move = { kind: "drop", piece: "P", to: { file: 5, rank: 5 } };
    expect(formatMove(position, move)).toBe("▲5五歩打");
  });

  it("names an already-promoted pawn と without a suffix", () => {
    const position = parseSfen("9/9/9/9/4+P4/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 5 },
      to: { file: 5, rank: 4 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("▲5四と");
  });

  it("names an already-promoted rook 竜 without a suffix", () => {
    const position = parseSfen("9/7+R1/9/9/9/9/9/9/9 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 2, rank: 2 },
      to: { file: 2, rank: 3 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("▲2三竜");
  });

  it("names the black king 王", () => {
    const position = parseSfen("9/9/9/9/9/9/9/9/4K4 b - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 9 },
      to: { file: 5, rank: 8 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("▲5八王");
  });

  it("names the white king 玉", () => {
    const position = parseSfen("4k4/9/9/9/9/9/9/9/9 w - 1");
    const move: Move = {
      kind: "move",
      from: { file: 5, rank: 1 },
      to: { file: 5, rank: 2 },
      promote: false,
    };
    expect(formatMove(position, move)).toBe("△5二玉");
  });
});
