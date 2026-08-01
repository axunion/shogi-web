import { canPromote } from "./moves";
import { squareIndex } from "./sfen";
import type { Color, Move, Piece, PieceType, Position } from "./types";

export const RANK_KANJI = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

export function colorLabel(color: Color): string {
  return color === "black" ? "先手" : "後手";
}

export function colorSymbol(color: Color): string {
  return color === "black" ? "☗" : "☖";
}

// Kifu piece names — a separate table from the board's 1-character labels
// (theme/textTheme.ts), e.g. +R is "竜" here but "龍" on the board.
const PIECE_NAMES: Record<Exclude<PieceType, "K">, string> = {
  R: "飛",
  B: "角",
  G: "金",
  S: "銀",
  N: "桂",
  L: "香",
  P: "歩",
  "+R": "竜",
  "+B": "馬",
  "+S": "成銀",
  "+N": "成桂",
  "+L": "成香",
  "+P": "と",
};

function pieceName(piece: Piece): string {
  if (piece.type === "K") return piece.color === "black" ? "王" : "玉";
  return PIECE_NAMES[piece.type];
}

/** Formats a move in Japanese kifu notation, e.g. "▲7六歩", "△2二角成", "▲5五歩打". */
export function formatMove(positionBefore: Position, move: Move): string {
  const color = positionBefore.sideToMove;
  const turnSymbol = color === "black" ? "▲" : "△";
  const fileStr = String(move.to.file);
  const rankStr = RANK_KANJI[move.to.rank - 1];
  const squareStr = `${fileStr}${rankStr}`;

  if (move.kind === "drop") {
    const piece: Piece = { type: move.piece, color };
    return `${turnSymbol}${squareStr}${pieceName(piece)}打`;
  }

  const movedPiece =
    positionBefore.board[squareIndex(move.from.file, move.from.rank)];
  if (!movedPiece) {
    throw new Error(`No piece at ${JSON.stringify(move.from)}`);
  }

  let suffix = "";
  if (move.promote) {
    suffix = "成";
  } else if (canPromote(movedPiece, move.from, move.to)) {
    suffix = "不成";
  }

  return `${turnSymbol}${squareStr}${pieceName(movedPiece)}${suffix}`;
}
