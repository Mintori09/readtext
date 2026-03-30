set shell := ["bash", "-c"]

notify title msg:
    if [[ "$OSTYPE" == "darwin"* ]]; then \
        osascript -e "display notification \"{{msg}}\" with title \"{{title}}\""; \
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then \
        notify-send "{{title}}" "{{msg}}"; \
    fi

build:
    @pnpm install
    @pnpm tauri build || (just notify "Build Failed" "Check terminal" && exit 1)
    @just notify "Build Success" "App ready in release bundle"
