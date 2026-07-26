import type { Piece } from "../domain/types";

export interface PieceTheme {
  kind: "text" | "image";
  // text: piece type -> display label (e.g. "P" -> "歩"). image: piece -> image URL
  label?: (piece: Piece) => string;
  imageUrl?: (piece: Piece) => string;
}
