export type Color = "black" | "white"; // black = Sente, white = Gote

export type PieceType =
  | "K"
  | "R"
  | "B"
  | "G"
  | "S"
  | "N"
  | "L"
  | "P"
  | "+R"
  | "+B"
  | "+S"
  | "+N"
  | "+L"
  | "+P";

// file: 1-9 (right to left), rank: 1-9 (top to bottom)
export interface Square {
  file: number;
  rank: number;
}

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Move =
  | { kind: "move"; from: Square; to: Square; promote: boolean }
  | { kind: "drop"; piece: PieceType; to: Square };

export interface Position {
  board: (Piece | null)[]; // 81 cells, index = (rank - 1) * 9 + (9 - file)
  hands: Record<Color, Partial<Record<PieceType, number>>>; // unpromoted types only
  sideToMove: Color;
  moveNumber: number; // 1-based, matches SFEN 4th field
}
