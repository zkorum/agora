#!/bin/bash
exec bash "$(dirname "$0")/run-with-monitoring.sh" conversation-voting "$@"
