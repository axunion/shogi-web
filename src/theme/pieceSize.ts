import type { PieceType } from "../domain/types";

// Base (unpromoted) piece types only — promoted pieces resolve to their
// base type via demotedType() before looking up a scale here.
export type BasePieceType = Exclude<PieceType, `+${string}`>;

// Relative visual size within a fixed-size square, echoing traditional
// graduated shogi piece sets (approx. 玉 > 飛・角 > 金 > 銀 > 桂 > 香 > 歩).
// Exact proportions vary by piece-set style; these are tuned presentation
// values.
export const PIECE_SIZE_SCALE: Record<BasePieceType, number> = {
  K: 1.0,
  R: 0.95,
  B: 0.95,
  G: 0.9,
  S: 0.86,
  N: 0.82,
  L: 0.78,
  P: 0.74,
};
