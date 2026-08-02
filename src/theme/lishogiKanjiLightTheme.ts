import type { Piece, PieceType } from "../domain/types";
import type { PieceTheme, PieceThemeAttribution } from "./types";

// Piece type -> Lishogi kanji_light 2-letter code (king depends on color,
// handled separately below). Built from the actual filenames vendored into
// public/pieces/lishogi-kanji-light/.
const PIECE_CODES: Record<Exclude<PieceType, "K">, string> = {
  P: "FU",
  L: "KY",
  N: "KE",
  S: "GI",
  G: "KI",
  B: "KA",
  R: "HI",
  "+P": "TO",
  "+L": "NY",
  "+N": "NK",
  "+S": "NG",
  "+B": "UM",
  "+R": "RY",
};

function pieceCode(piece: Piece): string {
  if (piece.type === "K") return piece.color === "black" ? "OU" : "GY";
  return PIECE_CODES[piece.type];
}

function imageUrl(piece: Piece): string {
  return `${import.meta.env.BASE_URL}pieces/lishogi-kanji-light/0${pieceCode(piece)}.svg`;
}

const attribution: PieceThemeAttribution = {
  name: "Kanji Light",
  author: "Ka-hu",
  authorUrl: "https://github.com/Ka-hu",
  sourceUrl:
    "https://github.com/WandererXII/lishogi/tree/acb3b12286dd41bc88edfa81172e6a5e7f68c52b/ui/@build/pieces/assets/standard/kanji_light",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

// `satisfies` (rather than a `: PieceTheme` annotation) keeps the exported
// binding's inferred type narrowed to the "image" branch, so callers like
// the asset-existence test can use `imageUrl` directly without re-narrowing.
export const lishogiKanjiLightTheme = {
  kind: "image",
  id: "lishogi-kanji-light",
  imageUrl,
  attribution,
} satisfies PieceTheme;
