import type { Piece } from "../domain/types";

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
  "+S": "全",
  "+N": "圭",
  "+L": "杏",
  "+P": "と",
};

export function kanjiLabel(piece: Piece): string {
  return piece.type === "K" && piece.color === "white"
    ? "玉"
    : LABELS[piece.type];
}
