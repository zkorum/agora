#!/bin/bash

# See https://unix.stackexchange.com/questions/492365/opening-new-gnome-terminal-v3-28-with-multiple-tabs-and-different-commands/637537#637537

BASE_DIR=$HOME/github/nicobao/agora

cat <<EOF >/tmp/bootstrap_tabs.sh
gnome-terminal --tab -t "OpenAPI" --working-directory="$BASE_DIR" -- \
	bash -c "make dev-generate; bash"
gnome-terminal --tab -t "Shared" --working-directory="$BASE_DIR" -- \
	bash -c "make dev-sync; bash"
gnome-terminal --tab -t "API" --working-directory="$BASE_DIR" -- \
	bash -c "make dev-api; bash"
gnome-terminal --tab -t "App" --working-directory="$BASE_DIR" -- \
	bash -c "make dev-app; bash"
gnome-terminal --tab -t "Git" --working-directory="$BASE_DIR"
EOF

gnome-terminal --window --maximize -- bash /tmp/bootstrap_tabs.sh
