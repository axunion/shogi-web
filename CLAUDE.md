# Global Claude Rules

House conventions for this project — the parts that aren't already your defaults.

## Approach

- **Think before coding.** State assumptions. If a simpler path exists, say so and push
  back when warranted.
- **Simplest thing that works.** No speculative abstractions, and no error handling for
  cases this client-only app can't reach. If 200 lines could be 50, rewrite it.
- **Surgical changes.** Remove only the imports and symbols your change orphaned; leave
  unrelated dead code alone and mention it.
- **Goal-driven.** Turn each task into a verifiable outcome ("fix the bug" → "write a
  failing test that reproduces it, then make it pass").

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
  engine). Afterward, run `tester` — it owns the concrete checks (`pnpm test`,
  `pnpm check`, `pnpm test:e2e`) and nothing else runs them. Add `reviewer` when the
  change is worth an opinion from something that didn't write it: logic you had to think
  about, a diff that grew past what you first planned, or anything in the risk areas
  named in tier 3. Skip it when the tests fully cover whether the change is correct.
  Neither needs confirmation — both are read-only/test-only (tester only ever edits test
  files), so the cost and risk of running them is low.
- **Large, ambiguous, or high-risk** (spans multiple files, touches `src/domain/`,
  `src/engine/`, or `src/state/` logic in a substantial way): this is `feature-loop`
  scope (research → implement → review + test, iterating on findings). The skill is
  manual-invocation-only, so you can't start it yourself — say the task looks like
  feature-loop scope and ask the user to run `/feature-loop <task>`, or implement under
  tier 2's rules if they'd rather not.

Notice what stays constant across all three tiers: **this conversation writes the code
every time**, including inside `feature-loop`. Only the scaffolding changes — none, then
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
