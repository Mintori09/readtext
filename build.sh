#!/bin/bash
set -e

notify() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "display notification \"$2\" with title \"$1\""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        notify-send "$1" "$2"
    fi
}

trap 'notify "Build Failed" "Check terminal"; exit' ERR

pnpm install
pnpm tauri build

notify "Build Success" "App ready in release bundle"
