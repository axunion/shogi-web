import type { Piece } from "../domain/types";

export interface PieceThemeAttribution {
  name: string;
  author: string;
  authorUrl?: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
}

export type PieceTheme =
  | { kind: "text"; id: string; label: (piece: Piece) => string }
  | {
      kind: "image";
      id: string;
      imageUrl: (piece: Piece) => string;
      attribution: PieceThemeAttribution;
    };
