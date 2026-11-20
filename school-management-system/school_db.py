"""
Shared data layer for the School Management System.

- Talks to the same Supabase project as the web/Android app (project yecmhcwgnivgxjihrhsa).
- Uses Supabase Auth: anyone can sign up without approval; every school account
  only sees its own rows; the administrator can view, reset and delete accounts.
- Falls back to a per-account local JSON mirror when there is no internet.
"""

import json
import os
import urllib.parse
import urllib.request
import urllib.error
import uuid
from datetime import datetime

SUPABASE_URL = "https://yecmhcwgnivgxjihrhsa.supabase.co"
# Publishable (public) key — same one baked into the Android app.
SUPABASE_KEY = "sb_publishable_QTm5lxUoZNE0lQr-cqG8uQ_W0pArJCF"
REST = f"{SUPABASE_URL}/rest/v1"
AUTH = f"{SUPABASE_URL}/auth/v1"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_PATH = os.path.join(BASE_DIR, "auth_session.json")
RESET_FLAG_PATH = os.path.join(BASE_DIR, "auth_login_reset_20261120.flag")
SINGLETON_ID = "00000000-0000-0000-0000-000000000001"


def now():
    return datetime.now().isoformat(timespec="seconds")


def new_id():
    return str(uuid.uuid4())


class SupabaseError(Exception):
    pass


def _http(method, url, body=None, token=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    hdrs = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token or SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    req.headers = hdrs
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, (json.loads(raw) if raw.strip() else [])
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw)
            message = parsed.get("msg") or parsed.get("message") or parsed.get("error_description") or raw
        except Exception:
            message = raw
        raise SupabaseError(f"{e.code}: {message}")
    except Exception as e:
        raise SupabaseError(str(e))


def _request(method, path, body=None, headers=None, token=None):
    url = f"{REST}/{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    hdrs = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token or SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if headers:
        hdrs.update(headers)
    req.headers = hdrs
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, (json.loads(raw) if raw.strip() else [])
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        raise SupabaseError(f"{e.code}: {raw}")
    except Exception as e:
        raise SupabaseError(str(e))


# ---------------------------------------------------------------- auth session
def load_session():
    # One-time reset after all old accounts were removed: clear any stale desktop
    # session so the sign-in screen is shown on the next launch.
    try:
        if not os.path.exists(RESET_FLAG_PATH):
            clear_session()
            with open(RESET_FLAG_PATH, "w", encoding="utf-8") as fh:
                fh.write("1")
    except OSError:
        pass
    try:
        with open(SESSION_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("access_token") and data.get("user"):
            return data
    except Exception:
        pass
    return None


def save_session(session):
    try:
        with open(SESSION_PATH, "w", encoding="utf-8") as fh:
            json.dump(session, fh, indent=2)
    except OSError:
        pass


def clear_session():
    try:
        os.remove(SESSION_PATH)
    except OSError:
        pass


def sign_up(email, password, full_name):
    body = {
        "email": email.strip(),
        "password": password,
        "data": {"full_name": full_name.strip() or "Principal"},
    }
    _, data = _http("POST", f"{AUTH}/signup", body)
    if isinstance(data, dict) and data.get("error"):
        raise SupabaseError(str(data.get("error")))
    session = {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "user": data.get("user") or {},
        "role": "school",
        "viewing_user_id": None,
    }
    if not session["access_token"]:
        raise SupabaseError("Account created. Please sign in with your email and password.")
    save_session(session)
    return session


def sign_in(email, password):
    body = {"email": email.strip(), "password": password}
    _, data = _http("POST", f"{AUTH}/token?grant_type=password", body)
    if isinstance(data, dict) and data.get("error"):
        raise SupabaseError(str(data.get("error")))
    token = data.get("access_token")
    user = data.get("user") or {}
    if not token or not user.get("id"):
        raise SupabaseError("Sign in failed. Check your email and password.")
    session = {
        "access_token": token,
        "refresh_token": data.get("refresh_token"),
        "user": user,
        "role": "school",
        "viewing_user_id": None,
    }
    save_session(session)
    return session


def send_password_reset(email):
    """Ask Supabase Auth to email a password reset link to a school account."""
    _, data = _http("POST", f"{AUTH}/recover", {"email": email.strip()})
    if isinstance(data, dict) and data.get("error"):
        raise SupabaseError(str(data.get("error")))


def refresh_session(session):
    token = session.get("refresh_token")
    if not token:
        return session
    _, data = _http("POST", f"{AUTH}/token?grant_type=refresh_token", {"refresh_token": token})
    if data.get("access_token"):
        session["access_token"] = data["access_token"]
        session["refresh_token"] = data.get("refresh_token", token)
        save_session(session)
    return session


def fetch_role(session):
    token = session.get("access_token")
    uid = (session.get("user") or {}).get("id")
    if not token or not uid:
        return "school"
    try:
        _, rows = _request("GET", f"profiles?select=role&id=eq.{uid}", token=token)
        if isinstance(rows, list) and rows:
            return rows[0].get("role", "school")
    except SupabaseError:
        pass
    return "school"


class SchoolDB:
    """Supabase REST helper with a JSON offline mirror scoped to one account."""

    def __init__(self, session=None):
        self.session = session or load_session()
        self.offline = False
        self.local = {}
        self.local_path = self._local_path()
        self.local = self._load_local()

    # ---------- session / ownership ----------
    @property
    def token(self):
        return (self.session or {}).get("access_token")

    @property
    def user_id(self):
        return ((self.session or {}).get("user") or {}).get("id")

    @property
    def email(self):
        return ((self.session or {}).get("user") or {}).get("email", "")

    @property
    def role(self):
        return (self.session or {}).get("role", "school")

    @property
    def viewing_user_id(self):
        return (self.session or {}).get("viewing_user_id")

    @property
    def owner_id(self):
        return self.viewing_user_id or self.user_id

    def set_role(self, role):
        self.session["role"] = role
        save_session(self.session)

    def set_viewing(self, user_id):
        self.session["viewing_user_id"] = user_id
        save_session(self.session)
        self.local_path = self._local_path()
        self.local = self._load_local()

    def exit_viewing(self):
        self.set_viewing(None)

    def _local_path(self):
        uid = self.owner_id or "anonymous"
        return os.path.join(BASE_DIR, f"school_local_{uid}.json")

    # ---------- helpers ----------
    def _owner_filter(self, table):
        if not self.owner_id:
            return ""
        if table == "profiles":
            return f"&id=eq.{self.owner_id}"
        return f"&user_id=eq.{self.owner_id}"

    def _owned(self, table, row):
        row = dict(row)
        if not self.owner_id:
            return row
        if table == "profiles":
            row.setdefault("id", self.owner_id)
        else:
            row.setdefault("user_id", self.owner_id)
        return row

    # ---------- local mirror ----------
    def _load_local(self):
        try:
            with open(self.local_path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            return {}

    def _save_local(self):
        try:
            with open(self.local_path, "w", encoding="utf-8") as fh:
                json.dump(self.local, fh, indent=2, default=str)
        except OSError:
            pass

    def _local_list(self, table):
        return list(self.local.get(table, []))

    def _local_upsert(self, table, row):
        rows = self.local.setdefault(table, [])
        existing = next((i for i, r in enumerate(rows) if r.get("id") == row.get("id")), None)
        if existing is None:
            rows.append(row)
        else:
            rows[existing] = row
        self._save_local()

    def _local_delete(self, table, row_id):
        self.local[table] = [r for r in self.local.get(table, []) if r.get("id") != row_id]
        self._save_local()

    # ---------- REST ----------
    def _req(self, method, path, body=None, headers=None):
        return _request(method, path, body, headers, token=self.token)

    def select(self, table, params=""):
        try:
            _, rows = self._req("GET", f"{table}?select=*{params}{self._owner_filter(table)}")
            if isinstance(rows, dict):
                rows = [rows]
            self.offline = False
            self.local[table] = rows
            self._save_local()
            return rows
        except SupabaseError:
            self.offline = True
            return self._local_list(table)

    def select_unfiltered(self, table, params=""):
        """Admin-only helper: reads rows across all schools."""
        try:
            _, rows = self._req("GET", f"{table}?select=*{params}")
            return rows if isinstance(rows, list) else [rows]
        except SupabaseError:
            return []

    def get_one(self, table, row_id, id_field="id"):
        try:
            _, rows = self._req("GET", f"{table}?select=*&{id_field}=eq.{row_id}{self._owner_filter(table)}")
            self.offline = False
            if isinstance(rows, list) and rows:
                return rows[0]
            return None
        except SupabaseError:
            self.offline = True
            return next((r for r in self._local_list(table) if r.get(id_field) == row_id), None)

    @staticmethod
    def _has_id(table):
        return table not in ("settings", "attendance")

    def insert(self, table, row):
        row = self._owned(table, row)
        if self._has_id(table):
            row.setdefault("id", new_id())
        if table not in ("attendance", "transport_passengers", "hostel_assignments"):
            row.setdefault("created_at", now())
        try:
            self._req("POST", table, row, headers={"Prefer": "return=representation"})
            self.offline = False
            self._local_upsert(table, row)
            return row
        except SupabaseError:
            self.offline = True
            self._local_upsert(table, row)
            return row

    def update(self, table, row_id, updates, id_field="id"):
        updates = self._owned(table, updates)
        try:
            self._req("PATCH", f"{table}?{id_field}=eq.{row_id}{self._owner_filter(table)}",
                      updates, headers={"Prefer": "return=minimal"})
            self.offline = False
            for r in self.local.get(table, []):
                if r.get(id_field) == row_id:
                    r.update(updates)
                    break
            self._save_local()
            return True
        except SupabaseError:
            self.offline = True
            for r in self.local.get(table, []):
                if r.get(id_field) == row_id:
                    r.update(updates)
            self._save_local()
            return False

    def upsert(self, table, row, on_conflict=None):
        row = self._owned(table, row)
        if self._has_id(table):
            row.setdefault("id", new_id())
        try:
            qs = f"?on_conflict={on_conflict}" if on_conflict else ""
            self._req("POST", f"{table}{qs}", row,
                      headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
            self.offline = False
            self._local_upsert(table, row)
            return row
        except SupabaseError:
            self.offline = True
            self._local_upsert(table, row)
            return row

    def delete(self, table, row_id, id_field="id"):
        try:
            self._req("DELETE", f"{table}?{id_field}=eq.{row_id}{self._owner_filter(table)}",
                      headers={"Prefer": "return=minimal"})
            self.offline = False
        except SupabaseError:
            self.offline = True
        self._local_delete(table, row_id)

    # ---------- convenience readers ----------
    def singleton(self, table):
        rows = self.select(table)
        return rows[0] if rows else None

    def students(self):
        return self.select("students", "&order=created_at.asc")

    def classes(self):
        return self.select("classes", "&order=grade.asc,section.asc")

    def staff(self):
        return self.select("staff", "&order=created_at.asc")

    def student_name(self, student_id, fallback="Unknown"):
        return next((s["name"] for s in self.students() if s.get("id") == student_id), fallback)

    def class_name(self, class_id, fallback="No class"):
        for c in self.classes():
            if c.get("id") == class_id:
                sec = f" {c['section']}" if c.get("section") else ""
                return f"{c['grade']}{sec}"
        return fallback

    # ---------- admin account controls ----------
    def admin_users(self):
        """List school accounts using the SQL Editor RPC (admin role only)."""
        try:
            _, rows = self._req("POST", "rpc/admin_list_school_users", {})
            return rows if isinstance(rows, list) else []
        except SupabaseError:
            return []

    def admin_delete_user(self, user_id):
        """Delete a school account; the SQL function checks admin permission."""
        try:
            self._req("POST", "rpc/admin_delete_school_user", {"target": user_id})
            return True, ""
        except SupabaseError as e:
            return False, str(e)
