import { describe, expect, it } from "vitest";
import { parseSavedGame, parseSavedSettings } from "./storage";

const SCHEMA_VERSION = 1;

function saved(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: SCHEMA_VERSION,
    usiMoves: ["7g7f", "3c3d"],
    savedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("parseSavedGame", () => {
  it("accepts a well-formed saved game", () => {
    const result = parseSavedGame(saved());
    expect(result).not.toBeNull();
    expect(result?.usiMoves).toEqual(["7g7f", "3c3d"]);
    expect(result?.resigned).toBeUndefined();
  });

  it("accepts a saved resignation", () => {
    const result = parseSavedGame(saved({ resigned: "player" }));
    expect(result?.resigned).toBe("player");
  });

  it("accepts a black resignation (human mode)", () => {
    const result = parseSavedGame(saved({ resigned: "black" }));
    expect(result?.resigned).toBe("black");
  });

  it("accepts a white resignation (human mode)", () => {
    const result = parseSavedGame(saved({ resigned: "white" }));
    expect(result?.resigned).toBe("white");
  });

  it("accepts an engine resignation", () => {
    const result = parseSavedGame(saved({ resigned: "engine" }));
    expect(result?.resigned).toBe("engine");
  });

  it("accepts an engine-declared win", () => {
    const result = parseSavedGame(saved({ resigned: "engineWin" }));
    expect(result?.resigned).toBe("engineWin");
  });

  it("rejects an invalid resigned value", () => {
    expect(parseSavedGame(saved({ resigned: "invalid" }))).toBeNull();
  });

  it("rejects a schema version mismatch", () => {
    expect(parseSavedGame(saved({ version: 2 }))).toBeNull();
  });

  it("rejects null input", () => {
    expect(parseSavedGame(null)).toBeNull();
  });

  it("rejects invalid JSON", () => {
    expect(parseSavedGame("not json")).toBeNull();
  });

  it("rejects a non-array usiMoves", () => {
    expect(parseSavedGame(saved({ usiMoves: "7g7f" }))).toBeNull();
  });

  it("rejects non-string elements", () => {
    expect(parseSavedGame(saved({ usiMoves: [123] }))).toBeNull();
  });

  it("rejects a USI format violation", () => {
    expect(parseSavedGame(saved({ usiMoves: ["7g7z"] }))).toBeNull();
  });
});

describe("parseSavedSettings", () => {
  it("accepts well-formed settings", () => {
    expect(
      parseSavedSettings(
        JSON.stringify({ movetimeMs: 3000, soundEnabled: false }),
      ),
    ).toEqual({ movetimeMs: 3000, soundEnabled: false });
  });

  it("rejects invalid JSON", () => {
    expect(parseSavedSettings("not json")).toBeNull();
  });

  it("rejects null input", () => {
    expect(parseSavedSettings(null)).toBeNull();
  });

  it("drops fields with the wrong type", () => {
    expect(
      parseSavedSettings(
        JSON.stringify({ movetimeMs: "fast", soundEnabled: false }),
      ),
    ).toEqual({ soundEnabled: false });
  });

  it("drops a non-positive or non-finite movetimeMs", () => {
    expect(parseSavedSettings(JSON.stringify({ movetimeMs: -1 }))).toEqual({});
    expect(parseSavedSettings(JSON.stringify({ movetimeMs: 0 }))).toEqual({});
    expect(
      parseSavedSettings(
        JSON.stringify({ movetimeMs: Number.POSITIVE_INFINITY }),
      ),
    ).toEqual({});
  });

  it("accepts mode and boardFlip", () => {
    expect(
      parseSavedSettings(JSON.stringify({ mode: "human", boardFlip: true })),
    ).toEqual({ mode: "human", boardFlip: true });
  });

  it("rejects an invalid mode value", () => {
    expect(parseSavedSettings(JSON.stringify({ mode: "invalid" }))).toEqual({});
  });

  it("accepts a pieceTheme id string", () => {
    expect(
      parseSavedSettings(JSON.stringify({ pieceTheme: "lishogi-kanji-light" })),
    ).toEqual({ pieceTheme: "lishogi-kanji-light" });
  });

  it("drops a non-string pieceTheme", () => {
    expect(parseSavedSettings(JSON.stringify({ pieceTheme: 123 }))).toEqual({});
  });

  it("accepts a colorScheme value", () => {
    expect(parseSavedSettings(JSON.stringify({ colorScheme: "dark" }))).toEqual(
      { colorScheme: "dark" },
    );
    expect(
      parseSavedSettings(JSON.stringify({ colorScheme: "light" })),
    ).toEqual({ colorScheme: "light" });
    expect(
      parseSavedSettings(JSON.stringify({ colorScheme: "system" })),
    ).toEqual({ colorScheme: "system" });
  });

  it("rejects an invalid colorScheme value", () => {
    expect(
      parseSavedSettings(JSON.stringify({ colorScheme: "invalid" })),
    ).toEqual({});
  });
});
