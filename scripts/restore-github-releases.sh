#!/usr/bin/env bash
# Restore GitHub releases published under your account (not cursor[bot]).
# Run locally after: gh auth login  (as uwu6967)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTES_DIR="$ROOT/scripts/release-notes"

if ! gh auth status >/dev/null 2>&1; then
    echo "Run: gh auth login"
    exit 1
fi

LOGIN="$(gh api user --jq .login)"
if [[ "$LOGIN" == "cursor[bot]" ]]; then
    echo "Logged in as cursor[bot]. Switch to your GitHub account first:"
    echo "  gh auth login"
    exit 1
fi

echo "Publishing releases as $LOGIN ..."

declare -A TAGS=(
    [v3.3.3]=c6b0fa2
    [v3.4.0]=fb22590
    [v3.4.1]=7b4e4e0
    [v3.4.2]=c23f33d
    [v3.4.3]=adab935
    [v3.5.0]=5440cc5
    [v3.5.1]=cd91975
    [v3.5.2]=4820401
    [v3.5.3]=2d95a22
    [v3.5.4]=06e9402
    [v3.5.5]=a573aa6
    [v3.5.6]=e495306
    [v3.5.7]=38ea739
    [v3.5.8]=3631999
    [v3.5.9]=761a5df
)

declare -A TITLES=(
    [v3.3.3]="v3.3.3 - TF2Autobot GUI Panel"
    [v3.4.0]="v3.4.0 - Theme Selector"
    [v3.4.1]="v3.4.1 - Discord Update Webhooks"
    [v3.4.2]="v3.4.2 - Trade Discord Webhook Preview"
    [v3.4.3]="v3.4.3 - Sidebar Navigation"
    [v3.5.0]="v3.5.0 - Unlisted Stock"
    [v3.5.1]="v3.5.1 - Unlisted Stock IPC Fix"
    [v3.5.2]="v3.5.2 - Pricelist, trades, and unlisted stock UI polish"
    [v3.5.3]="v3.5.3 - Panel self-update from GitHub"
    [v3.5.4]="v3.5.4 - SourceBans sidebar & dual updates"
    [v3.5.5]="v3.5.5 - Sidebar theme pinned on all tabs"
    [v3.5.6]="v3.5.6 - Quieter console logging"
    [v3.5.7]="v3.5.7 - Unlisted Stock pricelist filtering fix"
    [v3.5.8]="v3.5.8 - Unlisted Stock listing feedback"
    [v3.5.9]="v3.5.9 - Pricedb pricelist array compatibility"
)

for tag in v3.3.3 v3.4.0 v3.4.1 v3.4.2 v3.4.3 v3.5.0 v3.5.1 v3.5.2 v3.5.3 v3.5.4 v3.5.5 v3.5.6 v3.5.7 v3.5.8 v3.5.9; do
    sha="${TAGS[$tag]}"
    notes="$NOTES_DIR/${tag}.md"

    if gh release view "$tag" >/dev/null 2>&1; then
        author="$(gh release view "$tag" --json author --jq .author.login 2>/dev/null || echo unknown)"
        if [[ "$author" == "$LOGIN" ]]; then
            echo "Skip $tag (release already exists under $LOGIN)"
            continue
        fi
        if [[ "$author" == "cursor[bot]" ]]; then
            echo "Replacing cursor[bot] release $tag with $LOGIN ..."
            gh release delete "$tag" --yes
        else
            echo "Skip $tag (release exists under $author)"
            continue
        fi
    fi

    if ! git rev-parse "$tag" >/dev/null 2>&1; then
        echo "Creating tag $tag -> $sha"
        git tag -a "$tag" "$sha" -m "$tag"
        git push origin "$tag"
    fi

    echo "Creating release $tag"
    gh release create "$tag" \
        --target "$sha" \
        --title "${TITLES[$tag]}" \
        --notes-file "$notes"
done

echo "Done. Latest release should be v3.5.9 under $LOGIN."
