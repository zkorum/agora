#!/bin/bash
# Run Scenario 2 with Prometheus metrics output for real-time Grafana monitoring
#
# Usage: ./run-scenario2-with-monitoring.sh <CONVERSATION_SLUG_IDS>
# Example: ./run-scenario2-with-monitoring.sh abc123,def456,ghi789

set -e

if [ -z "$1" ]; then
    echo "Error: CONVERSATION_SLUG_IDS is required (comma-separated)"
    echo "Usage: ./run-scenario2-with-monitoring.sh <CONVERSATION_SLUG_IDS>"
    echo "Example: ./run-scenario2-with-monitoring.sh abc123,def456,ghi789"
    exit 1
fi

CONVERSATION_SLUG_IDS=$1
PROMETHEUS_URL="http://localhost:9090/api/v1/write"

echo "=========================================="
echo "Running Scenario 2: Multiple Conversations"
echo "Conversation IDs: $CONVERSATION_SLUG_IDS"
echo "Prometheus URL: $PROMETHEUS_URL"
echo "Grafana: http://localhost:3000"
echo "=========================================="
echo ""
echo "Building k6 tests..."
cd "$(dirname "$0")/.."
pnpm run build

echo ""
echo "Starting load test with Prometheus metrics..."
echo "Open Grafana at http://localhost:3000 to view real-time metrics"
echo ""

K6_PROMETHEUS_RW_SERVER_URL=$PROMETHEUS_URL \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
k6 run \
    -e CONVERSATION_SLUG_IDS="$CONVERSATION_SLUG_IDS" \
    --out experimental-prometheus-rw \
    dist/scenario2-multiple-conversations.cjs
