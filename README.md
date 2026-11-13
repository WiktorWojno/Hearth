# Hearth APK build

1. Create a new GitHub repo and upload everything in this folder, keeping the
   folder structure (including .github/workflows/build.yml).
2. Open the repo's Actions tab, choose "Build APK", tap Run workflow.
3. After about 5 minutes, open the finished run and download the "hearth-apk"
   artifact. Unzip it and install app-debug.apk (allow "install unknown apps").

To change the app, edit www/index.html and run the workflow again.
