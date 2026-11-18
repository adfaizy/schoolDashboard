# School Dashboard — Android APK (no login)

This version opens **straight into the dashboard** — no sign-in screen, no username, no password.

- By default, data is saved **on the device** (works offline, sample data included).
- Optionally, it can sync to **Supabase** using only the public anon/publishable key — still no login.

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
to Supabase directly — no login is required. The principal photo is set to a
default avatar in the SQL script and also in the app, so it appears even when
the profile row is empty.

> **Security note:** this no-login schema uses public read/write policies. Anyone with
> the anon key can read or change the data, so use it for demos or trusted apps only.
> If you later want per-user accounts, switch back to `supabase/schema.sql` and the
> sign-in version of the app.

---

## Using the app

- **Home** — student count and average attendance are computed live. The gear icon
  edits teacher count / pending fees; the bell or **Add** button adds an event.
- **Students / Academics / Messages** — **+ Add** creates a record; pencil/trash
  icons edit or delete it. Student search filters the live list.
- **Profile** — edit principal name, title and avatar. **Connect Supabase** opens
  the connection screen; **Use locally** switches back to device storage.

To change the Supabase URL/key later, open **Profile → Connect Supabase**. The
values entered there are stored on the device and override `.env`.

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
