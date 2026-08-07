import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTY_LEVELS,
  difficultyLevelById,
} from "./difficulty";

describe("DIFFICULTY_LEVELS", () => {
  it("has a default id that points at a real level", () => {
    expect(DEFAULT_DIFFICULTY_ID).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_DIFFICULTY_ID).toBeLessThan(DIFFICULTY_LEVELS.length);
  });
});

describe("difficultyLevelById", () => {
  it("returns the matching level for an in-range id", () => {
    expect(difficultyLevelById(0)).toBe(DIFFICULTY_LEVELS[0]);
    const lastIndex = DIFFICULTY_LEVELS.length - 1;
    expect(difficultyLevelById(lastIndex)).toBe(DIFFICULTY_LEVELS[lastIndex]);
  });

  it("falls back to the default level for an out-of-range or non-integer id", () => {
    const fallback = DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY_ID];
    expect(difficultyLevelById(-1)).toBe(fallback);
    expect(difficultyLevelById(DIFFICULTY_LEVELS.length)).toBe(fallback);
    expect(difficultyLevelById(1.5)).toBe(fallback);
  });
});
