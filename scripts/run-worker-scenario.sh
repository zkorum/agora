#!/bin/sh

set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <worker> <scenario>" >&2
  exit 2
fi

worker="$1"
scenario="$2"
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
runtime="python"

case "$worker" in
  math-updater)
    service_dir="$repo_root/services/math-updater"
    scenario_file="$service_dir/scenarios/env.$scenario"
    module="math_updater.worker"
    ;;
  ai-description-retry-worker)
    service_dir="$repo_root/services/ai-description-retry-worker"
    scenario_file="$service_dir/scenarios/env.$scenario"
    module="ai_description_retry_worker.worker"
    ;;
  description-translation-retry-worker)
    service_dir="$repo_root/services/description-translation-retry-worker"
    scenario_file="$service_dir/scenarios/env.$scenario"
    module="description_translation_retry_worker.worker"
    ;;
  content-translation-worker)
    service_dir="$repo_root/services/content-translation-worker"
    scenario_file="$service_dir/scenarios/env.$scenario"
    module="content_translation_worker.worker"
    ;;
  conversation-email-update-worker)
    service_dir="$repo_root/services/conversation-email-update-worker"
    scenario_file="$service_dir/scenarios/env.$scenario"
    runtime="node"
    ;;
  *)
    echo "Unknown worker: $worker" >&2
    exit 2
    ;;
esac

if [ ! -f "$scenario_file" ]; then
  echo "Unknown scenario for $worker: $scenario" >&2
  echo "Expected file: $scenario_file" >&2
  exit 2
fi

cd "$service_dir"
set -a
if [ -f .env ]; then
  . ./.env
fi
. "$scenario_file"
set +a

if [ "$runtime" = "node" ]; then
  exec pnpm start:dev
fi

PYTHONUNBUFFERED=1 exec uv run python -m "$module"
