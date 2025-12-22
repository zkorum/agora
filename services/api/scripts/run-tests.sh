#!/bin/bash
# Run tests with proper Docker/Podman configuration
#
# This script auto-detects whether Docker or Podman is being used
# and sets the appropriate environment variables for testcontainers.

set -e

# Check if we're using Podman (not Docker Desktop)
if command -v podman &> /dev/null && podman machine inspect &> /dev/null; then
    # Get Podman socket path
    PODMAN_SOCKET=$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}' 2>/dev/null)

    if [ -n "$PODMAN_SOCKET" ] && [ -S "$PODMAN_SOCKET" ]; then
        echo "Detected Podman, configuring testcontainers..."
        export DOCKER_HOST="unix://$PODMAN_SOCKET"
        export TESTCONTAINERS_RYUK_DISABLED=true
    fi
fi

# Run vitest with any additional arguments passed to this script
exec pnpm vitest "$@"
