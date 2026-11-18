#!/usr/bin/env python3
"""Patch the generated Capacitor Android project for Hearth.

Run from the repo root after `npx cap add android` and before
`npx cap sync android`. It is idempotent.
"""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ANDROID = ROOT / "android"
MAIN = ANDROID / "app" / "src" / "main"
JAVA = MAIN / "java"
GRADLE = ANDROID / "app" / "build.gradle"
MANIFEST = MAIN / "AndroidManifest.xml"
COLORS = MAIN / "res" / "values" / "colors.xml"
ICON_BG = MAIN / "res" / "values" / "ic_launcher_background.xml"
STYLES = MAIN / "res" / "values" / "styles.xml"

if not ANDROID.exists():
    sys.exit("android/ not found — run `npx cap add android` first")


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")


def app_id():
    m = re.search(r'applicationId\s+"([^"]+)"', read(GRADLE))
    if not m:
        sys.exit("Could not find applicationId in android/app/build.gradle")
    return m.group(1)


APP_ID = app_id()
PKG_DIR = JAVA.joinpath(*APP_ID.split("."))
PKG_DIR.mkdir(parents=True, exist_ok=True)

# 1. MainActivity registers the Termux bridge.
write(PKG_DIR / "MainActivity.java", f"""package {APP_ID};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {{
    @Override
    public void onCreate(Bundle savedInstanceState) {{
        registerPlugin(BackupServerPlugin.class);
        super.onCreate(savedInstanceState);
    }}
}}
""")

# 2. Copy the plugin, rewriting its package line if the app id differs.
plugin = read(ROOT / "native" / "BackupServerPlugin.java")
plugin = re.sub(r"^package\s+[\w.]+;", f"package {APP_ID};", plugin, count=1, flags=re.M)
write(PKG_DIR / "BackupServerPlugin.java", plugin)

# 3. Manifest: Termux permission, package visibility, loopback HTTP.
manifest = read(MANIFEST)
if "usesCleartextTraffic" not in manifest:
    # server.py listens on http://127.0.0.1:8765. Android 9+ blocks cleartext
    # unless the app opts in, and the WebView fetch would fail silently.
    manifest = manifest.replace("<application", '<application\n        android:usesCleartextTraffic="true"', 1)
if "com.termux.permission.RUN_COMMAND" not in manifest:
    manifest = manifest.replace(
        "</manifest>",
        '    <uses-permission android:name="com.termux.permission.RUN_COMMAND" />\n</manifest>',
    )
if "<queries>" not in manifest:
    manifest = manifest.replace(
        "</manifest>",
        '    <queries>\n        <package android:name="com.termux" />\n    </queries>\n</manifest>',
    )
elif "com.termux" not in manifest:
    manifest = manifest.replace("</queries>", '    <package android:name="com.termux" />\n    </queries>')
write(MANIFEST, manifest)

# 4. Brand colours for the adaptive icon, splash and system bars.
# styles.xml references colorPrimary/colorPrimaryDark/colorAccent, so make sure
# colors.xml exists even if the generated template omitted it.
if not COLORS.exists():
    write(
        COLORS,
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="colorPrimary">#12051F</color>\n'
        '    <color name="colorPrimaryDark">#12051F</color>\n'
        '    <color name="colorAccent">#FF8FD8</color>\n'
        '</resources>\n',
    )

colour_files = [p for p in (ICON_BG, COLORS) if p.exists()]
if not colour_files:
    colour_files = [COLORS]
for colour_file in colour_files:
    colours = read(colour_file)
    if "ic_launcher_background" in colours:
        colours = re.sub(
            r'<color name="ic_launcher_background">.*?</color>',
            '<color name="ic_launcher_background">#12051F</color>',
            colours,
        )
    if "launch_bg" not in colours:
        colours = colours.replace(
            "</resources>", '    <color name="launch_bg">#12051F</color>\n</resources>'
        )
    write(colour_file, colours)

if ICON_BG.exists():
    icon_bg = read(ICON_BG)
    if "ic_launcher_background" not in icon_bg:
        icon_bg = icon_bg.replace(
            "</resources>",
            '    <color name="ic_launcher_background">#12051F</color>\n</resources>',
        )
        write(ICON_BG, icon_bg)

if STYLES.exists():
    styles = read(STYLES)
    styles = styles.replace("@drawable/splash", "@color/launch_bg")
    write(STYLES, styles)

# 5. Public version 0.1.
gradle = read(GRADLE)
gradle = re.sub(r"versionCode\s+\d+", "versionCode 1", gradle)
gradle = re.sub(r'versionName\s+"[^"]*"', 'versionName "0.1"', gradle)
write(GRADLE, gradle)

print(f"Patched Android: package {APP_ID}, Termux backup plugin, version 0.1")
