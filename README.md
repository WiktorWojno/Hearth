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

**Profile → Updates** also prints the running build (`v0.1 · build 35`).
Check that line after an update: if the build number did not change, the
update was not applied yet.

Downloads are validated before they are stored (complete document, build
number, size) and the boot loader refuses to apply a truncated file, so a
bad download cannot leave a half-drawn screen. If a build ever fails to
start, the app marks it bad and waits for a newer one instead of looping.

The downloaded copy is **kept** and re-applied on every cold start until an
APK that already contains that build (or newer) is installed. Without this,
closing and reopening the app falls back to the build baked into the APK. If
the stored copy disappears, the next launch downloads it again instead of
waiting for the six-hour check.

## If a screen looks wrong

- Reload from **Profile → Updates → Restart**, or force-stop the app. State is
  saved after every message, so nothing is lost.
- Icons are inline SVG rather than font glyphs, so a device font cannot turn
  a button into an empty square.
- Broken avatar or cover images are hidden instead of being drawn as a
  placeholder box.
- If drawing fails, the app shows a **Reload Hearth** screen instead of a
  half-rendered one.

## Appearance

Everything visual lives under **Profile → Appearance**, and every change is
saved per account the moment you tap it.

- **Theme** — six built-in colour themes (Sakura Night, Sakura Day, Onyx,
  Midnight, AMOLED, Paper) plus **Create theme**. A custom theme controls the
  background (solid or gradient), panel and border colours, accent (solid or
  gradient) and accent text, both bubble colours and their text, and primary
  and muted text. The editor previews every change live; saved themes can be
  edited or deleted from the same screen.
- **Text** — separate application and chat sizes, per-format weights for bold,
  italic, code and links, plus text and bubble colour overrides. Fonts include
  six built-ins, a searchable online catalog (loaded from BunnyFonts on demand
  and cached by the device), and a local font file import (.woff2, .woff, .ttf,
  .otf). Imported fonts stay on the device in IndexedDB and are never uploaded.
- **Avatars** — circle, squircle 8, squircle 16, square, or a custom radius.
- **Chat** — the options button can sit in the header or in the composer; chat
  window width; avatar placement; message alignment; sender name weight and
  visibility; streaming speed; whether Stop keeps or deletes the partial reply;
  typewriter or instant writing; composer shape; and the persona picker layout
  (compact, comfortable, dense or gallery).
- **Home** — conversations as full-width rails or a two-column grid.

Themes are plain objects in the account's saved state (`look` and `themes`), so
a backup carries the appearance with it. Upgrading from an older build maps the
old theme, text size and serif/sans choice into the new model automatically.

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

## Personas

Tap a persona on **Profile** to make it the default for every chat. A chat that
had its own persona picked in **chat options → Persona** keeps that choice;
switch a chat back to *Default* there to follow the profile again. An opening
message is rewritten with the new name in any chat where you have not sent a
message yet, so a fresh chat always starts in the right voice. Renaming a
persona updates those openings too.

**Search** from inside a chat opens the character or lorebook you pick, even
though the chat stays in the back stack.

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
