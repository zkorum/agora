#!/bin/bash
# Run Scenario 1 with Prometheus metrics output for real-time Grafana monitoring
#
# Usage: ./run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_ID>
# Example: ./run-scenario1-with-monitoring.sh abc123xyz

set -e

if [ -z "$1" ]; then
    echo "Error: CONVERSATION_SLUG_ID is required"
    echo "Usage: ./run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_ID>"
    exit 1
fi

CONVERSATION_SLUG_ID=$1
PROMETHEUS_URL="http://localhost:9090/api/v1/write"

echo "=========================================="
echo "Running Scenario 1: Single Conversation"
echo "Conversation ID: $CONVERSATION_SLUG_ID"
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
echo "Logs will be saved to load-testing.log"
echo ""

K6_PROMETHEUS_RW_SERVER_URL=$PROMETHEUS_URL \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
k6 run \
    -e CONVERSATION_SLUG_ID="$CONVERSATION_SLUG_ID" \
    --out experimental-prometheus-rw \
    dist/scenario1-single-conversation.cjs 2>&1 | tee load-testing.log
