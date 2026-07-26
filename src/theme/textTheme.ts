import type { Piece } from "../domain/types";
import type { PieceTheme } from "./types";

const LABELS: Record<Piece["type"], string> = {
  K: "王",
  R: "飛",
  B: "角",
  G: "金",
  S: "銀",
  N: "桂",
  L: "香",
  P: "歩",
  "+R": "龍",
  "+B": "馬",
  "+S": "成銀",
  "+N": "成桂",
  "+L": "成香",
  "+P": "と",
};

export const textTheme: PieceTheme = {
  kind: "text",
  label: (piece) =>
    piece.type === "K" && piece.color === "white" ? "玉" : LABELS[piece.type],
};
