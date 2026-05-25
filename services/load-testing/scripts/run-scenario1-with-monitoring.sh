#!/bin/bash
# Run Scenario 1 with Prometheus metrics output for real-time Grafana monitoring
#
# Usage: ./run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_IDS>
# Example: ./run-scenario1-with-monitoring.sh abc123xyz,def456uvw

set -e

if [ -z "$1" ]; then
    echo "Error: CONVERSATION_SLUG_IDS is required"
    echo "Usage: ./run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_IDS>"
    exit 1
fi

CONVERSATION_SLUG_IDS=$1
PROMETHEUS_URL="http://localhost:9090/api/v1/write"
export CONVERSATION_SLUG_IDS

echo "=========================================="
echo "Running Scenario 1: Conversation Voting"
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
echo "Logs will be saved under .local/logs/latest/"
echo ""

K6_PROMETHEUS_RW_SERVER_URL=$PROMETHEUS_URL \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
node ../../scripts/dev-log-runner.mjs --service load-testing -- bash -lc '
    cd services/load-testing &&
    k6 run \
        -e CONVERSATION_SLUG_IDS="$CONVERSATION_SLUG_IDS" \
        --summary-export "$AGORA_LOG_SUMMARY_FILE" \
        --out experimental-prometheus-rw \
        dist/scenario1-single-conversation.cjs
'
