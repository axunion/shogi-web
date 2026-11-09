# Project Rules

## Testing

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

Verifying a known change is different from open-ended exploration of the UI for bugs,
spec holes, and improvements — that is the `ui-sweep` skill (`/ui-sweep [scope]`), which
drives `inspector` in explore mode, fixes what it finds, and re-checks.
