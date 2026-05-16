#!/bin/bash
# Install all RightAIChoice SEO reminder + daily-orchestrator launchd plists.
# Idempotent — safe to re-run after editing any plist (unloads first).
set -euo pipefail

PLIST_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/Library/LaunchAgents"

mkdir -p "$TARGET"

PLISTS=(
  "com.rightaichoice.daily.plist"
  "com.rightaichoice.seo-outreach.plist"
  "com.rightaichoice.seo-haro.plist"
  "com.rightaichoice.seo-monday-review.plist"
  "com.rightaichoice.seo-monthly-sop.plist"
)

for p in "${PLISTS[@]}"; do
  src="$PLIST_DIR/$p"
  dst="$TARGET/$p"
  label="${p%.plist}"

  if [[ ! -f "$src" ]]; then
    echo "  ! missing source: $src — skipping"
    continue
  fi

  # Unload first (no-op if not loaded) so editing then reinstalling works.
  if launchctl list 2>/dev/null | grep -q "$label"; then
    echo "  - unloading $label"
    launchctl unload "$dst" 2>/dev/null || true
  fi

  cp "$src" "$dst"
  launchctl load "$dst"
  echo "  ✓ loaded $label"
done

echo ""
echo "Done. Verify with:  launchctl list | grep rightaichoice"
echo ""
echo "Reminders installed:"
echo "  · Daily 09:00 Mon-Fri  → SEO: Daily growth run (npm run daily)"
echo "  · Daily 10:00 Mon-Fri  → SEO: Founder outreach"
echo "  · Daily 14:00 Mon-Fri  → SEO: HARO/Qwoted inbox"
echo "  · Mondays 09:30        → SEO: Weekly Monday review"
echo "  · 1st of month 09:00   → SEO: Monthly Phase 4 SOP refresh"
echo ""
echo "All notifications show in Notification Center + Mac plays the alert sound."
echo "These ONLY fire when the Mac is awake. The Bing/GSC/IndexNow submissions"
echo "themselves run server-side via Vercel cron, so the actual SEO work happens"
echo "regardless of laptop state — these plists just remind YOU to do the manual"
echo "operator tasks (outreach, HARO, review)."
