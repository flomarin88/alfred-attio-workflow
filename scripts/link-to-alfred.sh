#!/usr/bin/env bash
#
# Symlinks this project directory into Alfred's workflows folder so edits
# in the repo (info.plist + bundled JS + icons) are picked up instantly
# without copy/paste or re-importing the .alfredworkflow file.
#
# Idempotent — re-running just verifies the link.

set -euo pipefail

BUNDLE_ID="flomarin88.attio.workflow"
ALFRED_WORKFLOWS_DIR="$HOME/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ALFRED_WORKFLOWS_DIR/$BUNDLE_ID"

if [ ! -d "$ALFRED_WORKFLOWS_DIR" ]; then
    echo "Alfred workflows folder not found at:"
    echo "  $ALFRED_WORKFLOWS_DIR"
    echo
    echo "Open Alfred → Preferences once, then re-run this script."
    exit 1
fi

if [ -L "$TARGET" ]; then
    CURRENT="$(readlink "$TARGET")"
    if [ "$CURRENT" = "$PROJECT_DIR" ]; then
        echo "Already linked: $TARGET → $PROJECT_DIR"
        exit 0
    fi
    echo "Replacing existing symlink at $TARGET (pointed at $CURRENT)"
    rm "$TARGET"
elif [ -e "$TARGET" ]; then
    echo "ERROR: a non-symlink already exists at:"
    echo "  $TARGET"
    echo
    echo "Move it aside first (e.g. rename to '$BUNDLE_ID.backup') so this script"
    echo "can install the dev symlink without clobbering data."
    exit 1
fi

ln -s "$PROJECT_DIR" "$TARGET"
echo "Linked: $TARGET → $PROJECT_DIR"
echo
echo "Restart Alfred (or run: killall Alfred && open -a Alfred) to pick up the workflow."
