# School Dashboard — Android APK (no login)

This version opens **straight into the dashboard** — no sign-in screen, no username, no password.

- Data is **local-first**: every add/edit/delete saves immediately on the device, so the app
  always works offline. When Supabase is ready it also syncs to the cloud automatically.
- Optionally, it can sync to **Supabase** using only the public anon/publishable key — still no login.
- **Every row is tappable**: tap a student, class, event or conversation to edit/reply.
- **Principal photo**: open **Profile** and tap the camera badge on the avatar to take a photo
  (or pick from the gallery). The photo is saved with the profile and shows on Home and Profile.

**APK:** `D:\school\SchoolDashboard.apk` (debug-signed, installable by sideloading)

---

## Current configuration

`.env` is already set to your project:

```
VITE_SUPABASE_URL=https://yecmhcwgnivgxjihrhsa.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### One thing still needed: create the tables

The key works, but Supabase currently reports `Could not find the table 'public.students'`.
That is why the app says **data not save**. Run this once:

1. Sign in at <https://supabase.com/dashboard> (GitHub/Google/email — your account).
2. Open the project **yecmhcwgnivgxjihrhsa**.
3. Left sidebar: **SQL Editor → New query**.
4. Open `D:\school\school-dashboard\supabase\schema-noauth.sql` in Notepad,
   select all (`Ctrl+A`), copy (`Ctrl+C`).
5. Paste into the Supabase query box (`Ctrl+V`) and click **Run** (or `Ctrl+Enter`).
6. You should see `Success. No rows returned`.

Then **close and reopen the app** on your phone. All screens will load and save
to Supabase directly — no login is required. If the tables are missing, the app
shows a clear message and keeps saving on the device; use **Profile → Retry Supabase sync**
after running the SQL. The principal photo uses a built-in local avatar by default
(`public/avatar.svg`) and can be replaced with a camera photo.

> **Security note:** this no-login schema uses public read/write policies. Anyone with
> the anon key can read or change the data, so use it for demos or trusted apps only.
> If you later want per-user accounts, switch back to `supabase/schema.sql` and the
> sign-in version of the app.

---

## Using the app

- **Home** — student count and average attendance are computed live. The gear icon
  edits teacher count / pending fees; the bell or **Add** button adds an event.
  Tap an event card to edit it.
- **Students** — **+ Add** creates a record; tap any row (or the pencil icon) to edit,
  the trash icon deletes. The search box filters the live list.
- **Academics** — filter by day, **+ Add** for a class, tap any class card to edit it.
- **Messages** — **+ New** starts a conversation; tap a conversation to reply, the
  pencil/trash icons edit or delete it.
- **Profile** — edit principal name and title, or tap the camera badge on the photo
  to take a new picture. **Retry Supabase sync** reconnects after running the SQL.
  **Connect Supabase** opens the connection screen.

The Supabase URL/key in `.env` is baked into the APK and takes priority over values
entered in the app. To change the project, update `.env` and rebuild the APK.

---

## Install on a phone

1. Copy `SchoolDashboard.apk` to your Android phone.
2. Open it and allow **Install unknown apps / Unknown sources**.
3. Install and launch **School Dashboard**.

Requires Android 5.1+ (API 22). Debug-signed build for testing.

---

## Project structure

- `src/App.tsx` — navigation, modals, toast, no auth gating
- `src/views/` — the five data-driven dashboard screens
- `src/hooks/useDashboardData.ts` — local/Supabase data layer and CRUD
- `src/lib/localData.ts` — device storage with sample data
- `src/lib/supabase.ts` — connection config (`.env` or in-app)
- `supabase/schema-noauth.sql` — public-access tables (no login)
- `android/` — Capacitor native project
- `D:\school\build-tools\` — portable JDK 17 + Android SDK

## Rebuild after code/config changes

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
