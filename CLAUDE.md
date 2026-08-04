# Global Claude Rules

Behavioral defaults plus house conventions. Bias toward caution over speed; on trivial
tasks, use judgment.

## Approach

- **Think before coding.** State assumptions. Make routine judgment calls yourself and
  note them; ask only when different interpretations would lead to materially different
  work. If a simpler path exists, say so and push back when warranted.
- **Simplest thing that works.** Write the minimum code that solves the stated problem —
  nothing speculative. No unasked-for abstractions, flexibility, or error handling for
  impossible cases. If 200 lines could be 50, rewrite it.
- **Surgical changes.** Every changed line should trace to the request. Don't refactor,
  reformat, or "improve" adjacent code that isn't broken; match the surrounding style.
  Remove only the imports and symbols your change orphaned; leave unrelated dead code alone
  and mention it.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass"). For multi-step work, state a brief
  plan before starting.

## Language

Write everything in **English** — in-code comments, console output, error and log
messages, AI-readable instruction files, and docs meant for readers (README and the
like). This rule applies to artifacts, not conversation: chat replies and
development-time planning notes follow the language the user is working in.

## Code Structure

- Name variables, functions, and files to communicate intent.
- One concern per file; split new code when a file exceeds ~300 lines. Don't split
  existing files unless asked.
- Extract a helper only when used in 3+ places; otherwise inline it.
- Delete dead code you create; never comment it out.

## Testing

- Write tests before or alongside implementation — they are your success criteria.
- If the project has no test setup, ask briefly: introduce one, or verify another way?
- Test observable outcomes and edge cases, not implementation details.
- Each test is fully self-contained; no shared mutable state between tests.
- `e2e/` (Playwright, `pnpm test:e2e`) holds only golden paths worth protecting against
  future regressions — add a spec when one is introduced or changed, not for every UI
  change you happen to verify by hand. One-off "does this render right" checks belong at
  the dev server, not in a committed spec; a scripted assertion can't judge visual
  quality anyway, only structural correctness.

## Subagents

Three tiers, scaled to how much a change is worth checking:

- **Trivial** (one-line fixes, typos, config tweaks): implement directly, no agents.
- **Non-trivial but contained** (a self-contained feature or fix, one area of the
  codebase): implement directly — optionally after a standalone `researcher` pass if the
  change touches unfamiliar library APIs (Solid.js, Kobalte) or conventions you're not
  sure of — then autonomously run `reviewer` and `tester` in parallel as a verification
  pass. No confirmation needed: both are read-only/test-only (tester only ever edits
  `*.test.ts`), so the cost and risk of running them is low.
- **Large, ambiguous, or high-risk** (spans multiple files, touches `src/domain/` or
  `src/engine/` logic in a substantial way): prefer the `feature-loop` skill (research →
  implement → review + test via four agents, iterating on findings). Because it spawns
  four agents and iterates, always confirm with the user first ("this looks like
  feature-loop scope — want me to run it?") before starting; never spawn it silently.

The `executor` agent is loop-only — it has no special knowledge beyond what's already
available in this conversation, so running it standalone (outside `feature-loop`) adds
no value over implementing directly.

## Commits

Format — plain prose, no prefixes or labels (`feat:`, `fix:`, and the like):

```
<summary: imperative mood, ≤70 chars, no trailing period>

<motivation: one sentence, only when not evident from the diff>

- <change bullets: only for 2+ distinct changes>
```

- Never commit secrets (`*.key`, `*.pem`, `credentials*`).
- Never use `--no-verify`. Use `--amend` only when explicitly asked; default to a new
  commit.
