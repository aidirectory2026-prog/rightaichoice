# macOS daily-growth launchd reminder

This folder contains a `launchd` plist that auto-runs `npm run daily` every weekday morning at 9:00 and posts a macOS Notification Center alert when it completes. After install, you literally never have to remember Bing / GSC / IndexNow daily submissions — your Mac handles it.

## Install (60 seconds, one-time)

```bash
cp scripts/launchd/com.rightaichoice.daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.rightaichoice.daily.plist
```

That's it. Tomorrow at 9:00am you'll get a notification: **"RAC daily growth — all green"** (or "needs attention" if any step failed).

## Verify it's loaded

```bash
launchctl list | grep rightaichoice
```

You should see `com.rightaichoice.daily` in the output.

## Fire it once now (test run)

```bash
launchctl start com.rightaichoice.daily
```

Then check the logs:

```bash
tail -50 logs/daily-stdout.log
```

If you see `✓ Daily run complete.` at the bottom, you're good.

## What it does each morning

1. **Bing direct submission** (smart-mode rotation across compares → tools → alts → categories — 100 URLs/day, ~30 days to cycle the whole catalog).
2. **GSC sitemap re-ping** (only if 7+ days since last submission).
3. **IndexNow batch** (notifies Bing + Yandex of recently-updated URLs).
4. **Notification Center alert** summarizing the run.
5. **Prints the manual checklist** to terminal (which you see when you open `logs/daily-stdout.log` or run `npm run daily` interactively).

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.rightaichoice.daily.plist
rm ~/Library/LaunchAgents/com.rightaichoice.daily.plist
```

## Edit the schedule

The plist runs Mon-Fri at 09:00. To change:

- **Different hour**: edit `<integer>9</integer>` under the `Hour` keys.
- **Include weekends**: add two more `<dict>` blocks with `<key>Weekday</key><integer>0</integer>` and `<integer>6</integer>`.
- **Multiple times per day**: add more `<dict>` blocks to the `StartCalendarInterval` array.

After editing, reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.rightaichoice.daily.plist
cp scripts/launchd/com.rightaichoice.daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.rightaichoice.daily.plist
```

## Manual run (anytime, won't double-submit)

```bash
npm run daily         # actually run
npm run daily:dry     # preview without submitting
```

Smart-mode Bing submission tracks state in `scripts/.bing-submit-checkpoint.json` and refuses to run twice in the same UTC day, so manual + scheduled runs never collide.

## Troubleshooting

**No notification at 9am**: macOS may not have permission to post notifications from launchd jobs. System Settings → Notifications → Script Editor (or `osascript`) → enable.

**"command not found: npm"**: the plist hardcodes `/usr/local/bin/npm`. If your npm is elsewhere (e.g. `/opt/homebrew/bin/npm` on Apple Silicon), edit the `ProgramArguments` array.

**Mac was asleep at 9am**: the `StartCalendarIntervalMissedFire` key is set to true, so the job runs as soon as the Mac wakes. No need to babysit.

**Logs show failures**: `tail -100 logs/daily-stderr.log` for the error. Most common cause: stale `BING_WEBMASTER_API_KEY` env var (regenerate at https://www.bing.com/webmasters → Settings → API Access).
