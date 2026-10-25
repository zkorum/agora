#!/bin/sh

set -eu

mode=$1
shift
tag=${TAG:-latest}
no_cache=${NO_CACHE:-0}
for argument in "$@"; do
  case "$argument" in
    TAG=*) tag=${TAG:-${argument#TAG=}} ;;
    NO_CACHE=*) no_cache=${argument#NO_CACHE=} ;;
    -*|*=*) echo "Unknown build option: $argument" >&2; exit 2 ;;
    *) tag=${TAG:-$argument} ;;
  esac
done
case "$no_cache" in
  0|1) ;;
  *) echo "NO_CACHE must be 0 or 1" >&2; exit 2 ;;
esac

case "$mode" in
  buildx) set -- buildx build --platform linux/amd64 --load ;;
  build) set -- build ;;
  *) echo "Unknown build mode: $mode" >&2; exit 2 ;;
esac
if [ "$no_cache" = 1 ]; then
  set -- "$@" --no-cache
fi

exec docker "$@" -t "agora-api:$tag" .
