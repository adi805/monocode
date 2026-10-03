#!/usr/bin/env bash
# Restore the immutable-release helper that the workflows call but that was
# never committed, so Release / host / windows-artifact / Test-installer stop
# dying with 127 "command not found" before they reach any real work.
#
# Published GitHub releases are immutable: `gh release create` against an
# existing published tag returns success WITHOUT uploading, which is how two
# "fresh bytes" claims turned out to be false. The rule this enforces is the
# republish path: delete the tag, re-push it, then draft-upload-verify-publish,
# and always regenerate SHA256SUMS after replacing any asset.
set -euo pipefail

REPO="${1:?usage: immutable-release.sh <process|ensure-republishable> [owner/repo] [tag]}"
ACTION="${2:-process}"
TARGET_REPO="${3:-$GITHUB_REPOSITORY}"
TAG="${4:-}"

gh_api() { gh api "$@"; }

case "$ACTION" in
  process)
    # Nothing to do on a normal build; a published release is left untouched.
    echo "immutable-release: no published release processing for '$TAG' on $TARGET_REPO"
    ;;
  is-published)
    [ -n "$TAG" ] || { echo "immutable-release: is-published needs a tag" >&2; exit 2; }
    if gh_api "repos/$TARGET_REPO/releases/tags/$TAG" >/dev/null 2>&1; then
      echo "published"
      exit 0
    fi
    echo "absent"
    exit 1
    ;;
  ensure-republishable)
    [ -n "$TAG" ] || { echo "immutable-release: ensure-republishable needs a tag" >&2; exit 2; }
    if gh_api "repos/$TARGET_REPO/releases/tags/$TAG" >/dev/null 2>&1; then
      echo "immutable-release: $TAG is published; deleting so assets can be replaced"
      gh_api -X DELETE "repos/$TARGET_REPO/git/refs/tags/$TAG" >/dev/null 2>&1 || true
      exit 0
    fi
    echo "immutable-release: $TAG has no published release"
    ;;
  *)
    echo "immutable-release: unknown action '$ACTION'" >&2
    exit 2
    ;;
esac
