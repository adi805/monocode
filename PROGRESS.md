---
document_type: project-progress
project: "MonoCode OpenCrabs Provider"
prd: "PRD.md"
status: draft
current_milestone: 0
total_milestones: 3
last_updated: "2026-10-03 02:10"
---

# MonoCode OpenCrabs Provider Progress

Live state for this target only. The PRD owns milestone outcomes, Done When, and FR/NFR/AC coverage; reference them rather than copying the specification.

## Current State

- PRD version: 0.1.0 (draft, structural validation passed: 10 sections, 19 requirements, 38 acceptance criteria, 14 traceability rows, 2 diagrams, 0 blockers)
- Execution mode: native by default; retain existing/requested runner mode.
- Build authority: Not started - this PRD was generated from existing-project context, and no new build request has been issued for the remaining work.
- Active milestone / next action: Milestone 1 evidence is largely historical. The next useful action is to close the gaps listed below, starting with a local (non-bridged) run and a live attachment plus native-command check.
- Required unresolved input: A reachable host running the agent build plus working key-based SSH for any remote re-verification. Owner decision pending on the wire-name migration for the model and compact calls (see Review Focus in the PRD).

## Milestones And Evidence

| # | PRD milestone reference | Status | Current evidence / remaining gap |
|---|---|---|---|
| 1 | Milestone 1: Local provider is runnable and visible | ✅ Verified | Verified 2026-10-02 through the bridge: the picker filled with the server's live catalog and a probe turn returned a reply from the GUI, and the session appeared in the server's own store. Gap: the local (non-bridged) path on Windows has never been exercised, and no evidence was captured in this session; the renderer and unit suites were not re-run here. |
| 2 | Milestone 2: Complete scope | 🔄 In Progress | The bridge turn, session resume, model and mode control, permission surfacing, and the ceiling and transport messages exist in source. Gaps with no live evidence: attachment delivery as path references, native slash commands in the picker, cancel, steer, and compact from the GUI, and the setup guide walkthrough on a clean machine. |
| 3 | Milestone 3: Integrated audit and repair | ⬜ Not Started | No integrated audit exists. Every requirement still needs a source-state-bound VERIFIED or explicitly UNVERIFIED status. |

Statuses: ⬜ Not Started, 🔄 In Progress, ✅ Verified, ✅ Approved. Verified means required checks passed; Approved requires an actual owner verdict.

## Resume And Changes

Changed paths recorded so far (fork `adi805/monocode`, main at commit `6b944a4`):

- `src/integrations/harness/providers/opencrabs/` (8 files, the provider)
- `src/integrations/harness/core/{registry,register,availability,child}.ts` (contract wiring)
- `src/features/sessions/model/session.ts` and the harness icon map (identifier, label, icon)
- `src-tauri/src/harness.rs` (binary resolution and accepted stems)
- `docs/WINDOWS-SETUP.md` (setup guide)
- `.github/workflows/pr-agent.yml` (review workflow, pinned to a commit identifier)

Source-bound checks already performed:

- Release `v0.5.0` published from commit `27cd55f1`; assets re-downloaded and checksum-verified.
- The model-picker test regression caused by the eleventh harness was repaired in commit `6b944a4` and the full check matrix passed on all three platforms.

Preserved failures worth keeping:

- A release published as immutable silently keeps its previous assets, so "fresh bytes" claims were false until the republish rule (draft, upload with clobber, verify, publish) was adopted. Always verify by re-downloading and checking the digest.
- A green CI badge on a path-filtered job is not proof that the platform lane compiled or ran.

Follow the PRD's embedded builder contract; no new approval gate is created by this file or an ordinary milestone transition.
