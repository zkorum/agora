#!/bin/zsh

BASE_DIR=$HOME/github/nicobao/agora
SCRIPT_NAME="$0"
SIMULATED_WORKERS="all=simulated-success"

export AGORA_LOG_RUN_ID=${AGORA_LOG_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}

print "AGORA_LOG_RUN_ID=$AGORA_LOG_RUN_ID"
print "Logs: $BASE_DIR/.local/logs/runs/$AGORA_LOG_RUN_ID"

usage() {
  print "Usage: $SCRIPT_NAME [--simulate-workers <worker=scenario,...>]" >&2
  print "Default: --simulate-workers all=simulated-success" >&2
  print "" >&2
  print "Scenarios:" >&2
  print "  simulated-success" >&2
  print "  simulated-retry-then-success" >&2
  print "  simulated-retry-always" >&2
  print "  simulated-non-retryable" >&2
  print "" >&2
  print "Workers:" >&2
  print "  all=<scenario>" >&2
  print "  math-updater=<scenario>" >&2
  print "  ai-description-retry-worker=<scenario>" >&2
  print "  description-translation-retry-worker=<scenario>" >&2
  print "  content-translation-worker=<scenario>" >&2
  print "" >&2
  print "Examples:" >&2
  print "  $SCRIPT_NAME" >&2
  print "  $SCRIPT_NAME --simulate-workers ai-description-retry-worker=simulated-success" >&2
  print "  $SCRIPT_NAME --simulate-workers all=simulated-retry-then-success" >&2
  print "  $SCRIPT_NAME --simulate-workers math-updater=simulated-retry-always,ai-description-retry-worker=simulated-success" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --simulate-workers)
      SIMULATED_WORKERS="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      print "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

scenario_for_worker() {
  local worker="$1"
  local spec spec_worker spec_scenario
  [[ -n "$SIMULATED_WORKERS" ]] || return 1
  for spec in ${(s:,:)SIMULATED_WORKERS}; do
    if [[ "$spec" != *=* ]]; then
      print "Invalid --simulate-workers entry: $spec" >&2
      print "Expected worker=scenario" >&2
      exit 1
    fi
    spec_worker="${spec%%=*}"
    spec_scenario="${spec#*=}"
    if [[ "$spec_worker" == "all" || "$spec_worker" == "$worker" ]]; then
      print "$spec_scenario"
      return 0
    fi
  done
  return 1
}

launch_tab() {
  local title="$1"
  local command="$2"
  local shell_command="export AGORA_LOG_RUN_ID=${(q)AGORA_LOG_RUN_ID}; $command"
  local -a env_args

  env_args=(--env "AGORA_LOG_RUN_ID=$AGORA_LOG_RUN_ID")
  if [[ -n "${AGORA_LOG_DIR:-}" ]]; then
    env_args+=(--env "AGORA_LOG_DIR=$AGORA_LOG_DIR")
  fi

  kitty @ launch --type=tab --title "$title" --cwd="$BASE_DIR" "${env_args[@]}" zsh -ic "$shell_command" > /dev/null
}

launch_worker_tab() {
  local worker="$1"
  local title="$2"
  local normal_target="$3"
  local scenario_target="$4"
  local scenario command tab_title

  command="make $normal_target"
  tab_title="$title"

  if scenario=$(scenario_for_worker "$worker"); then
    command="make $scenario_target SCENARIO=$scenario"
    tab_title="$title:$scenario"
  fi

  launch_tab "$tab_title" "$command"
}

# Make sure remote control is enabled: allow_remote_control yes
# kitty --session kitty_openapi_session.conf
launch_tab "App" "make dev-app"
launch_tab "API" "make dev-api"
launch_worker_tab "math-updater" "Math-Updater" "dev-math-updater" "dev-math-updater-scenario"
launch_worker_tab "ai-description-retry-worker" "AI-Description-Retry" "dev-ai-description-retry-worker" "dev-ai-description-retry-worker-scenario"
launch_worker_tab "description-translation-retry-worker" "Description-Translation-Retry" "dev-description-translation-retry-worker" "dev-description-translation-retry-worker-scenario"
launch_worker_tab "content-translation-worker" "Content-Translation-Worker" "dev-content-translation-worker" "dev-content-translation-worker-scenario"
launch_tab "Import-Worker" "make dev-import-worker"
launch_tab "Scoring-Worker" "make dev-scoring-worker"
launch_tab "OpenAPI" "make dev-generate"
launch_tab "Shared" "make dev-sync"
launch_tab "Shared-App-API" "make dev-sync-app-api"
