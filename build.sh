#!/bin/sh
set -e
git add -A
git commit -qm "Hearth 0.1"
git push
sleep 8
id=$(gh run list -L1 --json databaseId -q '.[0].databaseId')
gh run watch "$id" --exit-status
rm -rf out
gh run download "$id" -n hearth-apk -D out
cp out/app-debug.apk ~/storage/downloads/Hearth.apk
echo "Done. Open Hearth.apk from your Downloads folder."
