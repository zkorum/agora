#!/bin/bash

set -euo pipefail
export LC_ALL=C
shopt -s nullglob

directory="${1:-}"
if [ ! -d "$directory" ]; then
    echo "Directory does not exist: $directory" >&2
    exit 1
fi

directory=$(cd -- "$directory" && pwd -P)
service_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
FLYWAY_DIRECTORY=$(cd -- "$service_directory/database/flyway" && pwd -P)
if [ "$directory" = "$FLYWAY_DIRECTORY" ]; then
    echo "Source and Flyway directories must differ." >&2
    exit 1
fi

# Never copy versioned SQL over existing Flyway migrations.
rsync -av --include "[0-9][0-9][0-9][0-9]_*.sql" --exclude="*" "$directory/" "$FLYWAY_DIRECTORY/"

# Bash globs give stable bytewise order, without a pipeline subshell losing state.
existing_files=("$FLYWAY_DIRECTORY"/*.sql)
flyway_pattern='^V([0-9]{4})(\.[0-9]+)?__(.+)\.sql$'
drizzle_pattern='^([0-9]{4})_(.+)\.sql$'
max_version=0
# Bash 3 treats empty arrays as unset under nounset.
for filename in "${existing_files[@]:-}"; do
    basename=${filename##*/}
    if [ -f "$filename" ] && [[ $basename =~ $flyway_pattern ]]; then
        version_number=$((10#${BASH_REMATCH[1]}))
        if [ "$version_number" -gt "$max_version" ]; then
            max_version=$version_number
        fi
    fi
done

for filename in "$FLYWAY_DIRECTORY"/*.sql; do
    basename=${filename##*/}
    if [ -f "$filename" ] && [[ $basename =~ $drizzle_pattern ]]; then
        version_number=$((10#${BASH_REMATCH[1]}))
        rest_of_basename=${BASH_REMATCH[2]}
        already_migrated=false
        existing_index=0
        for existing_filename in "${existing_files[@]:-}"; do
            existing_basename=${existing_filename##*/}
            if [ -f "$existing_filename" ] && [[ $existing_basename =~ $flyway_pattern ]]; then
                # Historical renumbering only increases the Drizzle index. A newer
                # index reusing an older random description is a new migration.
                if [ "${BASH_REMATCH[3]}" = "$rest_of_basename" ] &&
                    [ "$((10#${BASH_REMATCH[1]}))" -ge "$version_number" ]; then
                    already_migrated=true
                    # Consume each historical copy once, in ascending source order.
                    existing_files[existing_index]=""
                    break
                fi
            fi
            existing_index=$((existing_index + 1))
        done

        # Special case retained from the Drizzle tool upgrade.
        if [ "$rest_of_basename" = "sturdy_serpent_society" ] || [ "$already_migrated" = true ]; then
            rm -- "$filename"
            continue
        fi

        if [ "$version_number" -le "$max_version" ]; then
            version_number=$((max_version + 1))
        fi
        if [ "$version_number" -gt 9999 ]; then
            echo "No four-digit Flyway version available for $filename" >&2
            exit 1
        fi
        new_basename=$(printf 'V%04d__%s.sql' "$version_number" "$rest_of_basename")
        new_filename="$FLYWAY_DIRECTORY/$new_basename"
        if [ -e "$new_filename" ] || [ -L "$new_filename" ]; then
            echo "Refusing to overwrite $new_filename" >&2
            exit 1
        fi
        mv -n -- "$filename" "$new_filename"
        # mv -n can report success without moving when the destination exists.
        if [ -e "$filename" ] || [ -L "$filename" ]; then
            echo "Refusing to overwrite $new_filename" >&2
            exit 1
        fi
        max_version=$version_number
        echo "Renamed $filename to $new_basename"
    fi
done
