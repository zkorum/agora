#!/bin/bash
#
# Sync canonical shared-backend TypeScript source to explicit consumers.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_DIR="$(dirname "$SHARED_BACKEND_DIR")"
COMMENT="/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/"

add_warning_headers() {
    local target_dir="$1"
    find "$target_dir" -name "*.ts" -print0 | while read -r -d $'\0' file; do
        if ! grep -qF "$COMMENT" "$file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "1s;^;$COMMENT\n;" "$file"
            else
                sed -i "1i $COMMENT" "$file"
            fi
        fi
    done
}

echo "Syncing complete shared-backend source to api..."
API_TARGET="$SERVICES_DIR/api/src/shared-backend"
rsync -av --delete "$SHARED_BACKEND_DIR/src/" "$API_TARGET/"
add_warning_headers "$API_TARGET"

WORKER_TARGET="$SERVICES_DIR/conversation-email-update-worker/src/shared-backend"
if [ -d "$SERVICES_DIR/conversation-email-update-worker" ]; then
    echo "Syncing worker shared-backend subset..."
    rsync -av --delete --delete-excluded \
        --include='/config.ts' \
        --include='/conversationEmailUpdateSnsIngress.ts' \
        --include='/db.ts' \
        --include='/logger.ts' \
        --include='/schema.ts' \
        --include='/valkey.ts' \
        --exclude='*' \
        "$SHARED_BACKEND_DIR/src/" "$WORKER_TARGET/"
    add_warning_headers "$WORKER_TARGET"
fi

echo "Shared-backend sync complete."
