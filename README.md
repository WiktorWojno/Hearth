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
icon/theme. Before packaging, it runs `npm test`, a headless-browser smoke test
that boots the app and checks the release catalog, long-chat windowing, find,
delete and undo history, reply swipes, message branches and regeneration,
message times, preview greetings, Discover search filters and tags, the
compact chat options, the motion setting and lorebook visibility.

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

**Profile → Updates** also prints the running build (`v0.1 · build 45`).
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

## What changed

Build 48 adds View Transitions: themes crossfade, and a conversation row's
portrait expands into the chat header when you open it. Older WebViews keep
the existing page change.

Build 47 adds ambient petals and a time-of-day glow to the account picker and
library screens, a staggered first-paint entrance for rows and cards, and a
countdown line on undo snackbars.

Build 46 lengthens the cold-start splash to roughly three seconds and fills it
with ten drifting petals, a slower icon entrance and a soft halo. A tap still
skips it, and reduced motion keeps it brief.

Build 45 reorganises chat options, adds a short launch animation and a Motion
setting, and gives page changes, sheets, toasts, new messages and loading
results a gentle, warm movement.

**Profile → What's new** is the release-notes catalog. It lists every public
build with a short, dated summary, newest first, and marks the build you are
running. The catalog is stored in the app itself, so it still works offline.
Home shows a one-time prompt for the current build until the catalog has been
opened.

Android `versionCode` follows the web build number, so a newer APK installs
over the previous one as long as it is signed with the same key.

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
  typewriter or instant writing; composer shape; the persona picker layout
  (compact, comfortable, dense or gallery); motion (Full, Subtle or Off); and
  whether the Lorebooks tab and attachment fields are shown. Hiding
  lorebooks never deletes their data.
- **Home** — conversations as full-width rails or a two-column grid.

A short cold-start splash uses the Hearth icon and a pair of drifting petals.
It is skipped by tapping and never delays loading. Android reduced-motion
settings always override the in-app choice.

Themes are plain objects in the account's saved state (`look` and `themes`), so
a backup carries the appearance with it. Upgrading from an older build maps the
old theme, text size and serif/sans choice into the new model automatically.

## Discovering characters

Open **Characters → Discover** to search public character cards and import one
with a tap.

- **Sort** by relevance, downloads, stars or newest. Relevance leaves the
  sort field to the hub; Newest uses the hub's creation-order field. If the
  relevance request fails, Hearth falls back to most downloaded and says so.
- **Tags** can be typed, picked from the suggestions or picked from the
  results. The tag box suggests common tags and tags already present in loaded
  results as you type. Choose whether multiple tags must all match or any one
  may match. Tag filters are sent to the hub and also applied to results
  already on screen.
- **Search options** cover exact phrase, forks, lorebooks, alternate greetings
  and minimum card length. NSFW visibility stays next to the sort control and
  includes NSFL results with the same toggle.
- **QOL**: recent searches are saved per account, the search field has a clear
  button, loaded results can be narrowed further, the result count shows what
  is loaded, and **Surprise me** opens a random matching card.
- **More sites**: search runs on Chub, but the same query can be opened on
  Chub, CharacterHub, JannyAI or JanitorAI. Paste a character link from those
  sites, or a direct `.png`/`.json` card URL, into the link field. JannyAI and
  JanitorAI do not expose a public search API, so they are link-import sites
  rather than an in-app result list. JanitorAI character links are tried\n  through the JannyAI mirror.

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

In a **Discover** preview, the greeting arrows page through every alternate
greeting, not just the first.

## Working with a chat

Chat options are grouped into **Chat settings**, **This chat**, **Tools** and
**Character**. Selectors are compact rows, destructive actions sit apart, and
the duplicate lorebook checklist has moved back to **Edit character →
Lorebooks**.

- **Pin** a conversation in chat options to keep it at the top of Home. Pinned
  chats carry a small pin marker and sort before the rest.
- **Name this chat** gives a conversation its own title. The title follows the
  conversation when it is archived into **Branches & chats**, and returns when
  you switch back. Emptying the title falls back to the character's name.
- **Branches** — tap a message and choose **Branch here** to copy the
  conversation up to that point into a new chat. The original stays in
  **Branches & chats**, where you can switch, rename or delete it without
  losing the active conversation. **Regenerate** on a reply, or **Reply from
  here** on one of your messages, starts a fresh branch and writes a new
  response instead of overwriting the old one.
- **Find in chat** (chat options) searches the whole conversation, highlights
  every match and jumps between messages with the arrows. If the match is in
  an older part of a long chat, the app loads that part automatically.
- **Long conversations** open with the newest 80 messages and a **Show earlier
  messages** control at the top. Each tap adds another page, so a very long
  chat does not build thousands of bubbles just to show the last line.
- **Memories** (chat options) lists the summaries saved for this chat. You can
  edit a summary, forget it, or add a fact of your own. Manual facts are always
  included in the prompt; automatic summaries follow the Memory setting.
- **Undo** appears after deleting a message, character, lorebook, persona,
  entry or archived chat, and restores it with one tap. Message edits can be
  undone too. Undo snackbars stack, so a second delete or edit no longer
  replaces the first; swipe a snackbar left or right to dismiss it without
  restoring.
- **Reply versions** can be swiped directly on the message: swipe right for the
  previous version and left for the next. At the last version of the newest
  reply, swipe left to write a new one.
- **Message details** show the send time under each new message and add an
  **edited** marker after a manual edit. Hide both in **Profile → Appearance →
  Chat**.
- **Storage protection** (Profile → Import & backup) asks Android to keep this
  app's data instead of clearing it under storage pressure, and reports whether
  the request was granted. If a save ever fails, a warning offers a backup.

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
- `tests/` — headless smoke test (`npm test`) used by CI
- `server.py` — Termux backup receiver
- `.github/workflows/build.yml` — APK build
