# Hearth 0.1

A warm, private place for characters, stories and long conversations.
Hearth is a single-page Capacitor app: your chats, lorebooks, personas and API
keys stay on your device.

## Build the APK

1. Open the repo's **Actions** tab and run **Build APK** (or just push to
   `main`).
2. When the run finishes, download the `hearth-apk` artifact.
3. Unzip it and install `app-debug.apk` (allow "install unknown apps").

The workflow builds a debug APK with versionName **0.1** and the Sakura Night
icon/theme.

## Signing

CI used to generate a fresh debug key on every run, so each new APK had a
different signature and refused to install over the previous one — which wiped
chats. Builds are now signed with `native/hearth.p12` (alias `hearth`), so they
upgrade in place. The key is committed on purpose: it is a sideload app, and a
stable identity is what makes in-place updates possible.

The first build made with this key still needs one uninstall of the old app,
because the old APKs were signed with a throwaway key. Save a backup first
(**Profile → Import & backup → Save backup**).

## Updates

The app checks the GitHub copy of `www/index.html` for a newer build (once
every 6 hours, and whenever you open **Profile → Updates**). A downloaded
update appears as a banner; restart the app to apply it.

Web changes can be delivered this way. Native changes — the Android back
button, the app icon, the Termux bridge — need a new APK installed once.

## Steering the model

- **View prompt** (chat → ⋯ → View prompt) shows the exact system prompt,
  world info, memories and messages that will be sent, plus a token count.
  The thin bar under the chat header opens it too.
- **Context budget** (Profile → Limits) caps the request size in tokens;
  older messages are dropped to fit instead of the request failing. `0`
  keeps the old message-count behaviour.
- **Stop sequences** (Profile → Limits) end a reply as soon as the model
  produces a line such as `{{user}}:`.
- **Author's note** (Profile → Instructions) injects steering a few messages
  back rather than at the top, where models ignore it.
- **Write my line** (the ✎ button beside send) drafts your next message in
  your persona's voice, then leaves it in the composer to edit or discard.
- **Search** (⌕ on the home screen) searches every chat, character and
  lorebook entry, not just the open chat.

## Optional: automatic Termux backup server

The Android app can save backups directly to `Documents/Hearth`. If that is not
available on your device, it can also POST the backup to a tiny local server
that writes to `~/storage/downloads`.

One-time setup in Termux, from the repo folder:

```bash
bash native/termux-setup.sh
```

Then make sure Termux has Python (`pkg install python`), run
`termux-setup-storage` once, and grant Hearth the **Run commands** permission
when Android asks. After that, tapping **Save backup** starts `server.py`
automatically and saves the file. The same button is available under
**Profile → Import & backup → Termux backup server → Start now**.

The server listens only on `127.0.0.1:8765` and accepts backups from Hearth.

## Project layout

- `www/` — the app (HTML/CSS/JS, manifest, service worker, PWA icons)
- `resources/` — source icon plus generated Android mipmaps
- `native/` — Android Termux bridge and build-time patch script
- `server.py` — Termux backup receiver
- `.github/workflows/build.yml` — APK build
