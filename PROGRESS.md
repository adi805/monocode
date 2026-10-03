---
document_type: project-progress
project: "MonoCode OpenCrabs Provider"
prd: "PRD.md"
status: draft
current_milestone: 0
total_milestones: 3
last_updated: "2026-10-03 02:55"
---

# MonoCode OpenCrabs Provider Progress

Live state for this target only. The PRD owns milestone outcomes, Done When, and FR/NFR/AC coverage; reference them rather than copying the specification.

## Current State

- PRD version: 0.1.0 (draft, structural validation passed: 10 sections, 19 requirements, 38 acceptance criteria, 14 traceability rows, 2 diagrams, 0 blockers).
- Fork main: `063fa000`. The wire-name migration (PR #5) and the PRD set (PR #4) are both merged and green on the full check and host matrix.
- Execution mode: native. Build authority: the two merged PRs were declared local runner transitions; nothing external was published in this pass.
- Active milestone / next action: Milestone 2 still needs GUI-bound evidence. The next useful action is a desktop run that observes permission approval, attachment delivery, the command picker, and the cancel/steer/compact controls.
- Required unresolved input: a Windows desktop session to exercise the GUI-only rows, and a decision on whether to run a real `session/prompt` against the production agent to prove attachment delivery.

## Evidence Sources Used Here

| Tag | What it means | Where |
|---|---|---|
| PROBE | A real JSON-RPC response captured from the deployed agent binary | `~/.opencrabs/projects/opencrabs-win/acp-probe-2026-10-03/` (`phase1.jsonl`, `phase2.jsonl`, `FINDINGS.md`), captured 2026-10-03 against `opencrabs 0.5.4` |
| CI | Automated check or host job concluded success on the fork's main or on a merged PR head | GitHub checks on `adi805/monocode` |
| SRC | Read out of the merged source tree, no runtime involved | `git show origin/main:<path>` |
| PRIOR | Recorded in an earlier session and not re-run here | Noted inline |
| (none) | No evidence exists yet | Listed as UNVERIFIED |

## Per-Requirement Status

| ID | Status | Evidence or named blocker |
|---|---|---|
| FR-001 | VERIFIED | SRC: provider registered in the shared harness list. CI: check and host jobs success on `063fa000`. PRIOR: harness selectable in the 2026-10-02 desktop screenshot. |
| FR-002 | UNVERIFIED | SRC: resolver takes a configured path then per-platform candidates. Blocker: no Windows desktop run, so the `LOCALAPPDATA` candidate order has never been exercised on a real machine. |
| FR-003 | VERIFIED | PROBE: `initialize` answered by `opencrabs 0.5.4` with `loadSession=true`; `session/new` returned a session id; `session/load` restored a session by that id. |
| FR-004 | VERIFIED | PROBE: live catalog of 17 provider/model pairs with `currentModelId=zai/glm-5.1`. SRC: eager probe before the first message. CI: green. |
| FR-005 | PARTIAL | PROBE: legacy `session/set_model` and `session/set_mode` both answered success. Blocker: a GUI-driven turn was not observed in this pass. |
| FR-006 | UNVERIFIED | SRC only: streaming update handling exists. Blocker: no observed message, reasoning, and tool event sequence from a live turn. |
| FR-007 | UNVERIFIED | Blocker: needs a GUI that raises a permission prompt and a plan-mode turn that auto-answers. Not exercised. |
| FR-008 | UNVERIFIED | Deliberately deferred: proving path-reference delivery requires a real `session/prompt` against the production agent. Not run. |
| FR-009 | PARTIAL | PROBE: `available_commands_update` pushed a full command list after `session/new`. Blocker: the composer's command picker was not observed rendering those commands. |
| FR-010 | PARTIAL | PROBE: `session/compact` answered with `stopReason=end_turn`. Blocker: `session/cancel` and `_session/steer` are notifications with no response id, so proving them needs an in-flight turn. |
| FR-011 | UNVERIFIED | SRC only: the four text-harness outputs exist. Blocker: no live title, commit message, pull-request body, or branch name observed. |
| FR-012 | PARTIAL | SRC: bridge reads target and remote binary from the environment. PRIOR: the artifact host-literal scan came back with zero hits in an earlier session and was not re-run. Blocker: no bridge session opened in this pass. |
| FR-013 | UNVERIFIED | Blocker: needs an induced timeout and a wedged-transport case on a desktop to confirm the distinct messages and the recycling. |
| FR-014 | UNVERIFIED | Blocker: the guide has never been walked through on a clean machine. |
| NFR-001 | PARTIAL | PROBE: the handshake needs the full boot window before `session/new` (30 s wait used in the reproduction). CI: budget constants compile green. Blocker: the overrun-and-kill path was not exercised. |
| NFR-002 | UNVERIFIED | Blocker: needs a real failure to confirm no orphaned child and a successful resume. |
| NFR-003 | PARTIAL | SRC: no host or credential literal in the adapter or the guide. PRIOR: the history and artifact scan is from an earlier session. Blocker: not re-run here. |
| NFR-004 | VERIFIED | PROBE plus CI together: the deployed 0.5.4 answers `-32601 method not found` for `_opencrabs/set_model` and `_opencrabs/compact`, and the merged adapter now tries the prefixed name and falls back to the legacy name only on method-not-found. That fallback is the graceful-degradation contract, and it is covered by `opencrabsProtocol.test.ts` (182 lines added, checks success on all three platforms). |
| NFR-005 | UNVERIFIED | Blocker: no captured stderr-forwarding or event-sequence evidence in this pass. |

Status tags: VERIFIED means the named evidence exists; PARTIAL means part of the requirement is proven and the remainder has a named blocker; UNVERIFIED means no evidence yet. None of these is an owner approval.

## Milestones And Evidence

| # | PRD milestone reference | Status | Current evidence / remaining gap |
|---|---|---|---|
| 1 | Milestone 1: Local provider is runnable and visible | ✅ Verified | PROBE and CI cover the handshake, session open, and live catalog. PRIOR desktop evidence from 2026-10-02. Gap: the local (non-bridged) Windows path still has no run of its own. |
| 2 | Milestone 2: Complete scope | 🔄 In Progress | Closed this pass: the wire-name contract (FR-005, FR-010, NFR-004) and the command-push surface (FR-009 partial). Still open: FR-006, FR-007, FR-008, FR-011, FR-013, and the FR-014 walkthrough. All need a desktop run or a deliberate live prompt. |
| 3 | Milestone 3: Integrated audit and repair | 🔄 In Progress | This table is the first per-requirement audit: every FR and NFR now carries a status and either an evidence pointer or a named blocker. Remaining work is to convert UNVERIFIED rows to VERIFIED, not to re-scope them. |

## Resume And Changes

Changed paths recorded so far (fork `adi805/monocode`, main at `063fa000`):

- `src/integrations/harness/providers/opencrabs/` (the provider)
- `src/integrations/harness/providers/opencrabs/opencrabsProtocol.ts` (wire-name pairs, `isMethodNotFound`, `requestAcrossRenames`, `catalogFromConfigOptions`)
- `src/integrations/harness/providers/opencrabs/opencrabsProtocol.test.ts` (new, 182 lines)
- `src/integrations/harness/core/{registry,register,availability,child}.ts` (contract wiring)
- `src/features/sessions/model/session.ts` and the harness icon map (identifier, label, icon)
- `src-tauri/src/harness.rs` (binary resolution and accepted stems)
- `docs/WINDOWS-SETUP.md` (setup guide)
- `.github/workflows/pr-agent.yml` (review workflow, pinned to a commit identifier)
- `PRD.md`, `PROGRESS.md`, `DECISIONS.md` (this document set)

Source-bound checks already performed:

- The two model and compact method pairs resolve prefixed-first with a legacy fallback at `opencrabs.ts:245` and `opencrabs.ts:442`; the fallback fires only on method-not-found, so an unrelated server error still surfaces.
- `configOptions` is absent from the deployed server's responses (0 hits in both probe transcripts), so the catalog read prefers `configOptions` only when the field is actually present and otherwise keeps using `models.availableModels`.
- The deployed binary advertises `promptCapabilities.image=false`. Image support is a fork-side protocol change and is not live on this host: a deployment gap, not a code gap.
- Release `v0.5.0` published from commit `27cd55f1`; assets re-downloaded and checksum-verified (PRIOR).
- The model-picker regression caused by the eleventh harness was repaired in `6b944a4` and the full check matrix passed on all three platforms.

Preserved failures worth keeping:

- A green CI badge on a path-filtered job is not proof that the platform lane compiled or ran. The false-green class this project filed upstream still applies to anything filtered.
- A release published as immutable silently keeps its previous assets, so "fresh bytes" claims were false until the republish rule (draft, upload with clobber, verify, publish) was adopted. Always verify by re-downloading and checking the digest.
- Assuming a server accepts a method because upstream main added it is wrong for a pinned older binary. This pass nearly shipped a prefixed-only call that would have broken against the deployed 0.5.4; the probe caught it.

Follow the PRD's embedded builder contract; no new approval gate is created by this file or an ordinary milestone transition.
