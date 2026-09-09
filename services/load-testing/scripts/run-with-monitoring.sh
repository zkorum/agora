#!/bin/bash
set -euo pipefail

SCENARIO="${1:-}"
case "$SCENARIO" in
    conversation-voting) LOG_SERVICE=load-testing ;;
    solidago-ranking) LOG_SERVICE=load-testing-solidago ;;
    *) echo "Expected scenario: conversation-voting or solidago-ranking" >&2; exit 1 ;;
esac

if [ -z "${2:-}" ]; then
    echo "Error: CONVERSATION_SLUG_IDS is required" >&2
    echo "Usage: bash run-with-monitoring.sh $SCENARIO <CONVERSATION_SLUG_IDS>" >&2
    exit 1
fi

export CONVERSATION_SLUG_IDS="$2"
export K6_PROMETHEUS_RW_SERVER_URL="${K6_PROMETHEUS_RW_SERVER_URL:-http://localhost:9090/api/v1/write}"
export K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true
export K6_OUT=experimental-prometheus-rw

echo "Running load scenario: $SCENARIO"
echo "Conversation IDs: $CONVERSATION_SLUG_IDS"
echo "Prometheus remote-write enabled"
echo "Grafana: http://localhost:3000"
echo "Logs: .local/logs/latest/$LOG_SERVICE.*"
echo "Warning: participant data persists. Use disposable environments only."

cd "$(dirname "$0")/.."
pnpm run "test:$SCENARIO:build"
