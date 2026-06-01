#!/bin/bash
#
# Sync shared-backend TypeScript code to TypeScript backend services
#

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_DIR="$(dirname "$SHARED_BACKEND_DIR")"

# Explicit TypeScript backend consumers. Python services should use generated
# artifacts instead of synced TypeScript source. Future TypeScript agents should
# be added here deliberately once implemented.
TS_BACKEND_SERVICES=("api")

# Warning comment to add to synced files
COMMENT="/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/"

echo "Syncing shared-backend TypeScript code..."

# Sync to each TypeScript backend service
for service in "${TS_BACKEND_SERVICES[@]}"; do
    TARGET_DIR="$SERVICES_DIR/$service/src/shared-backend"

    # Check if service directory exists
    if [ ! -d "$SERVICES_DIR/$service" ]; then
        echo "Warning: Service directory $service does not exist yet, skipping..."
        continue
    fi

    echo "  → Syncing to $service..."

    # Use rsync to copy files
    rsync -av --delete "$SHARED_BACKEND_DIR/src/" "$TARGET_DIR/"

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

echo "✓ Sync complete!"
