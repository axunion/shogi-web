import { describe, expect, it } from "vitest";
import { positionToSfen } from "../domain/sfen";
import { DEFAULT_SETTINGS, resolveInitialState } from "./restore";

const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

describe("resolveInitialState", () => {
  it("falls back to defaults when nothing was saved", () => {
    const result = resolveInitialState(null, null);
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.records).toEqual([]);
    expect(result.lastMove).toBeNull();
    expect(result.invalidSavedGame).toBe(false);
    expect(positionToSfen(result.position)).toBe(INITIAL_SFEN);
  });

  it("merges saved settings over the defaults", () => {
    const result = resolveInitialState(
      { mode: "human", difficultyLevel: 6 },
      null,
    );
    expect(result.settings.mode).toBe("human");
    expect(result.settings.difficultyLevel).toBe(6);
    expect(result.settings.soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled);
  });

  it("falls back to the text piece theme when the saved theme id is unknown", () => {
    const result = resolveInitialState({ pieceTheme: "no-such-theme" }, null);
    expect(result.settings.pieceTheme).toBe(DEFAULT_SETTINGS.pieceTheme);
  });

  it("replays a valid saved game", () => {
    const result = resolveInitialState(null, {
      usiMoves: ["7g7f", "3c3d"],
    });
    expect(result.records).toHaveLength(2);
    expect(result.lastMove).toEqual({
      from: { file: 3, rank: 3 },
      to: { file: 3, rank: 4 },
    });
    expect(result.invalidSavedGame).toBe(false);
  });

  it("falls back to an empty game when the saved moves fail to replay", () => {
    const result = resolveInitialState(null, {
      usiMoves: ["7g7f", "7g7f"],
    });
    expect(result.records).toEqual([]);
    expect(result.lastMove).toBeNull();
    expect(result.invalidSavedGame).toBe(true);
    expect(positionToSfen(result.position)).toBe(INITIAL_SFEN);
  });
});
