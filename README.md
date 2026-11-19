# School Dashboard — Android APK (no login, self-updating) + Desktop SMS

This repository contains two apps that share one Supabase database:

1. **This Android app** (React + Capacitor) — the principal's pocket dashboard.
2. **`school-management-system/`** — a full Python (Tkinter) school management desktop app.

Both read and write the same tables, so changes on the desktop appear in the APK and vice-versa.

This version opens **straight into the dashboard** — no sign-in screen, no username, no password.

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
Updates are staged to the device and used on the next launch — no Play Store, no reinstall.

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
> publishable key can read or change the data — use it for demos or trusted apps only.

---

## Using the app

- **Home** — student count and average attendance are computed live. The gear icon edits
  teacher count / pending fees; the bell or **Add** button adds an event; tap an event card to edit.
- **Students** — search filters the live list; **+ Add** creates; tap a row or the pencil to edit; trash deletes.
- **Timetable** — the class × period grid (P-1…P-8 with the 11:30–12:00 break).
  Rows are classes, cells show subject + teacher. Tap any cell to open **Assign Period**
  (subject dropdown, teacher dropdown, **Clear** / **Cancel** / **Save Period**).
  Seeded from the printed timetable: Classes 8→1, Nursery and ECE.
- **Manage** — the school management hub with every module:
  Classes & Subjects · Teachers & Staff · Exams & Results · Fees & Payments ·
  Library (Book Bank) · Transport routes + passengers · Hostel rooms + full-capacity check ·
  **Attendance** (mark students/staff present/absent/late/leave per date) · **Reports** (fees, books, attendance summary).
  Each module supports add / edit / delete, and the list syncs with the desktop app.
- **Messages** — **+ New** starts a conversation; tap a conversation to reply; pencil/trash edit or delete.
- **Profile** — change principal name/title, take a camera photo, retry Supabase sync, and
  **Check for updates** / **Restart to apply update**. The installed version and update source are shown at the bottom.

---

## Install on a phone

1. Copy `D:\school\SchoolDashboard.apk` to your Android phone.
2. Open it and allow **Install unknown apps / Unknown sources**.
3. Install and launch **School Dashboard**.

Requires Android 5.1+ (API 22). Debug-signed build for testing. After this one install,
code updates arrive automatically — do not sideload a new APK unless the native code changes.

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

For web-only changes, just `git push origin main` — the APK updates itself.

---

## Project structure

- `src/App.tsx` — navigation, modals, toast, no auth gating
- `src/views/` — the five data-driven dashboard screens
- `src/hooks/useDashboardData.ts` — local/Supabase data layer and CRUD
- `src/hooks/useAppUpdate.ts` — OTA update checks and staging
- `src/lib/updates.ts` — Capawesome Live Update self-hosted client
- `src/lib/localData.ts` — device storage with sample data
- `src/lib/supabase.ts` — connection config (`.env` or in-app)
- `scripts/build-update.mjs` — builds `app-update.json` + versioned ZIP
- `.github/workflows/deploy.yml` — builds and publishes updates on every push
- `vercel.json` — Vercel deployment config
- `supabase/schema-noauth.sql` — base tables (no login)
- `supabase/schema-modules.sql` — school management module tables (run after schema-noauth.sql)
- `school-management-system/\` — Python (Tkinter) desktop school management app
- `android/` — Capacitor native project
- `D:\school\build-tools\` — portable JDK 17 + Android SDK

