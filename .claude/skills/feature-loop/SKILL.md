---
name: feature-loop
description: Runs a task through the research → implement → review + test loop, delegating research to the built-in Explore agent and the researcher agent, implementing here, then verifying with the reviewer and tester agents, iterating until both come back clean or a retry cap is hit. Invoke explicitly via "/feature-loop <task>" for non-trivial work — changes touching src/domain/, src/engine/, or src/state/ logic, spanning multiple files, or relying on unfamiliar library APIs. Not for one-line fixes, typos, or config tweaks.
argument-hint: <task description>
disable-model-invocation: true
---

# Feature loop

Implement `$ARGUMENTS` here, in this conversation, wrapped in research before and
independent verification after. The agents this skill spawns are all read-only or
test-only: they investigate what you'd otherwise have to, and they check work they
didn't do. That's the point — it trades speed for a second and third opinion, so use it
for changes worth the overhead, not for one-line fixes.

You do the writing yourself. Don't delegate the implementation: the phases here share
too much context to hand off, and every fix pass would restart from a summary instead of
from what you actually wrote.

Each `Agent` call below spawns a fresh agent with no memory of this conversation or of
any other agent's run — the working tree is the only thing they share. Every call must
therefore restate the original task description in full, not just the delta since the
last step.

Every step here feeds the next, so pass `run_in_background: false` on every `Agent`
call. Subagents run in the background by default, which returns a name instead of a
result and breaks the sequencing.

## Steps

1. **Research — two agents in parallel.** Call both in the same message; they have no
   dependency on each other.
   - the built-in **`Explore`** agent, at **very thorough** breadth, for this codebase:
     which files the change touches, which conventions to mirror (with file:line
     pointers), what's out of bounds, and the existing test-file conventions for the
     areas being touched — step 2 and the tester both need that last one and nothing
     else in this loop supplies it. Explore does *not* load `CLAUDE.md` or git status,
     so restate any project rule it must respect (e.g. "never hand-edit
     `public/engine/` — it's vendored") directly in its prompt; it can't infer them.
   - the **`researcher`** agent, for third-party API usage the change depends on
     (Solid.js, Kobalte, the YaneuraOu WASM engine). Skip this one when the change
     touches no unfamiliar external API; there's nothing for it to look up, and its
     brief would be empty.

   If either reports a genuine ambiguity, stop here and ask the user to resolve it. The
   agents can't ask on their own.

2. **Implement, here.** The two step-1 reports are
   authoritative about different things and neither is authoritative about the task:
   Explore tells you where things live and what to match, `researcher` tells you how to
   call external libraries, and `$ARGUMENTS` defines what "done" means. Where either
   report conflicts with what you read in the actual files, the files win.

   Follow this project's `CLAUDE.md`, plus what it doesn't cover:
   - Never edit `public/engine/` — it's a vendored copy of `@mizarjp/yaneuraou.k-p`'s
     build output, not source. If the task genuinely requires changing it, stop and
     raise it with the user instead of editing.
   - Solid.js idioms: signals via `createSignal`, no component re-render model — don't
     introduce React-style patterns.
   - Mirror the test-file conventions Explore reported for the areas you touched.
   - Run `pnpm check` (Biome + `tsc -b`) and fix what it flags in code you touched.
     Leave unrelated pre-existing issues alone.

3. **Review + test in parallel.** Call the `reviewer` and `tester` agents in the same
   message (no dependency between them). Give each the original task description
   alongside "review/verify the pending change." `inspector` is deliberately not part of
   this step — visual verification is a separate axis from tiered risk (see CLAUDE.md's
   "Subagents" section), not something a scripted loop should iterate on; run it
   manually afterward if the change touches rendered UI.

4. **Judge.** You wrote the code under review here, so be strict with yourself about
   what counts as clean.
   - If the reviewer itself reported no findings **and** the tester reports everything
     passing: done — go to Report. "The reviewer raised things I decided weren't
     important" is not this branch.
   - Otherwise: fix the findings yourself, under step 2's rules, then repeat from step
     3. Spawn fresh reviewer and tester agents each pass — they have no memory of the
     previous one, so restate the task in full rather than referring back to it.
   - Cap at **3 total passes through step 3-4**. If it still isn't clean after that,
     stop and report the unresolved findings to the user instead of continuing.
   - If a finding is one you disagree with, don't silently ignore it and don't
     capitulate to it either — say so in the Report and let the user settle it.

## Report

Summarize for the user: what changed (files), what review/test found across iterations
(if anything), and the final state. Do not commit, push, or open a PR yourself — this
repository's convention is that commits happen only when explicitly requested, and a
human should look at the diff first even after an automated loop passes.
