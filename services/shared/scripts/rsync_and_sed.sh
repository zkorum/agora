#!bin/bash
#
# Step 1: Use rsync to copy from source to api
rsync -av --delete ./src/ ../api/src/shared/

# Step 2: Use rsync again to copy from source to front
rsync -av --delete ./src/ ../agora/src/shared/

# Step 3: Apply sed to every file synced in front. Validator is not imported the same way in the browser.
# See https://github.com/validatorjs/validator.js
# Step 4: add "generated" comment if it does not already exist
comment="/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/"
find ../agora/src/shared/ -name "*.ts" -print0 | while read -d $'\0' file
do
  # cross-platform sed (macOS and Linux)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/import validator from "validator";/d' "$file"
  else
    sed -i '/import validator from "validator";/d' "$file"
  fi
  # Check if the comment already exists in the file
  if ! grep -qF "$comment" "$file"; then
      # If the comment doesn't exist, add it using sed
      # Detect OS and set sed options accordingly
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "1s;^;$comment\n;" "$file"
      else
        sed -i "1i $comment" "$file"
      fi
  fi
done

find ../api/src/shared/ -name "*.ts" -print0 | while read -d $'\0' file
do
  # Check if the comment already exists in the file
  if ! grep -qF "$comment" "$file"; then
      # If the comment doesn't exist, add it using sed
      # Detect OS and set sed options accordingly
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "1s;^;$comment\n;" "$file"
      else
        sed -i "1i $comment" "$file"
      fi
  fi
done
