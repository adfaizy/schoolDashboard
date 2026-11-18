# School Dashboard â€” Android APK (no login, self-updating) + Desktop SMS

This repository contains two apps that share one Supabase database:

1. **This Android app** (React + Capacitor) â€” the principal's pocket dashboard.
2. **`school-management-system/`** â€” a full Python (Tkinter) school management desktop app.

Both read and write the same tables, so changes on the desktop appear in the APK and vice-versa.

This version opens **straight into the dashboard** â€” no sign-in screen, no username, no password.

- **Install once.** After that, code updates are delivered over the air (OTA) whenever the phone is online.
- Data is **local-first**: every add/edit/delete saves on the device immediately, so the app works offline. When Supabase is ready it also syncs to the cloud.
- Principal photo: open **Profile** and tap the camera badge on the avatar to take a photo.
- Every row is tappable: student, class, event and conversation rows all open their editor/reply form.

**APK:** `D:\school\SchoolDashboard.apk` (debug-signed, installable by sideloading)

---

## How automatic updates work

```
you push to GitHub (main)
        â”‚
        â–¼
GitHub Actions builds the web app
        â”‚
        â”œâ”€â”€â–º publishes app-update.json + updates/<commit>.zip to the gh-pages branch
        â”‚
        â””â”€â”€â–º (optional) deploys the same web app to Vercel
        â”‚
        â–¼
installed APKs check app-update.json on launch / every 30 min
        â”‚
        â–¼
new bundle downloads in the background â†’ "Restart to apply" (or restart the app)
```

The APK loads its bundled assets offline, so it never shows a blank screen without internet.
Updates are staged to the device and used on the next launch â€” no Play Store, no reinstall.

The update source is baked into the APK from `.env`:

```
VITE_UPDATE_URL=https://raw.githubusercontent.com/adfaizy/schoolDashboard/gh-pages
```

To use Vercel as the update source instead, point `VITE_UPDATE_URL` at your Vercel URL
(e.g. `https://school-dashboard.vercel.app`) and rebuild the APK once. Vercel serves the
same `app-update.json` and `updates/*.zip` files because `vercel.json` sets `outputDirectory` to `dist`.

---

## One-time setup for auto-updates (already done for this repo)

1. `.github/workflows/deploy.yml` runs on every push to `main`.
2. It runs `npm run build`, which creates `dist/app-update.json` and `dist/updates/<commit>.zip`.
3. It pushes `dist/` to the `gh-pages` branch.

You can verify the live manifest at:
<https://raw.githubusercontent.com/adfaizy/schoolDashboard/gh-pages/app-update.json>

### Optional: deploy the web version to Vercel

Either:

- In Vercel, **Import Git Repository** â†’ `adfaizy/schoolDashboard`. Framework preset **Vite**.
  `vercel.json` is already configured. Every push to `main` will redeploy automatically, or
- Add these repository secrets so the GitHub Action deploys via CLI:
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

---

## Supabase setup (completed)

The schema has been applied and the tables are seeded with the sample dashboard data
(5 students, 4 classes, 4 conversations, 3 events, plus the profile and settings rows).

If you ever reset the project, open `supabase/schema-noauth.sql` and run it once in the
SQL Editor, then reopen the app.

> **Security note:** this no-login schema uses public read/write policies. Anyone with the
> publishable key can read or change the data â€” use it for demos or trusted apps only.

---

## Using the app

- **Home** â€” student count and average attendance are computed live. The gear icon edits
  teacher count / pending fees; the bell or **Add** button adds an event; tap an event card to edit.
- **Students** â€” search filters the live list; **+ Add** creates; tap a row or the pencil to edit; trash deletes.
- **Classes (Academics)** â€” timetable per day; **+ Add** for a class; tap a card to edit it.
- **Manage** â€” the school management hub with every module:
  Classes & Subjects Â· Teachers & Staff Â· Exams & Results Â· Fees & Payments Â·
  Library (Book Bank) Â· Transport routes + passengers Â· Hostel rooms + full-capacity check Â·
  **Attendance** (mark students/staff present/absent/late/leave per date) Â· **Reports** (fees, books, attendance summary).
  Each module supports add / edit / delete, and the list syncs with the desktop app.
- **Messages** â€” **+ New** starts a conversation; tap a conversation to reply; pencil/trash edit or delete.
- **Profile** â€” change principal name/title, take a camera photo, retry Supabase sync, and
  **Check for updates** / **Restart to apply update**. The installed version and update source are shown at the bottom.

---

## Install on a phone

1. Copy `D:\school\SchoolDashboard.apk` to your Android phone.
2. Open it and allow **Install unknown apps / Unknown sources**.
3. Install and launch **School Dashboard**.

Requires Android 5.1+ (API 22). Debug-signed build for testing. After this one install,
code updates arrive automatically â€” do not sideload a new APK unless the native code changes.

---

## Rebuild the native APK (only when native code/permissions change)

```powershell
$tools = "D:\school\build-tools"
$sdk = "$tools\android-sdk"
$env:JAVA_HOME = "$tools\jdk-17.0.21.0.2+1"
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$env:JAVA_HOME\bin;$sdk\platform-tools;$env:PATH"

npm.cmd run build
npx.cmd cap sync android
& "D:\school\school-dashboard\android\gradlew.bat" -p "D:\school\school-dashboard\android" assembleDebug --no-daemon
Copy-Item "D:\school\school-dashboard\android\app\build\outputs\apk\debug\app-debug.apk" "D:\school\SchoolDashboard.apk" -Force
```

For web-only changes, just `git push origin main` â€” the APK updates itself.

---

## Project structure

- `src/App.tsx` â€” navigation, modals, toast, no auth gating
- `src/views/` â€” the five data-driven dashboard screens
- `src/hooks/useDashboardData.ts` â€” local/Supabase data layer and CRUD
- `src/hooks/useAppUpdate.ts` â€” OTA update checks and staging
- `src/lib/updates.ts` â€” Capawesome Live Update self-hosted client
- `src/lib/localData.ts` â€” device storage with sample data
- `src/lib/supabase.ts` â€” connection config (`.env` or in-app)
- `scripts/build-update.mjs` â€” builds `app-update.json` + versioned ZIP
- `.github/workflows/deploy.yml` â€” builds and publishes updates on every push
- `vercel.json` â€” Vercel deployment config
- `supabase/schema-noauth.sql` â€” base tables (no login)
- `supabase/schema-modules.sql` â€” school management module tables (run after schema-noauth.sql)
- `school-management-system/\` â€” Python (Tkinter) desktop school management app
- `android/` â€” Capacitor native project
- `D:\school\build-tools\` â€” portable JDK 17 + Android SDK

