git add -A
git commit -qm update
git push || exit 1
sleep 8
id=$(gh run list -L1 --json databaseId -q '.[0].databaseId')
gh run watch "$id" --exit-status || exit 1
rm -rf out
gh run download "$id" -n hearth-apk -D out
cp out/app-debug.apk ~/storage/downloads/Hearth.apk
echo "Done. Open Hearth.apk from your Downloads folder."
