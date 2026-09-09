#!/bin/bash

# Provide the directory path as an argument to the script
directory="$1"

# Check if the directory exists
if [ ! -d "$directory" ]; then
    echo "Directory does not exist."
    exit 1
fi

rsync -av --include "*.sql" --exclude="*" "$directory" ./database/flyway/

max_version=0

# Find the largest migrate script number (e.g: 5 from V0001, V0002 V0003... V0005)
max_version=$(find "./database/flyway" -type f -name "*.sql" -print0 | while IFS= read -r -d '' filename; do
    basename=$(basename "$filename" .sql)

    # Check if the basename matches the desired format (4 digits followed by an underscore)
    if [[ $basename =~ ^V[0-9]{4}__ ]]; then
        # Extract the first 4 digits and the rest of the basename
        first_four_digits=${basename:1:4}
        rest_of_basename=${basename:5}
        version_number=$(expr "$first_four_digits" + 0)
        
        if [ "$version_number" -gt "$max_version" ]; then
          max_version="$version_number"
          echo "$max_version"
        fi
    fi
  done)

# https://stackoverflow.com/a/39615292/11046178
max_version=$(echo "${max_version##*$'\n'}")

FLYWAY_DIRECTORY="./database/flyway"
# Use find to search for files with ".sql" extension in the given directory
# Then, use a for loop to go through each filename and extract only the filenames without extensions
find $FLYWAY_DIRECTORY -type f -name "*.sql" -print0 | while IFS= read -r -d '' filename; do
    basename=$(basename "$filename" .sql)

    # Check if the basename matches the desired format (4 digits followed by an underscore)
    if [[ $basename =~ ^[0-9]{4}_ ]]; then
        # Extract the first 4 digits and the rest of the basename
        first_four_digits=${basename:0:4}
        rest_of_basename=${basename:5}
        number_of_existing_files_with_that_name=$(ls database/flyway | grep "$rest_of_basename" | wc -l)
        # Special case - when upgrading the tool
        if ([ "$rest_of_basename" = "sturdy_serpent_society" ] || [ "$number_of_existing_files_with_that_name" -gt 1 ]); then
          rm "$filename"
        else
          # Rename the file using the desired format (V<4_digits>__<some_name>.sql)
          version_number=$(expr "$first_four_digits" + 0)
          if [ $version_number -le $max_version ]; then
            version_number=$(expr "$max_version" + 1)
            first_four_digits=$(printf '%04d' $version_number) # pad 4 zeros at the beginning
          fi
          new_basename="V${first_four_digits}__${rest_of_basename}"
          new_filename="$FLYWAY_DIRECTORY/$new_basename.sql"
          mv "$filename" "$new_filename"
          echo "Renamed $filename to $new_basename.sql"
        fi
    fi
done
