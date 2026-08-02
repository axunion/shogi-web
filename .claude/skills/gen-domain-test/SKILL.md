---
name: gen-domain-test
description: Scaffolds a new test case for src/domain or src/state following this project's existing Vitest conventions (SFEN-based position setup, describe/it structure, small local helpers). Use when adding test coverage for shogi rules (moves, position, notation, replay, sfen) or app state, so new tests match the existing style instead of introducing a new pattern.
---

# Generate a domain/state test

This project's `src/domain/*.test.ts` and `src/state/*.test.ts` files share a
consistent style. Match it rather than inventing a new one.

## Conventions to follow

- **Framework**: Vitest (`describe`, `it`, `expect` from `"vitest"`), not Jest-specific
  APIs.
- **Position setup**: build test positions with `parseSfen(...)` from `./sfen` rather
  than constructing position objects by hand — SFEN strings are easier to read and
  verify at a glance (e.g. `"9/9/9/4p4/4P4/9/9/9/9 b - 1"`).
- **Local helpers**: small helpers like `targets(moves)` or `hasTarget(moves, square,
  promote?)` are defined at the top of the test file, not extracted to a shared
  test-utils module — only lift a helper out if it's already duplicated across 3+ test
  files (per this repo's CLAUDE.md: extract at 3+ use sites, not before).
- **One behavior per `it`**: each test targets one rule or edge case (e.g. "pawn
  captures forward and is blocked by an own piece"), described in plain language in the
  title — not "test case 1".
- **No shared mutable state**: every test builds its own position from scratch; nothing
  is set up in a `beforeEach` that later tests depend on.
- **Edge cases over happy paths**: this codebase's existing tests lean toward the rule
  edge cases (blocked pieces, promotion boundaries, drop restrictions) more than trivial
  "it moves" cases — follow that emphasis for shogi rule coverage.

## Steps

1. Find the sibling test file for the module being changed (e.g. changing
   `src/domain/moves.ts` → look at `src/domain/moves.test.ts`) and read a couple of its
   `it` blocks to match local naming and helper style exactly.
2. Write the new `it` block(s) inside the existing `describe` block if the behavior is
   related, or a new `describe` block if it's a distinct concern.
3. Run `pnpm test` and confirm the new test fails before the implementation change (if
   this is TDD) or passes after it (if backfilling coverage).
4. Do not touch unrelated existing tests in the same file.
