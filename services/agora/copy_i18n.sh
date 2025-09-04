#!/bin/bash
# copy_i18n.sh
# Usage: ./copy_i18n.sh <source_dir> <destination_dir> [--delete]

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <source_dir> <destination_dir> [--delete]"
  exit 1
fi

SRC="$1"
DEST="$2"
DELETE_FLAG=""

if [ ! -d "$SRC" ]; then
  echo "Error: Source directory does not exist: $SRC"
  exit 1
fi

# Handle optional delete flag
if [ "$3" == "--delete" ]; then
  DELETE_FLAG="--delete"
  echo "⚠️  Warning: Extra files in $DEST will be deleted!"
fi

# Run rsync
rsync -avm \
  --include='*.i18n.ts' \
  --include='*/' \
  --include='i18n/**' \
  --include='src/i18n/**' \
  --exclude='*' \
  $DELETE_FLAG \
  "$SRC"/ "$DEST"/
