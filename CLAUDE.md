# Global Claude Rules

Behavioral defaults plus house conventions. Bias toward caution over speed; on trivial
tasks, use judgment.

## Approach

- **Think before coding.** State assumptions. Make routine judgment calls yourself and
  note them; ask only when different interpretations would lead to materially different
  work. If a simpler path exists, say so and push back when warranted.
- **Simplest thing that works.** No unasked-for abstractions, flexibility, or error
  handling for impossible cases. If 200 lines could be 50, rewrite it.
- **Surgical changes.** Every changed line should trace to the request. Don't refactor,
  reformat, or "improve" adjacent code that isn't broken; match the surrounding style.
  Remove only the imports and symbols your change orphaned; leave unrelated dead code alone
  and mention it.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass"). For multi-step work, state a brief
  plan before starting.

## Language

Default to the user's language for everything interactive — chat replies, plan-mode
proposals, clarifying questions, and any other back-and-forth during the session.

Switch to English only for durable artifacts: things other people or tools will read
after the session ends — in-code comments, console/log/error output, AI-readable
instruction files, and reader-facing docs (README and the like). Scratch notes and other
throwaway dev artifacts stay in the user's language.

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
  change you happen to verify by hand. Prefer a flow with real evidence it can break
  (a past incident in git history) over one that merely seems important.

Two kinds of checking stay separate here:

- **Structural correctness** — state transitions, notation output, rendered structure —
  belongs in `pnpm test` / `pnpm test:e2e` and runs as part of every verification pass.
- **Subjective judgment** — "does this look right", spacing, color, feel — no assertion
  can reliably check it, and forcing it into a script is slow and still misses what a
  human catches at a glance. This stays a live check at `pnpm dev` or an `inspector`
  run; don't try to automate it away.

## Subagents

Three tiers, scaled to how much a change is worth checking:

- **Trivial** (one-line fixes, typos, config tweaks): implement directly, no agents.
- **Non-trivial but contained** (a self-contained feature or fix, one area of the
  codebase): implement directly — optionally after one research pass first: the built-in
  `Explore` agent when an existing convention is worth confirming, the `researcher` agent
  when an unfamiliar external API is involved (Solid.js, Kobalte, the YaneuraOu WASM
  engine). Afterward, run `reviewer` and `tester` in parallel, without asking first —
  both are read-only/test-only (tester only ever edits test files), so the cost and risk
  of running them is low, and they exist specifically to catch the blind spot of
  reviewing your own work.
- **Large, ambiguous, or high-risk** (spans multiple files, touches `src/domain/`,
  `src/engine/`, or `src/state/` logic in a substantial way): propose that the user
  drive it with the built-in `/goal` command, with a completion condition that
  explicitly requires `reviewer` and `tester` passing — e.g. "implement X; done when
  reviewer reports no findings and tester passes", not just "implement X", since
  `/goal`'s evaluator has no built-in knowledge that these agents exist. Always propose
  this rather than assuming it's wanted — the agents involved are as safe to run as
  tier 2's, but a `/goal` run spanning research, implementation, and multiple
  verification passes is real time and tokens to commit someone to. Once set, follow the
  same shape each turn: research (`Explore` and `researcher` in parallel, since neither
  depends on the other's result), implement here, then `reviewer` and `tester` in
  parallel — repeating on later turns until the evaluator confirms the condition holds.

Notice what stays constant across all three tiers: **this conversation writes the code
every time**, including inside a `/goal` run. Only the scaffolding changes — none, then
verification after, then research before and verification after with iteration. There is
deliberately no implementer agent: a write agent enforces no useful tool restriction, its
real product is the working tree rather than the summary it returns, and each fix pass
would re-spawn it with no memory of the code it just wrote. Every agent here is
read-only or test-only, which is exactly what makes them worth spawning — each one checks
work it didn't do.

Visual/layout verification is a separate axis from the tiers above, gated by whether
the change touches rendered UI at all — not by how large the change is. A large
domain/engine change has no rendered surface to check; a one-line CSS change might.

- **No rendered surface changed**: skip — no browser involved.
- **Small, isolated, single-property UI tweak**: just glance at `pnpm dev` yourself at a
  normal window size.
- **Layout that can vary by viewport (flex-wrap, min/max-width, dialogs), or a change
  spanning multiple components sharing styles, or chasing a reported visual bug**: run
  the `inspector` agent. Give it the full picture (it has no memory of this
  conversation) — what changed, what specifically to verify, and any prior finding that
  prompted the check. If it reports a real issue, fix it and re-run — a fix isn't
  verified until it comes back clean.

No confirmation needed to run it, but don't run it automatically for every non-trivial
UI change either — it costs real minutes (dev server + browser), so it's a judgment
call each time, made against the three cases above, not a default step.

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
