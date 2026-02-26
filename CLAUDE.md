# CLAUDE.md
# Yggdrasil — Session Enforcer & Pre-Flight Checklist
# Last Updated: 2026-02-25
# Version: 2.0

---

## CRITICAL: READ THIS ENTIRE FILE BEFORE DOING ANYTHING ELSE

This file governs every Claude Code session on the Yggdrasil project without
exception. It is not a suggestion. It is not optional. Every rule here exists
because the alternative causes drift, hallucination, or wasted work.

Do not write a single line of code until the pre-flight checklist is complete.

---

## 1. PRE-FLIGHT CHECKLIST

Execute these steps in order at the start of every session, every time.
No exceptions. No shortcuts. No skipping steps because "you remember from last time."

### Step 1 — Read ARCHITECTURE.md
Read the full document. This is the constitution. Understand:
- The current active scope and hard boundaries (Section 1.5 for V3)
- The panel contract rules (Section 7.1)
- The file structure (Section 13) — new files go where the structure says
- The core data schemas (Section 6) — nothing gets passed that doesn't conform
- The known constraints and risks (Section 15)
- The V3 security model (Section 16) — API key rules are non-negotiable
- The privacy principles (Section 1.2) — no telemetry, no external data

### Step 2 — Read IMPLEMENTATION.md
Read the full document. Identify:
- Which milestone is currently active (check Section 0.2 status snapshot)
- What the definition of done says for the active milestone
- What tasks are completed vs remaining in the ordered task list
- All plan journal entries under the active milestone and their status tags
- Any `[PARTIAL]` or `[BLOCKED]` entries that need resolution before new work

### Step 3 — Read ERRORS.md
Scan every entry. Before touching any component, search for entries tagged
to that component. If a solution exists for a similar problem already encountered,
use it. Do not re-solve solved problems. Do not repeat logged mistakes.

### Step 4 — Read DECISIONS.md
Before proposing any architectural change, check this file.
If the decision has already been made, honor it.
Do not relitigate settled decisions unless explicitly instructed by the user.
If a decision needs to change, log the new decision in DECISIONS.md first,
then update ARCHITECTURE.md, then implement the change.

### Step 5 — Inspect Current Codebase State
Use the superpowers plugin to inspect the current state of the codebase.
Understand what exists before adding to it. Never assume file contents —
read them. Never assume a function exists — verify it.

### Step 6 — Generate and Log the Plan
Use the superpowers plugin to enter plan mode and generate a plan.

Rules for the plan:
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- The plan must reference specific file paths from ARCHITECTURE.md Section 12
- The plan must reference specific TypeScript interfaces from ARCHITECTURE.md Section 6
- The plan must not propose anything outside V1 scope without explicit user instruction
- If the task touches a component with ERRORS.md entries, the plan must acknowledge them

Once the plan is generated:
1. Append it to the correct milestone's Plan Journal in IMPLEMENTATION.md
2. Set its status tag to `[IN PROGRESS]`
3. Only then begin implementation

**Do not write any code before the plan is logged to IMPLEMENTATION.md.**

---

## 2. WORKFLOW ORCHESTRATION

### Plan First, Always
- Enter plan mode for any task with 3+ steps or architectural decisions
- Use plan mode for verification steps, not just building steps
- Write detailed plans upfront to eliminate ambiguity before it becomes bugs
- If something goes sideways during implementation — STOP. Do not keep pushing.
  Re-enter plan mode, reassess, update the plan in IMPLEMENTATION.md, then continue.

### Subagent Strategy
Use subagents for:
- Researching unfamiliar APIs or libraries before committing to them
  (e.g., investigating xterm.js PTY behavior on Windows before M1 implementation)
- Exploring multiple implementation approaches in parallel
- Offloading analysis that would bloat the main context window
- Any task where "one focused thing" is the right framing

One task per subagent. Keep the main context clean.

### Verify Plan Before Executing
After generating a plan and before writing any code:
- Confirm the plan does not violate the panel contract (ARCHITECTURE.md Section 7.1)
- Confirm all file paths exist in or are additive to ARCHITECTURE.md Section 13
- Confirm no out-of-scope features are being introduced
- Confirm the plan resolves the task's definition of done in IMPLEMENTATION.md
- If the plan touches API keys or credentials: confirm it complies with
  ARCHITECTURE.md Section 16 — no key ever reaches TypeScript, no key in config JSON,
  no getApiKey command exists. Any plan that violates these rules must be revised.

If any of these checks fail, revise the plan before proceeding.

---

## 3. DURING IMPLEMENTATION

### Minimal Impact
Every change touches only what is necessary to accomplish the task.
Do not refactor adjacent code while implementing a feature.
Do not "improve" code that isn't broken.
Do not introduce new dependencies without a DECISIONS.md entry.
Changes should be surgical, not sweeping.

### Panel Contract Is Absolute
The panel contract (ARCHITECTURE.md Section 7.1) is never violated. Ever.
- Panels receive PanelProps and nothing else as external input
- Panels never import from another panel's directory
- Panels never dispatch to global state directly
- Panels clean up ALL resources on unmount — this is not optional

If a feature seems to require violating the panel contract, stop.
Log the conflict in DECISIONS.md and discuss with the user before proceeding.

### No Hardcoded Values
- No hardcoded hex colors — use CSS variables from `src/theme/variables.css`
- No hardcoded file paths — use projectRoot from workspace config
- No hardcoded panel types — use PANEL_REGISTRY
- No hardcoded widget types — use widget registry
- No hardcoded port numbers — use settings from config schema

### Demand Elegance (Balanced)
For non-trivial changes, pause and ask: "Is there a more elegant way?"
If a fix feels hacky, implement it correctly: "Knowing everything I know now,
implement the elegant solution."
Skip this for simple, obvious fixes — do not over-engineer.
Challenge your own work before marking a task done.

---

## 4. VERIFICATION BEFORE DONE

Never mark a task complete without proving it works.
A task is not done because the code was written. It is done because it works.

### Verification Standards
- Run `pnpm tsc --noEmit` — zero TypeScript errors before any commit
- Test the specific behavior the task was meant to implement
- Test the error state, not just the happy path
- Test unmount/cleanup for any panel or component that manages resources
- Check browser/app devtools for console errors — zero errors is the standard
- For panel implementations: verify the panel contract is satisfied
- For persistence changes: verify close and reopen preserves state correctly
- Ask: "Would a staff engineer approve this?" before marking done

### Definition of Done Checklist
After implementation, return to the active milestone's definition of done
in IMPLEMENTATION.md. Every checkbox must be checked before the milestone
is marked complete. If a checkbox cannot be checked, the milestone is
`[PARTIAL]` — document what remains in the plan journal entry.

### Commit Standards
- One commit per completed logical unit of work
- Commit message format: "M{N} — {short description of what was done}"
- Example: "M1 — terminal panel end to end, PTY confirmed working"
- Never commit with TypeScript errors
- Never commit with console errors

---

## 5. ERROR AND CORRECTION LOGGING

### When to Log to ERRORS.md
Log immediately when any of the following occur:
- A bug is encountered and fixed
- An integration behaves unexpectedly (library, Tauri API, OS behavior)
- A workaround is implemented for a third-party limitation
- The user corrects Claude Code's approach or output
- An assumption in the plan turned out to be wrong
- A known risk from ARCHITECTURE.md Section 14 manifests

**After any correction from the user: update ERRORS.md immediately.**
This is non-negotiable. User corrections are the highest-signal lessons
available. They must be captured before the session ends.

### ERRORS.md Entry Format
```
## [{COMPONENT-TAG}] {One-line summary title}
**Date:** YYYY-MM-DD
**Milestone:** M{N}
**Tags:** {component}, {technology}, {pattern}

**Problem:**
{What went wrong and in what context}

**Failed Approaches:**
{What was tried that didn't work, and why}

**Solution:**
{What actually fixed it}

**Implications:**
{What this means for other parts of the codebase or future work}
```

### When to Log to DECISIONS.md
Log when:
- A new library or dependency is chosen
- An architectural approach is selected over alternatives
- A V1 scope decision is made or changed
- A panel contract exception is considered (and rejected or approved)
- Any choice is made where the rationale might not be obvious later

---

## 6. AUTONOMOUS BUG FIXING

When given a bug report, fix it. Do not ask for hand-holding.

Standard procedure:
1. Read the error — logs, stack traces, failing behavior description
2. Identify the root cause — not the symptom
3. Check ERRORS.md for similar issues already solved
4. Fix the root cause — not the symptom
5. Verify the fix works
6. Log to ERRORS.md if the bug revealed something non-obvious
7. Report what was found and what was done — concise summary

No temporary fixes. No "this should work for now." Senior developer standard.
Find the root cause. Fix it correctly.

---

## 7. SELF-IMPROVEMENT LOOP

After any correction from the user:
1. Understand why the correction was needed
2. Write a rule in ERRORS.md that would have prevented the mistake
3. If the mistake reveals a gap in ARCHITECTURE.md or IMPLEMENTATION.md, flag it
4. At the start of the next session, ERRORS.md is read — the lesson carries forward

The goal is that the mistake rate drops over time as the reference files
accumulate institutional knowledge. Every correction is an investment
in future session quality.

---

## 8. WHAT NEVER CHANGES

These rules are permanent. They do not get revised based on task pressure,
time pressure, or "just this once" reasoning.

- Pre-flight checklist runs every session, in full, in order
- Plans are logged to IMPLEMENTATION.md before code is written
- Panel contract is never violated
- TypeScript errors are never committed
- User corrections always trigger an ERRORS.md entry
- No file is created outside ARCHITECTURE.md Section 12 without a DECISIONS.md entry
- V1 scope is respected — out-of-scope features go to IMPLEMENTATION.md Appendix A

---

## 9. QUICK REFERENCE

| Question | Answer |
|---|---|
| Where do new files go? | ARCHITECTURE.md Section 12 |
| What are the TypeScript schemas? | ARCHITECTURE.md Section 6 |
| What is the panel contract? | ARCHITECTURE.md Section 7.1 |
| What CSS variables exist? | ARCHITECTURE.md Section 13.1 |
| What milestone is active? | IMPLEMENTATION.md Section 0.2 |
| What's the definition of done? | IMPLEMENTATION.md active milestone |
| Has this error been seen before? | ERRORS.md |
| Has this decision been made? | DECISIONS.md |
| What's out of scope for V3? | ARCHITECTURE.md Section 1.5 + IMPLEMENTATION.md Appendix A |
| API key security rules? | ARCHITECTURE.md Section 16 — read before any credentials work |
| Privacy rules? | ARCHITECTURE.md Section 1.2 + Section 16.2 |

---

*End of CLAUDE.md*
*Version 2.0 — Updated 2026-02-25 for V3*
*This file runs first. Every session. No exceptions.*
