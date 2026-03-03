#!/bin/bash
#
# Sync universal shared code to ALL services (frontend + backend)
#

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_DIR="$(dirname "$SHARED_DIR")"

# List of ALL services to sync to
ALL_SERVICES=("agora" "api" "math-updater" "export-worker" "load-testing")

# Warning comment to add to synced files
COMMENT="/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/"

echo "Syncing universal shared code to all services..."

# Sync to each service
for service in "${ALL_SERVICES[@]}"; do
    TARGET_DIR="$SERVICES_DIR/$service/src/shared"

    # Check if service directory exists
    if [ ! -d "$SERVICES_DIR/$service" ]; then
        echo "Warning: Service directory $service does not exist yet, skipping..."
        continue
    fi

    echo "  → Syncing to $service..."

    # Use rsync to copy files
    rsync -av --delete "$SHARED_DIR/src/" "$TARGET_DIR/"

    # Add warning comment to all TypeScript files
    find "$TARGET_DIR" -name "*.ts" -print0 | while read -d $'\0' file; do
        # Check if the comment already exists in the file
        if ! grep -qF "$COMMENT" "$file"; then
            # Add comment at the beginning of the file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "1s;^;$COMMENT\n;" "$file"
            else
                # Linux
                sed -i "1i $COMMENT" "$file"
            fi
        fi
    done
done

echo "✓ Universal sync complete!"
