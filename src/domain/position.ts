import { parseSfen } from "./sfen";
import type { Position } from "./types";

const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

export function createInitialPosition(): Position {
  return parseSfen(INITIAL_SFEN);
}
