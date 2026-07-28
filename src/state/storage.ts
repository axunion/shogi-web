import type { Settings } from "./gameStore";

const GAME_KEY = "web-shogi:game";
const SETTINGS_KEY = "web-shogi:settings";
const SCHEMA_VERSION = 1;

const USI_MOVE_RE = /^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i])$/;

interface SavedGame {
  version: number;
  usiMoves: string[];
  savedAt: string;
  resigned?: "player";
}

export interface ParsedSavedGame {
  usiMoves: string[];
  resigned?: "player";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Pure: validates a raw JSON string. Returns null when unusable. */
export function parseSavedGame(raw: string | null): ParsedSavedGame | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const { version, usiMoves, resigned } = parsed as Partial<SavedGame>;
  if (version !== SCHEMA_VERSION) return null;
  if (!Array.isArray(usiMoves)) return null;
  if (
    !usiMoves.every(
      (move) => typeof move === "string" && USI_MOVE_RE.test(move),
    )
  ) {
    return null;
  }
  if (resigned !== undefined && resigned !== "player") return null;

  return resigned === "player" ? { usiMoves, resigned } : { usiMoves };
}

/** Pure: validates settings JSON. Returns null when unusable. */
export function parseSavedSettings(
  raw: string | null,
): Partial<Settings> | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const result: Partial<Settings> = {};
  if (typeof parsed.movetimeMs === "number") {
    result.movetimeMs = parsed.movetimeMs;
  }
  if (typeof parsed.soundEnabled === "boolean") {
    result.soundEnabled = parsed.soundEnabled;
  }
  return result;
}

export function loadGame(): ParsedSavedGame | null {
  try {
    return parseSavedGame(localStorage.getItem(GAME_KEY));
  } catch {
    return null;
  }
}

export function saveGame(usiMoves: string[], resigned?: "player"): void {
  try {
    const saved: SavedGame = {
      version: SCHEMA_VERSION,
      usiMoves,
      savedAt: new Date().toISOString(),
      ...(resigned ? { resigned } : {}),
    };
    localStorage.setItem(GAME_KEY, JSON.stringify(saved));
  } catch {
    // e.g. private browsing mode: persistence is best-effort, never fatal.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // best-effort, see saveGame
  }
}

export function loadSettings(): Partial<Settings> | null {
  try {
    return parseSavedSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // best-effort, see saveGame
  }
}
