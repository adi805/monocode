#!/usr/bin/env bash
# Restores the helper four workflows call but which was never committed, so the
# "Process existing release(s)" step stops dying with exit 127 before any real
# work runs. Release, host, windows-artifact and Test-installer are all red on
# main at every schedule tick for exactly this reason.
#
# Rule encoded here: a PUBLISHED GitHub release is immutable - `gh release
# create` against a published tag returns success WITHOUT uploading anything, so
# "it said done" is not proof the assets are fresh. Replacing an asset means
# deleting the tag ref, re-pushing it, then draft-upload-verify-publish, and
# regenerating SHA256SUMS whenever any asset changes.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
ACTION="${1:?usage: immutable-release.sh <process|ensure-republishable|is-published> [tag]}"
TAG="${2:-${RELEASE_TAG:-}}"

release_exists() {
  [ -n "$TAG" ] || return 1
  gh api "repos/$REPO/releases/tags/$TAG" >/dev/null 2>&1
}

case "$ACTION" in
  process)
    # Normal build path: leave any published release untouched. Republishing is
    # an explicit operator action, never a side effect of a build.
    if release_exists; then
      echo "immutable-release: release '$TAG' is published and stays as-is"
    else
      echo "immutable-release: no published release for '$TAG'; nothing to process"
    fi
    ;;
  is-published)
    if release_exists; then echo published; else echo absent; exit 1; fi
    ;;
  ensure-republishable)
    [ -n "$TAG" ] || { echo "immutable-release: ensure-republishable needs a tag" >&2; exit 2; }
    if release_exists; then
      echo "immutable-release: deleting tag '$TAG' so assets can be re-uploaded"
      gh api -X DELETE "repos/$REPO/git/refs/tags/$TAG" >/dev/null 2>&1 || true
    else
      echo "immutable-release: tag '$TAG' is not published"
    fi
    ;;
  *)
    echo "immutable-release: unknown action '$ACTION'" >&2
    exit 2
    ;;
esac
