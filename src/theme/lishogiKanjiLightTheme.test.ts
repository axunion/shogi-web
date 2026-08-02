/// <reference types="node" />
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Color, PieceType } from "../domain/types";
import { lishogiKanjiLightTheme } from "./lishogiKanjiLightTheme";

const PIECE_TYPES: PieceType[] = [
  "K",
  "R",
  "B",
  "G",
  "S",
  "N",
  "L",
  "P",
  "+R",
  "+B",
  "+S",
  "+N",
  "+L",
  "+P",
];
const COLORS: Color[] = ["black", "white"];

const ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/pieces/lishogi-kanji-light",
);

describe("lishogiKanjiLightTheme.imageUrl", () => {
  for (const type of PIECE_TYPES) {
    for (const color of COLORS) {
      it(`resolves an existing SVG for ${type} (${color})`, () => {
        const url = lishogiKanjiLightTheme.imageUrl({ type, color });
        const filename = url.split("/").pop() as string;
        expect(existsSync(path.join(ASSETS_DIR, filename))).toBe(true);
      });
    }
  }
});
