"""
Shared data layer for the School Management System.

- Talks to the same Supabase project as the Android app (project yecmhcwgnivgxjihrhsa).
- Falls back to a local JSON mirror (school_local.json) when there is no internet,
  so every screen still works offline. Changes made offline are kept locally and
  re-synced the next time the app runs online.
"""

import json
import os
import urllib.request
import urllib.error
import uuid
from datetime import datetime

SUPABASE_URL = "https://yecmhcwgnivgxjihrhsa.supabase.co"
# Publishable (public) key — same one baked into the Android app.
SUPABASE_KEY = "sb_publishable_QTm5lxUoZNE0lQr-cqG8uQ_W0pArJCF"
REST = f"{SUPABASE_URL}/rest/v1"
LOCAL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "school_local.json")
SINGLETON_ID = "00000000-0000-0000-0000-000000000001"


def now():
    return datetime.now().isoformat(timespec="seconds")


def new_id():
    return str(uuid.uuid4())


class SupabaseError(Exception):
    pass


def _request(method, path, body=None, headers=None):
    url = f"{REST}/{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    hdrs = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
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
    except Exception as e:  # network, timeout, DNS...
        raise SupabaseError(str(e))


class SchoolDB:
    """Small helper around the Supabase REST API with a JSON offline mirror."""

    def __init__(self):
        self.offline = False
        self.local = self._load_local()

    # ---------- local mirror ----------
    def _load_local(self):
        try:
            with open(LOCAL_PATH, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            return {}

    def _save_local(self):
        try:
            with open(LOCAL_PATH, "w", encoding="utf-8") as fh:
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
    def select(self, table, params=""):
        try:
            _, rows = _request("GET", f"{table}?select=*{params}")
            if isinstance(rows, dict):  # maybeSingle style errors
                rows = [rows]
            self.offline = False
            self.local[table] = rows
            self._save_local()
            return rows
        except SupabaseError:
            self.offline = True
            return self._local_list(table)

    def get_one(self, table, row_id, id_field="id"):
        try:
            _, rows = _request("GET", f"{table}?select=*&{id_field}=eq.{row_id}")
            self.offline = False
            if isinstance(rows, list) and rows:
                return rows[0]
            return None
        except SupabaseError:
            self.offline = True
            return next((r for r in self._local_list(table) if r.get(id_field) == row_id), None)

    def insert(self, table, row):
        row = dict(row)
        row.setdefault("id", new_id())
        row.setdefault("created_at", now())
        try:
            _request("POST", table, row, headers={"Prefer": "return=representation"})
            self.offline = False
            self._local_upsert(table, row)
            return row
        except SupabaseError:
            self.offline = True
            self._local_upsert(table, row)
            return row

    def update(self, table, row_id, updates, id_field="id"):
        try:
            _request("PATCH", f"{table}?{id_field}=eq.{row_id}", updates,
                     headers={"Prefer": "return=minimal"})
            self.offline = False
            # update local mirror
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
        row = dict(row)
        row.setdefault("id", new_id())
        try:
            qs = f"?on_conflict={on_conflict}" if on_conflict else ""
            _request("POST", f"{table}{qs}", row,
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
            _request("DELETE", f"{table}?{id_field}=eq.{row_id}",
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
