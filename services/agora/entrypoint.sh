#!/bin/sh

set -eu

asset_dir=/usr/share/nginx/html/assets
new_asset_dir=/app/new-assets
state_dir="$asset_dir/.asset-state"
current_assets_file="$state_dir/current"

mkdir -p "$state_dir"
exec 9> "$state_dir/lock"
flock -x 9

# Give the deployment being replaced a full grace period. Without this, a
# deployment older than seven days is deleted immediately when the next image
# starts, even if a user loaded it just before the rollout.
if [ -f "$current_assets_file" ]; then
  set --
  while IFS= read -r asset_name; do
    case "$asset_name" in
      "" | .* | *[!A-Za-z0-9._-]*)
        printf 'Invalid persisted asset filename: %s\n' "$asset_name" >&2
        exit 1
        ;;
    esac

    asset_path="$asset_dir/$asset_name"
    [ -f "$asset_path" ] && set -- "$@" "$asset_path"
  done < "$current_assets_file"

  [ "$#" -eq 0 ] || touch "$@"
  find "$asset_dir" -maxdepth 1 -type f -mtime +7 -delete
else
  # The first deployment with generation tracking cannot identify the prior
  # current build, so give all existing assets one migration grace period.
  find "$asset_dir" -maxdepth 1 -type f -exec touch {} +
fi

# Merge new assets from the image into the persistent volume.
# Old assets from previous deployments are preserved so open tabs can still
# lazy-load their chunk hashes.
cp -r "$new_asset_dir"/* "$asset_dir/"

# Persist this deployment's asset names for the next rollout. Vite emits a flat
# assets directory, so only basenames are needed.
next_assets_file="$state_dir/current.next.$$"
trap 'rm -f "$next_assets_file"' EXIT HUP INT TERM
: > "$next_assets_file"
for asset_path in "$new_asset_dir"/*; do
  if [ -f "$asset_path" ]; then
    asset_name=${asset_path##*/}
    case "$asset_name" in
      "" | .* | *[!A-Za-z0-9._-]*)
        printf 'Invalid asset filename: %s\n' "$asset_name" >&2
        exit 1
        ;;
    esac
    printf '%s\n' "$asset_name" >> "$next_assets_file"
  fi
done
mv "$next_assets_file" "$current_assets_file"
trap - EXIT HUP INT TERM
flock -u 9
exec 9>&-

# Start nginx
exec nginx -g 'daemon off;'
