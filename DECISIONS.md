---
document_type: project-decision-log
project: "MonoCode OpenCrabs Provider"
status: active
created: "2026-10-03"
---

# MonoCode OpenCrabs Provider Decision Log

Use this file as the target project's source of truth for approved and proposed product, architecture, implementation, security, and operational decisions. Do not record PRD Toolkit policy here.

## Entry Format

```markdown
- [YYYY-MM-DD HH:mm] Decision: [short title]
  Status: Proposed | Accepted | Reopened | Superseded
  Approval: [Owner evidence or N/A - not yet accepted]
  Requirement IDs: [FR-###, NFR-###, or N/A - governance-only decision]
  Context: [why the decision was needed]
  Rationale: [why this option is preferred]
  Impact: [what changes because of this decision]
```

## Decisions

- [2026-10-01 00:00] Decision: Keep the original product name MonoCode in this fork
  Status: Accepted
  Approval: Owner instruction in the working chat, 2026-10-01
  Requirement IDs: N/A - governance-only decision
  Context: The fork was briefly rebranded, which read as taking credit from the original project.
  Rationale: The upstream project and its author deserve the credit; the fork's additions are a provider, not a new product identity.
  Impact: Product name, application identifier, window title, and release asset names all stay MonoCode; the README keeps an explicit credit note.

- [2026-09-30 00:00] Decision: Implement OpenCrabs as a first-class harness in the existing contract
  Status: Accepted
  Approval: Owner instruction to build the integration in this fork, 2026-09-30
  Requirement IDs: FR-001, FR-002
  Context: The GUI needed to reach an always-on agent, and upstream had paused new provider contributions.
  Rationale: Reusing the shared registry, adapter, availability, and model contracts keeps the provider maintainable and mergeable instead of inventing a parallel mechanism.
  Impact: The harness identifier union, harness list, labels, icons, availability probe, native binary resolution, and host provider contract all gained one entry.

- [2026-10-01 00:00] Decision: Deliver attachments as path references
  Status: Accepted
  Approval: Owner requirement that screenshots work in the chat surface
  Requirement IDs: FR-008
  Context: The pinned server build declares its image prompt capability as false and reads path references instead.
  Rationale: Path references work against both the pinned build and a newer one, so the client does not need to branch on server version.
  Impact: Every attachment kind is rewritten as a path reference; a pasted blob is persisted to disk first, and an attachment with neither path nor data fails the send instead of being dropped.

- [2026-10-01 00:00] Decision: Keep the bridge generic and configure the host by environment
  Status: Accepted
  Approval: Owner instruction after a host string leaked into an earlier bridge build
  Requirement IDs: FR-012, NFR-003
  Context: The first bridge build carried a specific host and username.
  Rationale: A site-specific binary cannot be published, and host strings in artifacts are a security and privacy problem.
  Impact: The bridge reads its target and remote binary path from environment variables; shipped artifacts must contain no host or username literal.

- [2026-10-01 00:00] Decision: Raise the client budgets for handshake, session, and turn
  Status: Accepted
  Approval: Owner-observed failures during setup
  Requirement IDs: NFR-001, FR-013
  Context: A 30-second handshake budget lost to a roughly 17-second runtime boot plus catalog work, and a 30-minute turn ceiling was exceeded by ordinary long agent turns.
  Rationale: The server boots a full runtime before it can answer, and long agentic turns legitimately outlive short caps.
  Impact: Handshake 120 seconds, session request 45 seconds, control calls 15 seconds, turn ceiling 120 minutes, with a ceiling-specific message that is distinct from the transport help banner.

- [2026-10-02 00:00] Decision: Pin the review workflow to a commit identifier
  Status: Accepted
  Approval: Automated review finding on the workflow pull request, accepted by the owner
  Requirement IDs: N/A - governance-only decision
  Context: The workflow initially referenced a movable tag on a public repository.
  Rationale: A movable reference in a public repository is a supply-chain risk; a commit identifier is immutable.
  Impact: The workflow pins its action to a commit identifier and drops the unnecessary write permission.

- [2026-10-02 00:00] Decision: Defer the model and compact wire-name migration
  Status: Superseded
  Approval: N/A - not yet accepted
  Requirement IDs: FR-005, FR-010
  Context: Upstream moved these calls behind a prefixed namespace and keeps the old spelling for one release; the fork currently sends the old spelling.
  Rationale: The migration is a pure rename with identical parameters, so it can ship with the next release rather than blocking on it.
  Impact: The next release should send the prefixed names and read the catalog through the newer options surface, so nothing depends on the legacy spelling when upstream retires it.
  Superseded by: the 2026-10-03 entry below. The premise turned out to be incomplete: deferring was safe, but sending only the prefixed name would not have been.

- [2026-10-03 02:50] Decision: Send the prefixed wire names first and fall back to the legacy names only on method-not-found
  Status: Accepted
  Approval: Owner instruction "Gas semua pake plan" in the working chat, 2026-10-03, covering this plan task
  Requirement IDs: FR-005, FR-010, NFR-004
  Context: A live probe of the deployed agent binary captured `{"error":{"code":-32601,"message":"method not found: _opencrabs/set_model"}}` and the same for `_opencrabs/compact`, while the legacy `session/set_model` and `session/compact` both answered success. The deployed build predates the upstream rename, so the direction of compatibility is the reverse of what the deferred decision assumed.
  Rationale: Trying the prefixed name first and falling back on method-not-found is the only ordering that works against both the deployed 0.5.4 server and a post-migration server. Falling back on any other error would hide a real failure, so the fallback is gated on the method-not-found condition alone.
  Impact: `SET_MODEL_METHODS` and `COMPACT_METHODS` are prefixed-first pairs consumed by `requestAcrossRenames` at the two call sites. `configOptions` is now read when present, with the older `models` field as the fallback, because the probe confirmed `configOptions` is absent (0 hits) on the deployed server. Covered by `opencrabsProtocol.test.ts`; check and host jobs success on all three platforms.

## AI Agent Rules

1. Read this file before proposing a target-project architecture or policy change.
2. Append decisions; do not silently rewrite prior entries.
3. Mark a decision `Accepted` only with explicit owner approval evidence.
4. Mark an earlier decision `Superseded` instead of deleting it.
5. Do not mix PRD Toolkit governance with this target project's decisions.
