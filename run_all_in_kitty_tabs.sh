#!/bin/zsh

BASE_DIR=$HOME/github/nicobao/agora

# Make sure remote control is enabled: allow_remote_control yes
# kitty --session kitty_openapi_session.conf
kitty @ launch --type=tab --title "App" --cwd=$BASE_DIR zsh -ic "make dev-app" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "API" --cwd=$BASE_DIR zsh -ic "make dev-api" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "Math-Updater" --cwd=$BASE_DIR zsh -ic "make dev-math-updater" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "Polis" --cwd=$BASE_DIR zsh -ic "make dev-polis" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "OpenAPI" --cwd=$BASE_DIR zsh -ic "make dev-generate" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "Shared" --cwd=$BASE_DIR zsh -ic "make dev-sync" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "Shared-App-API" --cwd=$BASE_DIR zsh -ic "make dev-sync-app-api" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
kitty @ launch --type=tab --title "Shared-Backend" --cwd=$BASE_DIR zsh -ic "make dev-sync-backend" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
# kitty @ launch --type=tab --title "Autocomplete" --cwd=$BASE_DIR --hold zsh -ic "autocomplete_server" > /dev/null # !WARN: doesn't find watchman-make if not -i + the env condition in .zshrc
# kitty @ launch --type=tab --cwd="$BASE_DIR" --title "OpenAPI" zsh -c "make dev-generate"
# kitty @ launch --type=tab --cwd="$BASE_DIR" --title "Shared" zsh -c "make dev-sync"
# kitty @ launch --type=tab --cwd="$BASE_DIR" --title "API" zsh -c "make dev-api"
# kitty @ launch --type=tab --cwd="$BASE_DIR" --title "Front" zsh -c "make dev-front"
