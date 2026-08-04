---
name: feature-loop
description: Runs a task through the research → implement → review + test loop using the researcher, executor, reviewer, and tester agents, iterating until both review and tests pass or a retry cap is hit. Invoke explicitly via "/feature-loop <task>", or autonomously (after confirming with the user) for non-trivial work — changes touching src/domain/ or src/engine/ logic, spanning multiple files, or relying on unfamiliar library APIs. Not for one-line fixes, typos, or config tweaks.
argument-hint: <task description>
---

# Feature loop

Drive `$ARGUMENTS` through four specialized agents instead of implementing directly.
This trades speed for a built-in second (and third) opinion — use it for changes worth
that overhead, not for one-line fixes.

Each `Agent` call below spawns a fresh agent with no memory of this conversation or of
any other agent's run — the working tree is the only thing they share. Every call must
therefore restate the original task description in full (not just "fix this"), so
always include it, not just the delta since the last step.

## Steps

0. **Confirm before spawning.** If this run was triggered autonomously (not via an
   explicit `/feature-loop` invocation), tell the user the task looks like feature-loop
   scope and ask before starting — spawning four agents has real time/cost, and that
   decision belongs to the user, not to your own judgment call alone.

1. **Research.** Call the `researcher` agent with the task description. If its brief
   reports a genuine ambiguity, stop here and ask the user to resolve it — do not let the
   loop proceed on a guess.

2. **Implement.** Call the `executor` agent with the task description plus the
   research brief.

3. **Review + test in parallel.** Call the `reviewer` agent and the `tester` agent in
   the same message (two tool calls, no dependency between them). Give each the original
   task description alongside "review/verify the pending change" — the reviewer needs it
   to judge scope creep (its own checklist's first item), and the tester needs it to pick
   a relevant golden path for the browser pass.

4. **Judge.**
   - If reviewer found no findings **and** tester reports everything passing: done —
     go to Report.
   - Otherwise: call `executor` again with the original task description, the original
     research brief, and the reviewer's findings plus the tester's failure output as
     fix instructions — then repeat from step 3. A fresh executor call has no memory of
     what it just built, so it needs the full picture, not only the delta.
   - Cap at **3 total passes through step 3-4**. If it still isn't clean after that,
     stop and report the unresolved findings to the user instead of continuing — don't
     burn further iterations on something that isn't converging.

## Report

Summarize for the user: what changed (files), what the reviewer/tester found across
iterations (if anything), and the final state. Do not commit, push, or open a PR
yourself — this repository's convention is that commits happen only when explicitly
requested, and a human should look at the diff first even after an automated loop
passes.
