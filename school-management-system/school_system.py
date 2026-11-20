"""
School Management System — Desktop Edition
=========================================

A fully functional school management system built with Tkinter.
Talks to the same Supabase database as the School Dashboard Android app,
and falls back to a local JSON file when offline.

Modules: Dashboard/Reports · Students · Classes & Subjects · Staff & Teachers ·
Timetable · Attendance · Exams & Results · Fees · Library (Book Bank) ·
Transport · Hostel · Messages · Notices · School Settings · Principal Profile

Run with:  python school_system.py   (or double-click run.bat)
"""

import os
import sys
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, simpledialog
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# allow importing the standalone phone dialer located in the parent folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from school_db import (
    SchoolDB, SINGLETON_ID, sign_in, sign_up, fetch_role, send_password_reset,
    load_session, save_session, clear_session, SupabaseError,
)

try:
    from phone_dialer import PhoneDialer
except Exception:
    PhoneDialer = None

APP_NAME = "School Management System"
APP_VERSION = "1.0.0"

def _system_dark_mode():
    if sys.platform != "win32":
        return False
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        )
        value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
        winreg.CloseKey(key)
        return value == 0
    except Exception:
        return False


_DARK = _system_dark_mode()
# Always use the sharp light palette; the OS theme only changes the sidebar shade.
if _DARK:
    COLORS = {
        "sidebar": "#dbe3ef",
        "sidebar_hi": "#aab8ca",
        "accent": "#0b5cff",
        "bg": "#eef2f8",
        "card": "#ffffff",
        "text": "#020617",
    }
else:
    COLORS = {
        "sidebar": "#eef2f8",
        "sidebar_hi": "#dbe3ef",
        "accent": "#0b5cff",
        "bg": "#eef2f8",
        "card": "#ffffff",
        "text": "#020617",
    }


# ---------------------------------------------------------------- helpers
def today_str():
    return date.today().isoformat()


def class_label(c):
    sec = f" {c['section']}" if c.get("section") else ""
    return f"{c['grade']}{sec}"


def fmt_date(value):
    if not value:
        return ""
    return str(value)[:10]


def period_key(row):
    period_no = row.get("period_no")
    if period_no is not None:
        return f"p{period_no}"
    return f"t{row.get('time') or ''}"


def merge_subjects(*lists):
    seen = set()
    result = []
    for values in lists:
        for value in values or []:
            subject = str(value or "").strip()
            if not subject or subject.lower() in seen:
                continue
            seen.add(subject.lower())
            result.append(subject)
    return result


class CrudPanel(ttk.Frame):
    """Generic list + add/edit/delete panel driven by a config."""

    def __init__(self, master, db, title, table, columns, fields, title_field=None,
                 refresh_hint=None, actions=None, transform=None):
        super().__init__(master)
        self.db = db
        self.title = title
        self.table = table
        self.columns = columns
        self.fields = fields
        self.title_field = title_field or columns[0]["key"]
        self.actions = actions or []
        self.transform = transform or (lambda data, row: data)
        self._opt_maps = {}
        self._build()
        self.refresh()

    # ---------- UI ----------
    def _build(self):
        head = ttk.Frame(self, padding=(12, 12, 12, 0))
        head.pack(fill="x")
        ttk.Label(head, text=self.title, font=("Segoe UI", 15, "bold")).pack(side="left")
        for label, cmd in self.actions:
            ttk.Button(head, text=label, command=cmd).pack(side="right", padx=2)
        ttk.Button(head, text="Delete", command=self.delete).pack(side="right", padx=2)
        ttk.Button(head, text="Edit", command=self.edit).pack(side="right", padx=2)
        ttk.Button(head, text="+ Add", command=self.add).pack(side="right", padx=2)
        ttk.Button(head, text="Refresh", command=self.refresh).pack(side="right", padx=2)

        table_frame = ttk.Frame(self, padding=(12, 8, 12, 12))
        table_frame.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(table_frame, columns=[c["key"] for c in self.columns],
                                 show="headings", selectmode="browse")
        for c in self.columns:
            self.tree.heading(c["key"], text=c["label"])
            self.tree.column(c["key"], width=c.get("width", 140), anchor=c.get("anchor", "w"))
        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", lambda _e: self.edit())

    # ---------- data ----------
    def refresh(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        rows = self.db.select(self.table)
        for row in rows:
            self.tree.insert("", "end", iid=str(row.get("id")),
                             values=[c.get("render", lambda r: r.get(c["key"], ""))(row)
                                     for c in self.columns])

    def selected_row(self):
        sel = self.tree.selection()
        if not sel:
            return None
        rid = sel[0]
        return next((r for r in self.db.select(self.table) if str(r.get("id")) == rid), None)

    def add(self):
        self._open_form()

    def edit(self):
        row = self.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a row first.")
            return
        self._open_form(row)

    def delete(self):
        row = self.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a row first.")
            return
        label = str(row.get(self.title_field, "this record"))
        if messagebox.askyesno("Delete", f"Delete: {label}?"):
            self.db.delete(self.table, row.get("id"))
            self.refresh()

    # ---------- form ----------
    def _combo_values(self, field):
        opts = field["options"]() if callable(field.get("options")) else field.get("options", [])
        labels = [o[0] for o in opts]
        self._opt_maps[field["key"]] = {label: o[1] for label, o in zip(labels, opts)}
        return labels, self._opt_maps[field["key"]]

    def _open_form(self, row=None):
        top = tk.Toplevel(self)
        top.title(("Edit" if row else "Add") + " — " + self.title)
        top.transient(self.winfo_toplevel())
        top.grab_set()
        top.resizable(False, False)

        entries = {}
        for i, field in enumerate(self.fields):
            ttk.Label(top, text=field["label"] + (" *" if field.get("required") else "")).grid(
                row=i, column=0, sticky="w", padx=12, pady=4)
            if field.get("type") == "combo":
                labels, _ = self._combo_values(field)
                current = str(row.get(field["key"], "")) if row else ""
                # try to preselect the label matching the stored value
                pre = next((l for l, v in self._opt_maps[field["key"]].items() if v == current), "")
                var = tk.StringVar(value=pre or (labels[0] if labels else ""))
                combo = ttk.Combobox(top, textvariable=var, values=labels, state="readonly", width=40)
                combo.grid(row=i, column=1, padx=12, pady=4, sticky="ew")
                entries[field["key"]] = ("combo", var)
            elif field.get("type") == "number":
                var = tk.StringVar(value=str(row.get(field["key"], "") if row else "0"))
                ent = ttk.Entry(top, textvariable=var, width=42)
                ent.grid(row=i, column=1, padx=12, pady=4, sticky="ew")
                entries[field["key"]] = ("number", var)
            elif field.get("type") == "date":
                var = tk.StringVar(value=str(fmt_date(row.get(field["key"]))) if row else today_str())
                ent = ttk.Entry(top, textvariable=var, width=42)
                ent.grid(row=i, column=1, padx=12, pady=4, sticky="ew")
                entries[field["key"]] = ("date", var)
            elif field.get("type") == "memo":
                var = tk.StringVar(value=str(row.get(field["key"], "") if row else ""))
                ent = tk.Text(top, width=34, height=3)
                ent.insert("1.0", var.get())
                ent.grid(row=i, column=1, padx=12, pady=4, sticky="ew")
                entries[field["key"]] = ("memo", ent)
            else:
                var = tk.StringVar(value=str(row.get(field["key"], "") if row else ""))
                ent = ttk.Entry(top, textvariable=var, width=42)
                ent.grid(row=i, column=1, padx=12, pady=4, sticky="ew")
                entries[field["key"]] = ("text", var)

        def save():
            data = {}
            missing = []
            for field in self.fields:
                kind, widget = entries[field["key"]]
                if kind == "memo":
                    val = widget.get("1.0", "end-1c").strip()
                else:
                    val = widget.get().strip()
                if kind == "combo":
                    val = self._opt_maps[field["key"]].get(val, val)
                if kind == "number":
                    try:
                        val = float(val or 0)
                    except ValueError:
                        messagebox.showerror("Invalid number", f"{field['label']} must be a number.")
                        return
                if field.get("required") and (val == "" or val is None):
                    missing.append(field["label"])
                data[field["key"]] = val
            if missing:
                messagebox.showerror("Missing values", "Please fill in: " + ", ".join(missing))
                return
            data = self.transform(data, row)
            if row:
                self.db.update(self.table, row["id"], data)
            else:
                self.db.insert(self.table, data)
            top.destroy()
            self.refresh()

        btns = ttk.Frame(top, padding=(12, 6, 12, 12))
        btns.grid(row=len(self.fields), column=0, columnspan=2, sticky="ew")
        ttk.Button(btns, text="Save", command=save).pack(side="right")
        ttk.Button(btns, text="Cancel", command=top.destroy).pack(side="right", padx=(0, 6))


# ---------------------------------------------------------------- dashboard
class DashboardPanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        head = ttk.Frame(self, padding=(12, 12, 12, 0))
        head.pack(fill="x")
        ttk.Label(head, text="Dashboard & Reports", font=("Segoe UI", 15, "bold")).pack(side="left")
        ttk.Button(head, text="Refresh", command=self.refresh).pack(side="right")

        self.cards = ttk.Frame(self, padding=(12, 12, 12, 4))
        self.cards.pack(fill="x")
        self.report = tk.Text(self, height=18, width=10, wrap="word", background="#dbe3ef",
                              foreground="#020617", font=("Consolas", 10), relief="flat")
        self.report.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        self.refresh()

    def stat_card(self, parent, label, value, col):
        frame = tk.Frame(parent, bg=COLORS["card"], padx=18, pady=14, highlightthickness=1,
                         highlightbackground="#aab8ca")
        frame.grid(row=0, column=col, padx=6, pady=4, sticky="nsew")
        tk.Label(frame, text=value, bg=COLORS["card"], font=("Segoe UI", 22, "bold"),
                 fg="#020617").pack()
        tk.Label(frame, text=label, bg=COLORS["card"], font=("Segoe UI", 9), fg="#0b5cff").pack()

    def refresh(self):
        for w in self.cards.winfo_children():
            w.destroy()
        students = self.db.students()
        staff = self.db.staff()
        teaching = [s for s in staff if s.get("staff_category") == "teaching" and s.get("status") != "inactive"]
        classes = self.db.classes()
        books = self.db.select("library_books")
        issued = sum(1 for b in books if b.get("issued_to"))
        msgs = self.db.select("messages")
        unread = sum(int(m.get("unread", 0) or 0) for m in msgs)
        fees = self.db.select("fees")
        fees_total = sum(float(f.get("amount_paid", 0) or 0) for f in fees)
        pending = sum(float(f.get("amount_paid", 0) or 0) for f in fees if f.get("status") != "paid")
        # pending fees = unpaid fee rows' amounts? Android pendingFees sums fees where status != paid amount_paid? 
        # Actually pendingFees sums amount_paid? Let's check Android pendingFees.
        attendance = self.db.select("attendance")
        student_att = [a for a in attendance if a.get("entity_type") == "students"]
        marked = len({a.get("record_id") for a in student_att})
        present = sum(1 for a in student_att if a.get("status") in ("present", "late"))
        rate = round(present / len(student_att) * 100, 1) if student_att else None
        events = self.db.select("events")
        stats = [
            ("Students", len(students)),
            ("Teaching Staff", len(teaching)),
            ("Classes", len(classes)),
            ("Books Issued", issued),
            ("Unread Messages", unread),
            ("Fees Collected", f"Rs {fees_total:,.0f}"),
            ("Fees Pending", f"Rs {pending:,.0f}"),
            ("Attendance", (f"{rate}%" if rate is not None else "—")),
        ]
        for col, (label, value) in enumerate(stats):
            self.stat_card(self.cards, label, value, col)
        self.cards.columnconfigure(tuple(range(len(stats))), weight=1)

        lines = [f"School Management Report — {datetime.now():%d %b %Y %H:%M}\\n"]
        lines.append(f"Total students: {len(students)}   Teaching staff: {len(teaching)}   Classes: {len(classes)}\\n")
        lines.append(f"Attendance records: {len(student_att)}  (present+late {present})  rate {rate if rate is not None else '—'}%")
        lines.append("\\nStudents not marked present today:")
        if students:
            today = today_str()
            marked_today = {a.get("record_id") for a in student_att if a.get("date_str") == today}
            missing = [s["name"] for s in students if s["id"] not in marked_today]
            lines.append("  " + (", ".join(missing[:20]) if missing else "All students marked today."))
        else:
            lines.append("  No students yet.")
        lines.append("\\nUpcoming events:")
        for e in events:
            lines.append(f"  • {e.get('type','')}: {e.get('title','')} — {e.get('time','')}")
        if not events:
            lines.append("  No events scheduled.")
        lines.append("\\nFee history preview (latest 10):")
        fees_sorted = sorted(fees, key=lambda f: str(f.get("payment_date", "")), reverse=True)[:10]
        for f in fees_sorted:
            name = self.db.student_name(f.get("student_id"))
            lines.append(f"  • {name} — {f.get('month_year','')} — Rs {float(f.get('amount_paid',0) or 0):,.2f}")
        if not fees_sorted:
            lines.append("  No payments recorded.")
        self.report.delete("1.0", "end")
        self.report.insert("1.0", "\\n".join(lines))


# ---------------------------------------------------------------- students
def build_student_map(db):
    return {s["id"]: s["name"] for s in db.students()}

def build_class_options(db):
    return [(class_label(c), c["id"]) for c in db.classes()]

def student_attendance_rate(db, student_id):
    rows = [a for a in db.select("attendance")
            if a.get("entity_type") == "students" and a.get("record_id") == student_id]
    if not rows:
        return None
    marked = sum(1 for a in rows if a.get("status") in ("present", "absent", "late", "leave"))
    good = sum(1 for a in rows if a.get("status") in ("present", "late"))
    if not marked:
        return None
    return round(good / marked * 100, 1)


def status_for_attendance(rate):
    if rate is None:
        return "No records"
    if rate >= 90:
        return "Excellent"
    if rate >= 75:
        return "Good"
    if rate >= 60:
        return "Warning"
    return "Critical"
    for c in db.classes():
        if c.get("id") == class_id:
            return c
    return None

def student_transform(db):
    def wrap(data, row):
        cls = class_by_id(db, data.get("class_id"))
        if cls:
            sec = f" {cls['section']}" if cls.get("section") else ""
            data["grade"] = f"{cls['grade']}{sec}"
        return data
    return wrap

def ask_choice(parent, title, options, label="Destination", initial=None):
    """Show a small picker and return the selected value from (label, value) pairs."""
    if not options:
        messagebox.showerror("Nothing available", "Add an option first, then transfer the record.", parent=parent)
        return None
    top = tk.Toplevel(parent)
    top.title(title)
    top.transient(parent.winfo_toplevel())
    top.resizable(False, False)
    top.configure(bg=COLORS["card"])
    choice = {"value": None}

    tk.Label(top, text=label, bg=COLORS["card"], fg=COLORS["text"],
             font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=16, pady=(16, 4))
    initial_label = next((lbl for lbl, val in options if val == initial), options[0][0])
    var = tk.StringVar(value=initial_label)
    combo = ttk.Combobox(top, textvariable=var, values=[lbl for lbl, _ in options],
                         state="readonly", width=32)
    combo.pack(padx=16, pady=4)

    def confirm():
        lookup = dict(options)
        choice["value"] = lookup.get(var.get())
        top.destroy()

    ttk.Button(top, text="Transfer", command=confirm).pack(fill="x", padx=16, pady=(10, 4))
    ttk.Button(top, text="Cancel", command=top.destroy).pack(fill="x", padx=16, pady=(0, 16))
    top.grab_set()
    top.wait_window()
    return choice["value"]


def ask_class_choice(parent, db, title, exclude=None):
    """Show a class picker and return the selected class id."""
    classes = [c for c in db.classes() if str(c.get("id")) != str(exclude)]
    if not classes:
        messagebox.showerror("No classes", "Add another class first, then transfer the record.", parent=parent)
        return None
    return ask_choice(parent, title, [(class_label(c), str(c.get("id"))) for c in classes],
                      label="Destination class")


def make_students_panel(parent, db):
    cols = [
        {"key": "name", "label": "Name", "width": 180},
        {"key": "class_id", "label": "Class", "width": 110, "render": lambda r: db.class_name(r.get("class_id"))},
        {"key": "roll_no", "label": "Roll No", "width": 90},
        {"key": "father_name", "label": "Father", "width": 150},
        {"key": "parent_contact", "label": "Contact", "width": 130},
        {"key": "admission_date", "label": "Admitted", "width": 100, "render": lambda r: fmt_date(r.get("admission_date"))},
        {"key": "status", "label": "Status", "width": 90,
         "render": lambda r: status_for_attendance(student_attendance_rate(db, r.get("id")))},
    ]
    fields = [
        {"key": "name", "label": "Full name", "required": True},
        {"key": "class_id", "label": "Class", "type": "combo", "options": lambda: build_class_options(db)},
        {"key": "roll_no", "label": "Roll number"},
        {"key": "father_name", "label": "Father's name"},
        {"key": "parent_contact", "label": "Parent contact"},
        {"key": "admission_date", "label": "Admission date", "type": "date"},
    ]
    panel = None

    def transfer_student():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a student first.", parent=panel)
            return
        dest = ask_class_choice(panel, db, "Transfer student", exclude=row.get("class_id"))
        if not dest:
            return
        klass = class_by_id(db, dest)
        updates = {"class_id": dest}
        if klass:
            sec = f" {klass.get('section')}" if klass.get("section") else ""
            updates["grade"] = f"{klass.get('grade')}{sec}"
        db.update("students", row.get("id"), updates)
        panel.refresh()
        messagebox.showinfo("Transferred", f"{row.get('name')} moved to {db.class_name(dest)}.", parent=panel)

    panel = CrudPanel(parent, db, "Students & Parents", "students", cols, fields,
                      title_field="name", transform=student_transform(db),
                      actions=[("Transfer", transfer_student)])
    return panel


def make_classes_panel(parent, db):
    cols = [
        {"key": "grade", "label": "Grade", "width": 120},
        {"key": "section", "label": "Section", "width": 90},
        {"key": "subjects", "label": "Subjects", "width": 420,
         "render": lambda r: ", ".join(r.get("subjects", []) if isinstance(r.get("subjects"), list) else [])},
    ]
    fields = [
        {"key": "grade", "label": "Grade (e.g. Grade 10)", "required": True},
        {"key": "section", "label": "Section (e.g. A)"},
        {"key": "subjects_text", "label": "Subjects (comma separated)", "type": "memo"},
    ]

    def transform(data, row):
        raw = data.pop("subjects_text", "")
        subjects = [s.strip() for s in str(raw).replace("\n", ",").split(",") if s.strip()]
        data["subjects"] = subjects
        return data

    panel = None

    def transfer_class():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a class first.", parent=panel)
            return
        dest = ask_class_choice(panel, db, "Transfer class", exclude=row.get("id"))
        if not dest:
            return
        dest_class = class_by_id(db, dest)
        students = [s for s in db.students() if s.get("class_id") == row.get("id")]
        periods = [p for p in db.select("schedule_items") if p.get("class_id") == row.get("id")]
        taken = {period_key(p) for p in db.select("schedule_items") if p.get("class_id") == dest}
        clash = next((p for p in periods if period_key(p) in taken), None)
        if clash:
            messagebox.showerror("Slot conflict",
                                 f"{db.class_name(dest)} already has "
                                 f"{'period ' + str(clash.get('period_no')) if clash.get('period_no') is not None else clash.get('time')}.",
                                 parent=panel)
            return
        if not messagebox.askyesno(
            "Transfer class",
            f"Move {len(students)} student(s) and {len(periods)} timetable period(s) to "
            f"{db.class_name(dest)}? {class_label(row)} will then be deleted.",
            parent=panel,
        ):
            return
        db.update("classes", dest, {"subjects": merge_subjects(
            (dest_class or {}).get("subjects"), row.get("subjects"))})
        for student in students:
            db.update("students", student.get("id"), {
                "class_id": dest, "grade": class_label(dest_class or {"grade": db.class_name(dest)}),
            })
        for period in periods:
            db.update("schedule_items", period.get("id"), {"class_id": dest})
        db.delete("classes", row.get("id"))
        panel.refresh()
        messagebox.showinfo("Transferred", f"{class_label(row)} merged into {db.class_name(dest)}.", parent=panel)

    def transfer_subject():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a class first.", parent=panel)
            return
        subjects = merge_subjects(row.get("subjects"))
        if not subjects:
            messagebox.showerror("No subjects", "Add subjects to this class first.", parent=panel)
            return
        subject = ask_choice(panel, "Transfer subject", [(s, s) for s in subjects],
                             label="Subject to transfer", initial=subjects[0])
        if not subject:
            return
        dest = ask_class_choice(panel, db, "Transfer subject", exclude=row.get("id"))
        if not dest:
            return
        dest_class = class_by_id(db, dest)
        if any(s.lower() == subject.lower() for s in merge_subjects((dest_class or {}).get("subjects"))):
            messagebox.showerror("Already offered", f"{db.class_name(dest)} already studies {subject}.", parent=panel)
            return
        periods = [p for p in db.select("schedule_items")
                   if p.get("class_id") == row.get("id") and p.get("subject") == subject]
        taken = {period_key(p) for p in db.select("schedule_items") if p.get("class_id") == dest}
        clash = next((p for p in periods if period_key(p) in taken), None)
        if clash:
            messagebox.showerror("Slot conflict",
                                 f"{db.class_name(dest)} already has "
                                 f"{'period ' + str(clash.get('period_no')) if clash.get('period_no') is not None else clash.get('time')}.",
                                 parent=panel)
            return
        db.update("classes", row.get("id"), {
            "subjects": [s for s in subjects if s.lower() != subject.lower()],
        })
        db.update("classes", dest, {
            "subjects": merge_subjects((dest_class or {}).get("subjects"), [subject]),
        })
        for period in periods:
            db.update("schedule_items", period.get("id"), {"class_id": dest})
        panel.refresh()
        messagebox.showinfo("Transferred", f"{subject} moved to {db.class_name(dest)}.", parent=panel)

    panel = CrudPanel(parent, db, "Classes & Subjects", "classes", cols, fields,
                      title_field="grade", transform=transform,
                      actions=[("Transfer class", transfer_class), ("Transfer subject", transfer_subject)])

    original_open = panel._open_form

    def patched_open(row=None):
        if row is not None:
            row = dict(row)
            row["subjects_text"] = ", ".join(row.get("subjects", []) if isinstance(row.get("subjects"), list) else [])
        original_open(row)

    panel._open_form = patched_open

    def guarded_delete():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a row first.", parent=panel)
            return
        students = [s for s in db.students() if s.get("class_id") == row.get("id")]
        periods = [p for p in db.select("schedule_items") if p.get("class_id") == row.get("id")]
        if students or periods:
            messagebox.showerror("Cannot delete",
                                 f"{class_label(row)} still has {len(students)} student(s) and "
                                 f"{len(periods)} timetable period(s). Remove them first.")
            return
        if messagebox.askyesno("Delete", f"Delete: {class_label(row)}?"):
            db.delete("classes", row.get("id"))
            panel.refresh()

    panel.delete = guarded_delete
    return panel


def make_staff_panel(parent, db):
    cols = [
        {"key": "name", "label": "Name", "width": 200},
        {"key": "designation", "label": "Designation", "width": 180},
        {"key": "staff_category", "label": "Category", "width": 130},
        {"key": "status", "label": "Status", "width": 90},
    ]
    fields = [
        {"key": "name", "label": "Full name", "required": True},
        {"key": "designation", "label": "Designation (e.g. Math Teacher)"},
        {"key": "staff_category", "label": "Category", "type": "combo",
         "options": [("Teaching", "teaching"), ("Non-teaching", "non-teaching")]},
        {"key": "status", "label": "Status", "type": "combo",
         "options": [("Active", "active"), ("Inactive", "inactive")]},
    ]
    panel = None

    def transfer_teacher():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a teacher first.", parent=panel)
            return
        if row.get("staff_category") != "teaching":
            messagebox.showinfo("Not a teacher", "Only teaching staff have timetable assignments to transfer.", parent=panel)
            return
        periods = [p for p in db.select("schedule_items") if p.get("teacher") == row.get("name")]
        if not periods:
            messagebox.showerror("No assignment", f"{row.get('name')} has no timetable periods to transfer.", parent=panel)
            return
        dest = ask_class_choice(panel, db, "Transfer teacher", exclude=periods[0].get("class_id"))
        if not dest:
            return
        dest_class = class_by_id(db, dest)
        current_subjects = sorted({p.get("subject") for p in periods if p.get("subject")})
        dest_subjects = [s for s in (dest_class.get("subjects") or []) if s] if dest_class else []
        options = [(s, s) for s in (dest_subjects or current_subjects)]
        if not options:
            messagebox.showerror("No subject", "Add subjects to the destination class first.", parent=panel)
            return
        subject = ask_choice(panel, "Teacher subject", options, label="Assign subject",
                             initial=current_subjects[0] if current_subjects else None)
        if not subject:
            return
        moving_ids = {p.get("id") for p in periods}
        taken = {period_key(p) for p in db.select("schedule_items")
                 if p.get("class_id") == dest and p.get("id") not in moving_ids}
        clash = next((p for p in periods if period_key(p) in taken), None)
        if clash:
            messagebox.showerror("Slot conflict",
                                 f"{db.class_name(dest)} already has "
                                 f"{'period ' + str(clash.get('period_no')) if clash.get('period_no') is not None else clash.get('time')}.",
                                 parent=panel)
            return
        for period in periods:
            db.update("schedule_items", period.get("id"), {
                "class_id": dest, "teacher": row.get("name"), "subject": subject,
            })
        panel.refresh()
        messagebox.showinfo(
            "Transferred",
            f"{row.get('name')}'s {len(periods)} period(s) moved to {db.class_name(dest)} as {subject}.",
            parent=panel,
        )

    panel = CrudPanel(parent, db, "Teachers & Staff", "staff", cols, fields,
                      title_field="name", actions=[("Transfer", transfer_teacher)])

    def guarded_delete():
        row = panel.selected_row()
        if row is None:
            messagebox.showinfo("Select a row", "Please select a row first.")
            return
        periods = [p for p in db.select("schedule_items") if p.get("teacher") == row.get("name")]
        if periods:
            messagebox.showerror("Cannot delete",
                                 f"{row.get('name')} is still assigned to {len(periods)} timetable period(s). "
                                 "Reassign those periods first.")
            return
        if messagebox.askyesno("Delete", f"Delete: {row.get('name')}?"):
            db.delete("staff", row.get("id"))
            panel.refresh()

    panel.delete = guarded_delete
    return panel


def make_timetable_panel(parent, db):
    cols = [
        {"key": "day", "label": "Day", "width": 90},
        {"key": "time", "label": "Time", "width": 100},
        {"key": "subject", "label": "Subject", "width": 170},
        {"key": "teacher", "label": "Teacher", "width": 150},
        {"key": "room", "label": "Room", "width": 100},
        {"key": "class_id", "label": "Class", "width": 110,
         "render": lambda r: db.class_name(r.get("class_id")) if r.get("class_id") else "—"},
    ]
    fields = [
        {"key": "day", "label": "Day", "type": "combo",
         "options": [("Daily", "Daily"), ("Monday", "Monday"), ("Tuesday", "Tuesday"),
                     ("Wednesday", "Wednesday"), ("Thursday", "Thursday"), ("Friday", "Friday"),
                     ("Saturday", "Saturday")]},
        {"key": "time", "label": "Time (e.g. 09:00 AM)", "required": True},
        {"key": "subject", "label": "Subject", "type": "combo", "required": True,
         "options": lambda: [(s, s) for s in sorted({s for c in db.classes()
                                    for s in (c.get("subjects") or []) if s})],
        },
        {"key": "teacher", "label": "Teacher", "type": "combo",
         "options": lambda: [(m["name"], m["name"]) for m in db.staff()
                             if m.get("staff_category") == "teaching" and m.get("status") != "inactive"]},
        {"key": "room", "label": "Room"},
        {"key": "class_id", "label": "Class", "type": "combo", "options": lambda: build_class_options(db)},
        {"key": "color", "label": "Color tag"},
    ]
    return CrudPanel(parent, db, "Timetable", "schedule_items", cols, fields, title_field="subject")



# ---------------------------------------------------------------- class planner
PERIOD_DEFS = [
    (1, "P-1", "8:45 AM", "9:30 AM"),
    (2, "P-2", "9:30 AM", "10:00 AM"),
    (3, "P-3", "10:00 AM", "10:30 AM"),
    (4, "P-4", "10:30 AM", "11:00 AM"),
    (5, "P-5", "11:00 AM", "11:30 AM"),
    (6, "P-6", "12:00 PM", "12:30 PM"),
    (7, "P-7", "12:30 PM", "1:00 PM"),
    (8, "P-8", "1:00 PM", "1:30 PM"),
]
BREAK_AFTER = 5


def class_sort_key(klass):
    grade = str(klass.get("grade", ""))
    digits = "".join(ch for ch in grade if ch.isdigit())
    number = int(digits) if digits else -1
    low = grade.lower()
    if number >= 0:
        return (0, -number, low)
    if low.startswith("nursery"):
        return (1, 0, low)
    if low.startswith("ece"):
        return (1, 1, low)
    return (1, 2, low)


class ClassPlannerPanel(ttk.Frame):
    """Class x period grid, matching the printed school timetable."""

    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        head = ttk.Frame(self, padding=(12, 12, 12, 0))
        head.pack(fill="x")
        ttk.Label(head, text="Class Planner", font=("Segoe UI", 15, "bold")).pack(side="left")
        ttk.Label(head, text="  tap any cell to assign a subject and teacher",
                  foreground="#0b5cff").pack(side="left")
        ttk.Button(head, text="Refresh", command=self.render).pack(side="right")

        canvas = tk.Canvas(self, highlightthickness=0, background=COLORS["bg"])
        self.inner = ttk.Frame(canvas)
        self.inner.bind("<Configure>", lambda _e: canvas.configure(scrollregion=canvas.bbox("all")))
        self.window = canvas.create_window((0, 0), window=self.inner, anchor="nw")
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(self.window, width=e.width))
        canvas.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=8)
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        sb.pack(side="right", fill="y", padx=(0, 12), pady=8)
        canvas.configure(yscrollcommand=sb.set)

        self.status = tk.StringVar(value="")
        ttk.Label(self, textvariable=self.status, padding=(12, 0, 12, 8)).pack(anchor="w")

        self.render()

    def render(self):
        for w in self.inner.winfo_children():
            w.destroy()

        classes = sorted(self.db.classes(), key=class_sort_key)
        rows = self.db.select("schedule_items")
        cells = {
            (r.get("class_id"), r.get("period_no")): r
            for r in rows
            if r.get("class_id") is not None and r.get("period_no") is not None
        }

        if not classes:
            ttk.Label(self.inner, text="No classes yet. Add classes in Classes & Subjects first.",
                      padding=16).grid(row=0, column=0, sticky="w")
            return

        header_bg = "#0b5cff"
        tk.Label(self.inner, text="Class", bg=header_bg, fg="#ffffff", width=14, pady=6,
                 font=("Segoe UI", 9, "bold"), anchor="w").grid(row=0, column=0, padx=1, pady=1, sticky="nsew")
        column = 1
        for number, label, start, end in PERIOD_DEFS:
            frame = tk.Frame(self.inner, bg=header_bg)
            frame.grid(row=0, column=column, padx=1, pady=1, sticky="nsew")
            tk.Label(frame, text=label, bg=header_bg, fg="#ffffff",
                     font=("Segoe UI", 9, "bold")).pack(pady=(6, 0))
            tk.Label(frame, text=f"{start}-{end}", bg=header_bg, fg="#dbeafe",
                     font=("Segoe UI", 7)).pack(pady=(0, 6))
            column += 1
            if number == BREAK_AFTER:
                tk.Label(self.inner, text="BREAK\n11:30\n12:00", bg="#fde68a", fg="#92400e",
                         width=7, font=("Segoe UI", 7, "bold"), justify="center").grid(
                    row=0, column=column, padx=1, pady=1, sticky="nsew")
                column += 1

        for index, klass in enumerate(classes, start=1):
            tk.Label(self.inner, text=class_label(klass), bg="#dbe3ef", fg="#020617", width=14,
                     anchor="w", padx=8, pady=8, font=("Segoe UI", 10, "bold")).grid(
                row=index, column=0, padx=1, pady=1, sticky="nsew")
            column = 1
            for number, label, start, end in PERIOD_DEFS:
                cell = cells.get((klass.get("id"), number))
                subject = (cell or {}).get("subject", "") or ""
                teacher = (cell or {}).get("teacher", "") or ""
                text = f"{subject}\n{teacher}" if subject else "+"
                button = tk.Button(
                    self.inner, text=text, width=14, height=3, relief="flat", bd=0,
                    bg="#ffffff", fg="#0047d1" if subject else "#475569",
                    activebackground="#e0f2fe", font=("Segoe UI", 8),
                    wraplength=110, justify="center",
                    command=lambda k=klass, p=number: self.assign(k, p),
                )
                button.grid(row=index, column=column, padx=1, pady=1, sticky="nsew")
                column += 1
                if number == BREAK_AFTER:
                    tk.Label(self.inner, text="BREAK", bg="#fef3c7", fg="#b45309",
                             font=("Segoe UI", 7, "bold")).grid(row=index, column=column, padx=1, pady=1, sticky="nsew")
                    column += 1

    def assign(self, klass, period_no):
        number, label, start, end = next(p for p in PERIOD_DEFS if p[0] == period_no)
        rows = self.db.select("schedule_items")
        existing = next((r for r in rows
                         if r.get("class_id") == klass.get("id") and r.get("period_no") == period_no), None)

        win = tk.Toplevel(self.winfo_toplevel())
        win.title("Assign Period")
        win.transient(self.winfo_toplevel())
        win.grab_set()
        win.resizable(False, False)

        body = ttk.Frame(win, padding=14)
        body.pack(fill="both", expand=True)
        ttk.Label(body, text="Assign Period", font=("Segoe UI", 12, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 8))
        ttk.Label(body, text=f"Class: {class_label(klass)}").grid(row=1, column=0, columnspan=2, sticky="w")
        ttk.Label(body, text=f"Period: {label} ({start}-{end})").grid(
            row=2, column=0, columnspan=2, sticky="w", pady=(0, 10))

        subjects = []
        for value in (klass.get("subjects") or []):
            if value and value not in subjects:
                subjects.append(value)
        for row in rows:
            if row.get("class_id") == klass.get("id") and row.get("subject") and row["subject"] not in subjects:
                subjects.append(row["subject"])

        current = (existing or {}).get("subject", "") or ""
        subject_var = tk.StringVar(value=current)
        ttk.Label(body, text="Subject").grid(row=3, column=0, sticky="w", pady=(0, 2))
        ttk.Combobox(body, textvariable=subject_var, values=subjects, state="readonly",
                     width=32).grid(row=4, column=0, columnspan=2, sticky="ew", pady=(0, 10))

        teachers = []
        for member in self.db.staff():
            if member.get("staff_category") != "teaching":
                continue
            if member.get("status") == "inactive":
                continue
            name = member.get("name", "")
            if name and name not in teachers:
                teachers.append(name)
        current_teacher = (existing or {}).get("teacher", "") or ""
        if current_teacher and current_teacher not in teachers:
            teachers.append(current_teacher)
        teacher_var = tk.StringVar(value=current_teacher)
        ttk.Label(body, text="Teacher").grid(row=5, column=0, sticky="w", pady=(0, 2))
        ttk.Combobox(body, textvariable=teacher_var, values=teachers, state="readonly",
                     width=32).grid(row=6, column=0, columnspan=2, sticky="ew", pady=(0, 12))

        def save():
            payload = {
                "day": "Daily",
                "time": f"{start} – {end}",
                "subject": subject_var.get().strip(),
                "teacher": teacher_var.get().strip(),
                "room": "",
                "color": "cyan",
                "class_id": klass.get("id"),
                "period_no": period_no,
            }
            if existing:
                self.db.update("schedule_items", existing["id"], payload)
            else:
                self.db.insert("schedule_items", payload)
            win.destroy()
            self.render()
            self.status.set(f"Saved {class_label(klass)} {label}.")

        def clear():
            if existing:
                self.db.delete("schedule_items", existing["id"])
            win.destroy()
            self.render()
            self.status.set(f"Cleared {class_label(klass)} {label}.")

        buttons = ttk.Frame(body)
        buttons.grid(row=7, column=0, columnspan=2, sticky="ew")
        ttk.Button(buttons, text="Clear", command=clear).pack(side="left")
        ttk.Button(buttons, text="Cancel", command=win.destroy).pack(side="right", padx=(6, 0))
        ttk.Button(buttons, text="Save Period", command=save).pack(side="right")


# ---------------------------------------------------------------- attendance
class AttendancePanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        self.entity = tk.StringVar(value="students")
        self.date_var = tk.StringVar(value=today_str())
        self.class_var = tk.StringVar(value="")

        top = ttk.Frame(self, padding=(12, 12, 12, 0))
        top.pack(fill="x")
        ttk.Label(top, text="Attendance", font=("Segoe UI", 15, "bold")).pack(side="left")
        ttk.Button(top, text="Refresh", command=self.reload).pack(side="right")

        ctrl = ttk.Frame(self, padding=(12, 8, 12, 4))
        ctrl.pack(fill="x")
        ttk.Label(ctrl, text="Date").pack(side="left")
        ttk.Entry(ctrl, textvariable=self.date_var, width=14).pack(side="left", padx=(4, 12))
        ttk.Radiobutton(ctrl, text="Students", variable=self.entity, value="students",
                        command=self.reload).pack(side="left")
        ttk.Radiobutton(ctrl, text="Staff", variable=self.entity, value="staff",
                        command=self.reload).pack(side="left", padx=(4, 12))
        ttk.Label(ctrl, text="Class").pack(side="left")
        self.class_combo = ttk.Combobox(ctrl, textvariable=self.class_var, width=22, state="readonly")
        self.class_combo.pack(side="left", padx=4)
        self.class_combo.bind("<<ComboboxSelected>>", lambda _e: self.reload())
        ttk.Button(ctrl, text="Save marks", command=self.save).pack(side="right")
        ttk.Button(ctrl, text="Today", command=lambda: [self.date_var.set(today_str()), self.reload()]).pack(side="right", padx=4)

        # scrollable rows
        canvas = tk.Canvas(self, highlightthickness=0, background=COLORS["bg"])
        self.rows_frame = ttk.Frame(canvas)
        self.rows_frame.bind("<Configure>", lambda _e: canvas.configure(scrollregion=canvas.bbox("all")))
        self.window = canvas.create_window((0, 0), window=self.rows_frame, anchor="nw")
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(self.window, width=e.width))
        canvas.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=8)
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        sb.pack(side="right", fill="y", padx=(0, 12), pady=8)
        canvas.configure(yscrollcommand=sb.set)
        self.status = tk.StringVar(value="")
        ttk.Label(self, textvariable=self.status, padding=(12, 0, 12, 6)).pack(anchor="w")

        self.row_widgets = []
        self.reload()

    def _entity_options(self):
        if self.entity.get() == "students":
            return [(class_label(c), c) for c in self.db.classes()]
        return [("All staff", None)]

    def reload(self):
        opts = self._entity_options()
        self.class_combo.configure(values=[o[0] for o in opts])
        if not self.class_var.get() and opts:
            self.class_var.set(opts[0][0])
        for w in self.rows_frame.winfo_children():
            w.destroy()
        self.row_widgets = []

        if self.entity.get() == "students":
            selected_label = self.class_var.get()
            class_row = next((o[1] for o in opts if o[0] == selected_label), None)
            rows = self.db.students()
            if class_row:
                rows = [s for s in rows if s.get("class_id") == class_row["id"]]
        else:
            rows = [s for s in self.db.staff() if s.get("status") != "inactive"]

        header = ttk.Frame(self.rows_frame)
        header.pack(fill="x")
        for text, width in (["Name", 32], ["Roll/Desig.", 16], ["Status", 16]):
            ttk.Label(header, text=text, font=("Segoe UI", 9, "bold")).pack(side="left", padx=4)
        if not rows:
            ttk.Label(self.rows_frame, text="No records yet. Add students or staff first.",
                      padding=12).pack()
            return

        existing = {}
        for a in self.db.select("attendance"):
            if a.get("date_str") == self.date_var.get() and a.get("entity_type") == self.entity.get():
                existing[a.get("record_id")] = a.get("status")

        for row in rows:
            f = ttk.Frame(self.rows_frame, padding=2)
            f.pack(fill="x")
            ttk.Label(f, text=row.get("name", ""), width=34, anchor="w").pack(side="left", padx=4)
            secondary = row.get("roll_no") if self.entity.get() == "students" else row.get("designation", "")
            ttk.Label(f, text=str(secondary), width=16, anchor="w").pack(side="left", padx=4)
            var = tk.StringVar(value=existing.get(row.get("id"), "present"))
            cb = ttk.Combobox(f, textvariable=var, values=["present", "absent", "late", "leave"],
                              state="readonly", width=10)
            cb.pack(side="left", padx=4)
            self.row_widgets.append((row.get("id"), var))

    def save(self):
        if not self.row_widgets:
            return
        d = self.date_var.get().strip() or today_str()
        count = 0
        for record_id, var in self.row_widgets:
            self.db.upsert("attendance",
                           {"date_str": d, "entity_type": self.entity.get(),
                            "record_id": record_id, "status": var.get()},
                           on_conflict="date_str,entity_type,record_id")
            count += 1
        self.status.set(f"Saved {count} record(s) for {d}.")



# ---------------------------------------------------------------- exams & results
class ExamsPanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        head = ttk.Frame(self, padding=(12, 12, 12, 0))
        head.pack(fill="x")
        ttk.Label(head, text="Exams & Results", font=("Segoe UI", 15, "bold")).pack(side="left")
        ttk.Button(head, text="Refresh", command=self.refresh).pack(side="right")

        form = ttk.Frame(self, padding=(12, 8, 12, 4))
        form.pack(fill="x")
        self.session = tk.StringVar(value="2026-2027")
        self.term = tk.StringVar(value="Term 1")
        self.class_var = tk.StringVar(value="")
        self.student_id = tk.StringVar(value="")
        self.subject = tk.StringVar(value="")
        self.obtained = tk.StringVar(value="0")
        self.total = tk.StringVar(value="100")
        ttk.Label(form, text="Session").grid(row=0, column=0, sticky="w", padx=4)
        ttk.Entry(form, textvariable=self.session, width=12).grid(row=0, column=1, padx=4)
        ttk.Label(form, text="Term").grid(row=0, column=2, sticky="w", padx=4)
        ttk.Combobox(form, textvariable=self.term, values=["Term 1", "Term 2", "Final Term"],
                     state="readonly", width=12).grid(row=0, column=3, padx=4)
        ttk.Label(form, text="Class").grid(row=0, column=4, sticky="w", padx=4)
        self.class_combo = ttk.Combobox(form, textvariable=self.class_var, width=16, state="readonly")
        self.class_combo.grid(row=0, column=5, padx=4)
        self.class_combo.bind("<<ComboboxSelected>>", lambda _e: self._on_class_change())
        ttk.Label(form, text="Student").grid(row=1, column=0, sticky="w", padx=4, pady=(6, 0))
        self.student_combo = ttk.Combobox(form, textvariable=self.student_id, width=34, state="readonly")
        self.student_combo.grid(row=1, column=1, columnspan=5, sticky="ew", padx=4, pady=(6, 0))
        self.student_combo.bind("<<ComboboxSelected>>", lambda _e: self._on_student_change())
        ttk.Label(form, text="Subject").grid(row=2, column=0, sticky="w", padx=4, pady=(6, 0))
        self.subject_combo = ttk.Combobox(form, textvariable=self.subject, width=22, state="readonly")
        self.subject_combo.grid(row=2, column=1, columnspan=3, sticky="ew", padx=4, pady=(6, 0))
        ttk.Label(form, text="Obtained").grid(row=2, column=4, sticky="w", padx=4, pady=(6, 0))
        ttk.Entry(form, textvariable=self.obtained, width=8).grid(row=2, column=5, sticky="w", padx=4, pady=(6, 0))
        ttk.Label(form, text="Total").grid(row=2, column=6, sticky="w", padx=4, pady=(6, 0))
        ttk.Entry(form, textvariable=self.total, width=8).grid(row=2, column=7, sticky="w", padx=4, pady=(6, 0))
        ttk.Button(form, text="Add / update mark", command=self.add_mark).grid(row=2, column=8, padx=8, pady=(6, 0))
        self.msg = tk.StringVar(value="")
        ttk.Label(form, textvariable=self.msg, foreground="#16a34a").grid(row=3, column=0, columnspan=9, sticky="w", pady=(4, 0))

        table_frame = ttk.Frame(self, padding=(12, 4, 12, 4))
        table_frame.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(table_frame,
                                 columns=["student", "subject", "term", "marks", "total"],
                                 show="headings")
        for key, label, width in [("student", "Student", 180), ("subject", "Subject", 140),
                                   ("term", "Term", 90), ("marks", "Obtained", 80), ("total", "Total", 70)]:
            self.tree.heading(key, text=label)
            self.tree.column(key, width=width)
        self.tree.pack(fill="both", expand=True)
        row = ttk.Frame(self, padding=(12, 0, 12, 12))
        row.pack(fill="x")
        ttk.Button(row, text="Delete selected mark", command=self.delete_mark).pack(side="left")
        ttk.Button(row, text="Generate result card (selected student)", command=self.result_card).pack(side="left", padx=8)

        self.card = tk.Text(self, height=10, wrap="word", background="#dbe3ef", foreground="#020617",
                            font=("Consolas", 10), relief="flat")
        self.card.pack(fill="both", expand=False, padx=12, pady=(0, 12))
        self.refresh()

    def _students_for_class(self):
        rows = self.db.students()
        label = self.class_var.get()
        if label:
            klass = next((c for c in self.db.classes() if class_label(c) == label), None)
            if klass:
                rows = [s for s in rows if s.get("class_id") == klass.get("id")]
        return rows

    def _selected_student_id(self):
        label = self.student_id.get()
        for s in self.db.students():
            klass = self.db.class_name(s.get("class_id")) if hasattr(self.db, "class_name") else None
            display = s["name"]
            if klass:
                display = f"{s['name']}  ({klass})"
            if display == label or s["name"] == label:
                return s["id"]
        # fallback: strip class suffix
        name = label.split("  (")[0]
        return next((s["id"] for s in self.db.students() if s["name"] == name), None)

    def _on_class_change(self):
        students = self._students_for_class()
        opts = []
        for s in students:
            klass = self.db.class_name(s.get("class_id")) if hasattr(self.db, "class_name") else ""
            opts.append(f"{s['name']}  ({klass})" if klass else s["name"])
        self.student_combo.configure(values=opts)
        if opts:
            self.student_id.set(opts[0])
        else:
            self.student_id.set("")
        self._on_student_change()

    def _on_student_change(self):
        sid = self._selected_student_id()
        subjects = []
        if sid:
            student = next((s for s in self.db.students() if s["id"] == sid), None)
            klass = None
            if student and student.get("class_id"):
                klass = next((c for c in self.db.classes() if c["id"] == student["class_id"]), None)
            if klass:
                subjects = list(klass.get("subjects") or [])
        self.subject_combo.configure(values=subjects)
        if subjects and self.subject.get() not in subjects:
            self.subject.set(subjects[0])
        if not subjects:
            self.subject.set("")

    def refresh(self):
        classes = sorted(self.db.classes(), key=class_sort_key)
        self.class_combo.configure(values=[""] + [class_label(c) for c in classes])
        if not self.class_var.get() and classes:
            pass
        opts = self._students_for_class() if self.class_var.get() else self.db.students()
        student_opts = []
        for s in (opts if self.class_var.get() else self.db.students()):
            klass = self.db.class_name(s.get("class_id")) if hasattr(self.db, "class_name") else ""
            student_opts.append(f"{s['name']}  ({klass})" if klass else s["name"])
        self.student_combo.configure(values=student_opts)
        if student_opts and not self.student_id.get():
            self.student_id.set(student_opts[0])
        self._on_student_change()
        for i in self.tree.get_children():
            self.tree.delete(i)
        for m in self.db.select("exam_marks", "&order=created_at.desc"):
            name = self.db.student_name(m.get("student_id"))
            self.tree.insert("", "end", iid=str(m.get("id")),
                             values=[name, m.get("subject", ""), m.get("term", ""),
                                     m.get("marks_obtained", 0), m.get("total_marks", 0)])

    def _student_id(self):
        return self._selected_student_id()

    def add_mark(self):
        sid = self._student_id()
        if not sid:
            messagebox.showerror("Pick a student", "Add a student first.")
            return
        subject = self.subject.get().strip()
        if not subject:
            messagebox.showerror("Subject required", "Pick a subject for this student's class.")
            return
        try:
            obtained = float(self.obtained.get() or 0)
            total = float(self.total.get() or 100)
        except ValueError:
            messagebox.showerror("Invalid number", "Marks must be numbers.")
            return
        if total <= 0 or obtained < 0 or obtained > total:
            messagebox.showerror("Invalid marks", f"Obtained must be between 0 and {total}.")
            return
        data = {"session": self.session.get().strip(), "term": self.term.get().strip(),
                "student_id": sid, "subject": subject,
                "marks_obtained": obtained, "total_marks": total}
        existing = next((m for m in self.db.select("exam_marks")
                         if m.get("session") == data["session"] and m.get("term") == data["term"]
                         and m.get("student_id") == sid and m.get("subject") == data["subject"]), None)
        if existing:
            self.db.update("exam_marks", existing["id"], data)
        else:
            self.db.insert("exam_marks", data)
        self.msg.set(f"Saved {data['subject']} for {self.student_id.get()}")
        self.refresh()

    def delete_mark(self):
        sel = self.tree.selection()
        if not sel:
            return
        self.db.delete("exam_marks", sel[0])
        self.refresh()

    def result_card(self):
        sid = self._student_id()
        if not sid:
            messagebox.showerror("Pick a student", "Add a student first.")
            return
        session = self.session.get().strip()
        term = self.term.get().strip()
        marks = [m for m in self.db.select("exam_marks")
                 if m.get("student_id") == sid and m.get("session") == session and m.get("term") == term]
        if not marks:
            marks = [m for m in self.db.select("exam_marks")
                     if m.get("student_id") == sid and m.get("session") == session]
        name = self.db.student_name(sid)
        total_obt = sum(float(m.get("marks_obtained", 0) or 0) for m in marks)
        total_max = sum(float(m.get("total_marks", 0) or 0) for m in marks)
        pct = (total_obt / total_max * 100) if total_max else 0
        lines = [f"RESULT CARD — {name}", f"Session: {session}  Term: {term}  Generated: {datetime.now():%d %b %Y}\n",
                 f"{'Subject':<22}{'Obtained':>10}{'Total':>10}"]
        for m in marks:
            lines.append(f"{str(m.get('subject','')):<22}{float(m.get('marks_obtained',0)):>10.1f}{float(m.get('total_marks',0)):>10.1f}")
        lines.append(f"\n{'TOTAL':<22}{total_obt:>10.1f}{total_max:>10.1f}")
        lines.append(f"Percentage: {pct:.1f}%   Grade: {self._grade_for(pct)}")
        text = "\n".join(lines)
        self.card.delete("1.0", "end")
        self.card.insert("1.0", text)

    @staticmethod
    def _grade_for(pct):
        if pct >= 90: return "A+"
        if pct >= 80: return "A"
        if pct >= 70: return "B"
        if pct >= 60: return "C"
        if pct >= 50: return "D"
        return "F"


# ---------------------------------------------------------------- fees
def make_fees_panel(parent, db):
    cols = [
        {"key": "student_id", "label": "Student", "width": 180,
         "render": lambda r: db.student_name(r.get("student_id"))},
        {"key": "month_year", "label": "Month / Year", "width": 120},
        {"key": "amount_paid", "label": "Amount paid", "width": 110,
         "render": lambda r: f"Rs {float(r.get('amount_paid', 0) or 0):,.2f}"},
        {"key": "payment_date", "label": "Payment date", "width": 110,
         "render": lambda r: fmt_date(r.get("payment_date"))},
        {"key": "status", "label": "Status", "width": 80},
    ]
    fields = [
        {"key": "student_id", "label": "Student", "type": "combo", "required": True,
         "options": lambda: [(s["name"], s["id"]) for s in db.students()]},
        {"key": "month_year", "label": "Month / Year (e.g. Nov 2026)", "required": True},
        {"key": "amount_paid", "label": "Amount paid", "type": "number", "required": True},
        {"key": "payment_date", "label": "Payment date", "type": "date"},
        {"key": "status", "label": "Status", "type": "combo",
         "options": [("Paid", "paid"), ("Pending", "pending"), ("Overdue", "overdue")]},
    ]
    return CrudPanel(parent, db, "Fees & Payments", "fees", cols, fields, title_field="month_year")


# ---------------------------------------------------------------- library
class LibraryPanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        cols = [
            {"key": "title", "label": "Title", "width": 220},
            {"key": "author", "label": "Author", "width": 170},
            {"key": "isbn", "label": "ISBN", "width": 120},
            {"key": "status", "label": "Status", "width": 90},
            {"key": "issued_to", "label": "Issued to", "width": 170,
             "render": lambda r: db.student_name(r.get("issued_to")) if r.get("issued_to") else "—"},
        ]
        fields = [
            {"key": "title", "label": "Title", "required": True},
            {"key": "author", "label": "Author"},
            {"key": "isbn", "label": "ISBN"},
            {"key": "status", "label": "Status", "type": "combo",
             "options": [("Available", "available"), ("Issued", "issued")]},
            {"key": "issued_to", "label": "Issued to (book bank)", "type": "combo",
             "options": lambda: [("Available — not issued", "")] + [(s["name"], s["id"]) for s in db.students()]},
        ]
        self.panel = CrudPanel(self, db, "Library (Book Bank)", "library_books", cols, fields,
                               title_field="title", transform=lambda data, row: (data.update({"status": "issued" if data.get("issued_to") else "available"}) or data))
        self.panel.pack(fill="both", expand=True)


# ---------------------------------------------------------------- transport & hostel
def make_routes_panel(parent, db):
    cols = [
        {"key": "route_name", "label": "Route", "width": 180},
        {"key": "driver", "label": "Driver", "width": 160},
        {"key": "vehicle_no", "label": "Vehicle No", "width": 120},
        {"key": "passengers", "label": "Passengers", "width": 110,
         "render": lambda r: str(sum(1 for p in db.select("transport_passengers") if p.get("route_id") == r.get("id")))},
    ]
    fields = [
        {"key": "route_name", "label": "Route name (e.g. East City Route)", "required": True},
        {"key": "driver", "label": "Driver name"},
        {"key": "vehicle_no", "label": "Vehicle number"},
    ]
    actions = [("Assign student…", lambda: assign_passenger(parent.winfo_toplevel(), db))]
    return CrudPanel(parent, db, "Transport Routes", "transport_routes", cols, fields,
                     title_field="route_name", actions=actions)


def assign_passenger(root, db):
    win = tk.Toplevel(root)
    win.title("Assign student to route")
    win.transient(root)
    win.grab_set()
    win.resizable(False, False)
    routes = db.select("transport_routes")
    if not routes:
        messagebox.showinfo("No routes", "Add a transport route first.", parent=win)
        win.destroy()
        return
    ttk.Label(win, text="Route").grid(row=0, column=0, sticky="w", padx=12, pady=6)
    route_var = tk.StringVar(value=routes[0]["route_name"])
    ttk.Combobox(win, textvariable=route_var, values=[r["route_name"] for r in routes],
                 state="readonly", width=34).grid(row=0, column=1, padx=12, pady=6)
    ttk.Label(win, text="Student").grid(row=1, column=0, sticky="w", padx=12, pady=6)
    students = db.students()
    student_var = tk.StringVar()
    ttk.Combobox(win, textvariable=student_var, values=[s["name"] for s in students],
                 state="readonly", width=34).grid(row=1, column=1, padx=12, pady=6)

    def save():
        route = next((r for r in routes if r["route_name"] == route_var.get()), None)
        student = next((s for s in students if s["name"] == student_var.get()), None)
        if not route or not student:
            messagebox.showerror("Pick both", "Choose a route and a student.", parent=win)
            return
        db.upsert("transport_passengers", {"route_id": route["id"], "student_id": student["id"]},
                  on_conflict="route_id,student_id")
        messagebox.showinfo("Assigned", f"{student['name']} assigned to {route['route_name']}.", parent=win)
        win.destroy()

    ttk.Button(win, text="Assign", command=save).grid(row=2, column=1, sticky="e", padx=12, pady=12)


def make_hostel_panel(parent, db):
    cols = [
        {"key": "room_no", "label": "Room No", "width": 120},
        {"key": "capacity", "label": "Capacity", "width": 90},
        {"key": "occupants", "label": "Occupants", "width": 90,
         "render": lambda r: f"{sum(1 for a in db.select('hostel_assignments') if a.get('room_id') == r.get('id'))}/{r.get('capacity')}"},
    ]
    fields = [
        {"key": "room_no", "label": "Room number", "required": True},
        {"key": "capacity", "label": "Capacity", "type": "number", "required": True},
    ]
    actions = [("Assign student…", lambda: assign_room(parent.winfo_toplevel(), db))]
    return CrudPanel(parent, db, "Hostel Rooms", "hostel_rooms", cols, fields,
                     title_field="room_no", actions=actions)


def assign_room(root, db):
    win = tk.Toplevel(root)
    win.title("Assign student to room")
    win.transient(root)
    win.grab_set()
    win.resizable(False, False)
    rooms = db.select("hostel_rooms")
    if not rooms:
        messagebox.showinfo("No rooms", "Add a hostel room first.", parent=win)
        win.destroy()
        return
    ttk.Label(win, text="Room").grid(row=0, column=0, sticky="w", padx=12, pady=6)
    room_var = tk.StringVar(value=str(rooms[0]["room_no"]))
    ttk.Combobox(win, textvariable=room_var, values=[str(r["room_no"]) for r in rooms],
                 state="readonly", width=34).grid(row=0, column=1, padx=12, pady=6)
    ttk.Label(win, text="Student").grid(row=1, column=0, sticky="w", padx=12, pady=6)
    students = db.students()
    student_var = tk.StringVar()
    ttk.Combobox(win, textvariable=student_var, values=[s["name"] for s in students],
                 state="readonly", width=34).grid(row=1, column=1, padx=12, pady=6)

    def save():
        room = next((r for r in rooms if str(r["room_no"]) == room_var.get()), None)
        student = next((s for s in students if s["name"] == student_var.get()), None)
        if not room or not student:
            messagebox.showerror("Pick both", "Choose a room and a student.", parent=win)
            return
        current = [a for a in db.select("hostel_assignments") if a.get("room_id") == room["id"]]
        if len(current) >= int(room.get("capacity", 1)):
            messagebox.showerror("Room full", f"Room {room['room_no']} is at full capacity.", parent=win)
            return
        db.upsert("hostel_assignments", {"room_id": room["id"], "student_id": student["id"]},
                  on_conflict="room_id,student_id")
        messagebox.showinfo("Assigned", f"{student['name']} assigned to room {room['room_no']}.", parent=win)
        win.destroy()

    ttk.Button(win, text="Assign", command=save).grid(row=2, column=1, sticky="e", padx=12, pady=12)


# ---------------------------------------------------------------- messages & notices
def make_messages_panel(parent, db):
    cols = [
        {"key": "name", "label": "Name", "width": 160},
        {"key": "msg", "label": "Message", "width": 380},
        {"key": "time", "label": "Time", "width": 90},
        {"key": "unread", "label": "Unread", "width": 60, "anchor": "center"},
        {"key": "is_group", "label": "Group", "width": 60, "render": lambda r: "Yes" if r.get("is_group") else "No"},
    ]
    fields = [
        {"key": "name", "label": "Name", "required": True},
        {"key": "msg", "label": "Message", "type": "memo"},
        {"key": "time", "label": "Time label (e.g. 10:24 AM)"},
        {"key": "unread", "label": "Unread count", "type": "number"},
        {"key": "is_group", "label": "Group?", "type": "combo", "options": [("No", False), ("Yes", True)]},
    ]

    def mark_all_read():
        for m in db.select("messages"):
            db.update("messages", m["id"], {"unread": 0})
        panel.refresh()

    panel = CrudPanel(parent, db, "Messages", "messages", cols, fields,
                      title_field="name", actions=[("Mark all read", mark_all_read)])
    return panel


def make_notices_panel(parent, db):
    cols = [
        {"key": "type", "label": "Type", "width": 90},
        {"key": "title", "label": "Title", "width": 300},
        {"key": "time", "label": "When", "width": 160},
        {"key": "accent", "label": "Color", "width": 70},
    ]
    fields = [
        {"key": "type", "label": "Type", "type": "combo",
         "options": [("Exam", "Exam"), ("Notice", "Notice"), ("Alert", "Alert"),
                     ("Event", "Event"), ("Meeting", "Meeting")]},
        {"key": "title", "label": "Title", "required": True},
        {"key": "time", "label": "When (e.g. Tomorrow, 09:00 AM)"},
        {"key": "accent", "label": "Accent color", "type": "combo",
         "options": [("Cyan", "cyan"), ("Purple", "purple"), ("Amber", "amber"),
                     ("Rose", "rose"), ("Emerald", "emerald")]},
        {"key": "icon", "label": "Icon (lucide name)"},
    ]
    return CrudPanel(parent, db, "Notices & Events", "events", cols, fields, title_field="title")


def make_phone_panel(parent, db):
    frame = ttk.Frame(parent)
    if PhoneDialer is None:
        ttk.Label(frame, text="phone_dialer.py not found.", padding=12).pack(anchor="w")
        return frame
    contacts = []
    for s in db.students():
        number = s.get("parent_contact")
        if number:
            contacts.append({"name": f"{s.get('name','Student')} (parent)", "number": str(number)})
    for s in db.staff():
        # staff table has no phone field; skip unless a contact number is stored
        number = s.get("phone") or s.get("contact") or s.get("mobile")
        if number:
            contacts.append({"name": s.get("name", "Staff"), "number": str(number)})
    dialer = PhoneDialer(frame, contacts=contacts)
    frame._dialer = dialer
    return frame



# ---------------------------------------------------------------- settings / profile
class SchoolInfoPanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        ttk.Label(self, text="School Settings", font=("Segoe UI", 15, "bold"), padding=12).pack(anchor="w")
        self.name = tk.StringVar()
        self.status = tk.StringVar()
        form = ttk.Frame(self, padding=12)
        form.pack(anchor="w")
        rows = [("School name", self.name, 40), ("School status", self.status, 20)]
        for i, (label, var, width) in enumerate(rows):
            ttk.Label(form, text=label).grid(row=i, column=0, sticky="w", pady=6, padx=4)
            ttk.Entry(form, textvariable=var, width=width).grid(row=i, column=1, pady=6, padx=4)
        ttk.Button(form, text="Save school info", command=self.save).grid(row=len(rows), column=1, sticky="e", pady=10)
        self.msg = tk.StringVar(value="")
        ttk.Label(self, textvariable=self.msg, foreground="#16a34a", padding=(12, 0)).pack(anchor="w")
        self.load()

    def load(self):
        rows = self.db.select("settings")
        row = rows[0] if rows else {}
        self.name.set(row.get("school_name") or "")
        self.status.set(row.get("status") or "active")

    def save(self):
        row = {"school_name": self.name.get().strip() or None,
               "status": self.status.get().strip() or "active",
               "updated_at": now()}
        rows = self.db.select("settings")
        if rows:
            target = rows[0].get("user_id") or rows[0].get("id") or self.db.owner_id
            self.db.update("settings", target, row, id_field="user_id")
        else:
            row["user_id"] = self.db.owner_id
            self.db.insert("settings", row)
        self.msg.set("Saved.")
        self.load()


class ProfilePanel(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        ttk.Label(self, text="Principal Profile", font=("Segoe UI", 15, "bold"), padding=12).pack(anchor="w")
        self.name = tk.StringVar()
        self.role = tk.StringVar()
        self.avatar = tk.StringVar()
        form = ttk.Frame(self, padding=12)
        form.pack(anchor="w")
        rows = [("Full name", self.name, 45), ("Role / title", self.role, 45),
                ("Avatar URL", self.avatar, 45)]
        for i, (label, var, width) in enumerate(rows):
            ttk.Label(form, text=label).grid(row=i, column=0, sticky="w", pady=6, padx=4)
            ttk.Entry(form, textvariable=var, width=width).grid(row=i, column=1, pady=6, padx=4)
        ttk.Button(form, text="Save profile", command=self.save).grid(row=len(rows), column=1, sticky="e", pady=10)
        self.msg = tk.StringVar(value="")
        ttk.Label(self, textvariable=self.msg, foreground="#16a34a", padding=(12, 0)).pack(anchor="w")
        self.load()

    def load(self):
        rows = self.db.select("profiles")
        row = rows[0] if rows else {}
        self.name.set(row.get("full_name") or "")
        self.role.set(row.get("role_title") or "")
        self.avatar.set(row.get("avatar_url") or "")

    def save(self):
        row = {"full_name": self.name.get().strip() or None,
               "role_title": self.role.get().strip() or None,
               "avatar_url": self.avatar.get().strip() or None,
               "updated_at": now()}
        rows = self.db.select("profiles")
        if rows:
            self.db.update("profiles", rows[0]["id"], row)
        else:
            row["id"] = self.db.owner_id
            self.db.insert("profiles", row)
        self.msg.set("Saved.")
        self.load()


def now():
    return datetime.now().isoformat(timespec="seconds")


# ---------------------------------------------------------------- auth dialog
class AuthDialog(tk.Toplevel):
    """Small modal sign-in / sign-up window shown before the main system."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("School Management System - Sign in")
        self.geometry("430x520")
        self.resizable(False, False)
        self.configure(bg=COLORS["bg"])
        self.transient(parent)
        self.deiconify()
        self.grab_set()
        self.lift()
        self.focus_force()
        self.result = None
        self.mode = "login"

        card = tk.Frame(self, bg=COLORS["card"], padx=24, pady=24,
                        highlightthickness=1, highlightbackground="#0b5cff")
        card.pack(fill="both", expand=True, padx=18, pady=18)

        self.icon = tk.Label(card, text="🏫", font=("Segoe UI", 30), bg=COLORS["card"], fg=COLORS["accent"])
        self.icon.pack()
        self.heading = tk.Label(card, text="Sign in to your school", font=("Segoe UI", 17, "bold"),
                                bg=COLORS["card"], fg=COLORS["text"])
        self.heading.pack(pady=(8, 2))
        self.sub = tk.Label(card, text="Each account has its own students, staff and records.",
                            font=("Segoe UI", 9), bg=COLORS["card"], fg="#0b5cff")
        self.sub.pack(pady=(0, 18))

        self.name_var = tk.StringVar()
        self.email_var = tk.StringVar()
        self.pass_var = tk.StringVar()
        self.error_var = tk.StringVar()

        self.name_row = tk.Frame(card, bg=COLORS["card"])
        tk.Label(self.name_row, text="Principal name", bg=COLORS["card"], fg="#475569",
                 font=("Segoe UI", 9, "bold")).pack(anchor="w")
        tk.Entry(self.name_row, textvariable=self.name_var, font=("Segoe UI", 11),
                 bg="#eef2f8", fg="#020617", insertbackground="#0b5cff", relief="flat").pack(fill="x", pady=(4, 10), ipady=7)

        for label, var, show in (("Email", self.email_var, None), ("Password", self.pass_var, "*")):
            row = tk.Frame(card, bg=COLORS["card"])
            tk.Label(row, text=label, bg=COLORS["card"], fg="#0b5cff",
                     font=("Segoe UI", 9, "bold")).pack(anchor="w")
            entry = tk.Entry(row, textvariable=var, show=show or "", font=("Segoe UI", 11),
                             bg="#eef2f8", fg="#020617", insertbackground="#0b5cff", relief="flat")
            entry.pack(fill="x", pady=(4, 10), ipady=7)
            if label == "Password":
                self.pass_entry = entry
            row.pack(fill="x")

        self.error_lbl = tk.Label(card, textvariable=self.error_var, bg=COLORS["card"],
                                  fg="#dc2626", font=("Segoe UI", 9), wraplength=350, justify="left")
        self.error_lbl.pack(fill="x", pady=(2, 6))

        self.submit = tk.Button(card, text="Sign in", command=self.do_submit,
                                bg=COLORS["accent"], fg="#ffffff", font=("Segoe UI", 10, "bold"),
                                relief="flat", cursor="hand2")
        self.submit.pack(fill="x", ipady=8)

        self.switch = tk.Button(card, text="New here? Create a school account", command=self.toggle,
                                bg=COLORS["card"], fg=COLORS["accent"], font=("Segoe UI", 9),
                                relief="flat", cursor="hand2")
        self.switch.pack(pady=(8, 0))


    def toggle(self):
        self.error_var.set("")
        self.mode = "signup" if self.mode == "login" else "login"
        if self.mode == "signup":
            self.name_row.pack(fill="x", before=self.error_lbl)
            self.heading.configure(text="Create school account")
            self.sub.configure(text="Your students, staff and records stay in your own account.")
            self.submit.configure(text="Sign up")
            self.switch.configure(text="Already registered? Sign in")
        else:
            self.name_row.pack_forget()
            self.heading.configure(text="Sign in to your school")
            self.sub.configure(text="Each account has its own students, staff and records.")
            self.submit.configure(text="Sign in")
            self.switch.configure(text="New here? Create a school account")

    def do_submit(self):
        email = self.email_var.get().strip()
        password = self.pass_var.get()
        if not email or not password:
            self.error_var.set("Email and password are required.")
            return
        if len(password) < 6:
            self.error_var.set("Password must be at least 6 characters.")
            return
        self.submit.configure(state="disabled", text="Please wait…")
        self.update_idletasks()
        try:
            if self.mode == "signup":
                session = sign_up(email, password, self.name_var.get())
            else:
                session = sign_in(email, password)
            self.result = session
            self.destroy()
        except SupabaseError as e:
            self.error_var.set(str(e))
            self.submit.configure(state="normal", text="Sign up" if self.mode == "signup" else "Sign in")
        except Exception as e:
            self.error_var.set(str(e))
            self.submit.configure(state="normal", text="Sign up" if self.mode == "signup" else "Sign in")


# ---------------------------------------------------------------- admin panel
class AdminPanel(tk.Frame):
    """Lists every school account; admin can open, reset or delete them."""

    def __init__(self, parent, db, app):
        super().__init__(parent, bg=COLORS["bg"])
        self.db = db
        self.app = app
        self.users = []

        head = tk.Frame(self, bg=COLORS["bg"])
        head.pack(fill="x", padx=20, pady=(18, 8))
        tk.Label(head, text="Admin Console", font=("Segoe UI", 20, "bold"),
                 bg=COLORS["bg"], fg=COLORS["text"]).pack(anchor="w")
        tk.Label(head,
                 text="Schools sign up themselves. You can open, reset or delete any account.",
                 font=("Segoe UI", 10), bg=COLORS["bg"], fg="#0b5cff").pack(anchor="w", pady=(3, 0))
        self.note = tk.Label(head, text="", font=("Segoe UI", 8), bg=COLORS["bg"], fg="#0b5cff",
                             wraplength=900, justify="left")
        self.note.pack(anchor="w", pady=(4, 0))

        table_frame = tk.Frame(self, bg=COLORS["card"], padx=10, pady=10,
                               highlightthickness=1, highlightbackground="#eef2f8")
        table_frame.pack(fill="both", expand=True, padx=20, pady=8)

        cols = ("school", "email", "principal", "students")
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings", height=15)
        for c, label, width in (("school", "School", 280), ("email", "Login email", 300),
                                ("principal", "Principal", 220), ("students", "Students", 90)):
            self.tree.heading(c, text=label)
            self.tree.column(c, width=width, anchor="w")
        self.tree.pack(side="left", fill="both", expand=True)
        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        scroll.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.bind("<Double-1>", lambda _e: self.open_selected())

        btns = tk.Frame(self, bg=COLORS["bg"])
        btns.pack(fill="x", padx=20, pady=(0, 18))
        ttk.Button(btns, text="Refresh", command=self.load).pack(side="left", padx=(0, 8))
        ttk.Button(btns, text="Open selected", command=self.open_selected).pack(side="left", padx=(0, 8))
        ttk.Button(btns, text="Reset password", command=self.reset_selected).pack(side="left", padx=(0, 8))
        ttk.Button(btns, text="Delete account", command=self.delete_selected).pack(side="left")
        if getattr(self.app, "viewing_name", None):
            ttk.Button(btns, text="Back to admin", command=self.app.exit_school_view).pack(side="right")
        self.load()

    def load(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        rows = self.db.admin_users()
        if rows:
            self.note.configure(text="")
            self.users = rows
        else:
            self.note.configure(text=(
                "Account controls are not installed. Run supabase/admin-controls.sql "
                "in the Supabase SQL Editor, then refresh. Read-only view shown below."
            ))
            profiles = self.db.select_unfiltered("profiles", "&role=eq.school&order=full_name.asc")
            settings = self.db.select_unfiltered("settings")
            students = self.db.select_unfiltered("students")
            names = {s.get("user_id"): s.get("school_name") for s in settings}
            counts = {}
            for s in students:
                counts[s.get("user_id")] = counts.get(s.get("user_id"), 0) + 1
            rows = []
            for p in profiles:
                uid = p.get("id")
                rows.append({
                    "id": uid,
                    "email": "",
                    "full_name": p.get("full_name") or "Principal",
                    "school_name": names.get(uid) or p.get("full_name") or "Unnamed school",
                    "students": counts.get(uid, 0),
                })
            self.users = rows
        for row in self.users:
            self.tree.insert("", "end", iid=str(row.get("id")), values=(
                row.get("school_name") or row.get("full_name") or "Unnamed school",
                row.get("email") or "—",
                row.get("full_name") or "Principal",
                row.get("students", 0),
            ))

    def selected_user(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showinfo("Admin", "Select a school first.", parent=self)
            return None
        uid = str(selected[0])
        return next((u for u in self.users if str(u.get("id")) == uid), None)

    def open_selected(self):
        row = self.selected_user()
        if not row:
            return
        name = row.get("school_name") or row.get("full_name") or "Unnamed school"
        self.app.view_school(str(row.get("id")), name)

    def reset_selected(self):
        row = self.selected_user()
        if not row:
            return
        email = row.get("email")
        if not email:
            messagebox.showerror("Admin", "Install the latest schema SQL to see login emails.", parent=self)
            return
        if not messagebox.askyesno("Reset password", f"Send a password reset link to {email}?", parent=self):
            return
        try:
            send_password_reset(email)
            messagebox.showinfo("Sent", f"Reset link sent to {email}.", parent=self)
        except SupabaseError as e:
            messagebox.showerror("Could not send", str(e), parent=self)

    def delete_selected(self):
        row = self.selected_user()
        if not row:
            return
        name = row.get("school_name") or row.get("full_name") or "this account"
        if not messagebox.askyesno(
            "Delete account",
            f"Delete {name} and every record owned by it? This cannot be undone.",
            parent=self,
        ):
            return
        ok, error = self.db.admin_delete_user(str(row.get("id")))
        if ok:
            messagebox.showinfo("Deleted", f"{name} was deleted.", parent=self)
            self.load()
        else:
            messagebox.showerror("Could not delete", error or "Admin control is not installed.", parent=self)


# ---------------------------------------------------------------- main window
class App:
    def __init__(self, db=None, root=None):
        self.db = db or SchoolDB()
        self.root = root or tk.Tk()
        self.want_signout = False
        self.root.title(f"{APP_NAME} v{APP_VERSION}")
        self.root.geometry("1380x860")
        self.root.minsize(1100, 700)
        self.root.configure(background=COLORS["bg"])

        try:
            ttk.Style().theme_use("clam")
        except Exception:
            pass
        style = ttk.Style()
        style.configure("TButton", font=("Segoe UI", 10), padding=(10, 4))
        style.configure("Sidebar.TButton", background=COLORS["sidebar"], foreground="#020617",
                        borderwidth=0, focusthickness=0, anchor="w", padding=(16, 10),
                        font=("Segoe UI", 10))
        style.map("Sidebar.TButton",
                  background=[("active", COLORS["sidebar_hi"]), ("pressed", COLORS["accent"])],
                  foreground=[("active", "#0b5cff"), ("pressed", "#ffffff")])
        style.configure("Logout.TButton", background="#dc2626", foreground="#ffffff",
                        borderwidth=0, focusthickness=0, anchor="w", padding=(16, 12),
                        font=("Segoe UI", 10, "bold"))
        style.map("Logout.TButton",
                  background=[("active", "#b91c1c"), ("pressed", "#991b1b")],
                  foreground=[("active", "#ffffff")])
        style.configure("Treeview", rowheight=26, font=("Segoe UI", 9))
        style.configure("Treeview.Heading", font=("Segoe UI", 9, "bold"))

        self._build_sidebar()
        self._build_statusbar()
        self.content = tk.Frame(self.root, background=COLORS["bg"])
        self.content.place(x=230, y=0, relwidth=1.0, relheight=1.0)
        self.content.place_configure(width=1380 - 230, height=860 - 34)
        self.panels = {}
        self.show("dashboard")
        self._tick_status()
        self.root.mainloop()

    # ---------- layout ----------
    def _build_sidebar(self):
        bar = tk.Frame(self.root, background=COLORS["sidebar"], width=230)
        bar.pack(side="left", fill="y")
        bar.pack_propagate(False)
        tk.Label(bar, text="SCHOOL\nMANAGEMENT", bg=COLORS["sidebar"], fg=COLORS["accent"],
                 font=("Segoe UI", 15, "bold"), justify="left").pack(fill="x", padx=18, pady=(18, 4))
        tk.Label(bar, text="SYSTEM", bg=COLORS["sidebar"], fg="#0b5cff",
                 font=("Segoe UI", 9, "bold")).pack(fill="x", padx=18, pady=(0, 12))
        self.nav_items = [
            ("dashboard", "🏠  Dashboard & Reports"),
            ("students", "🎓  Students & Parents"),
            ("classes", "🏫  Classes & Subjects"),
            ("staff", "🧑‍🏫  Teachers & Staff"),
            ("timetable", "🗓  Timetable"),
            ("planner", "🗂  Class Planner"),
            ("attendance", "âœ…  Attendance"),
            ("exams", "📝  Exams & Results"),
            ("fees", "💳  Fees & Payments"),
            ("library", "📚  Library (Book Bank)"),
            ("transport", "🚌  Transport"),
            ("hostel", "🛏  Hostel"),
            ("messages", "💬  Messages"),
            ("notices", "📢  Notices & Events"),
            ("phone", "📞  Phone Dialer"),
            ("settings", "🏫  School Settings"),
            ("profile", "👤  Principal Profile"),
        ]
        if self.db.role == "admin":
            self.nav_items.insert(0, ("schools", "🛡️  Schools (Admin)"))
        for key, label in self.nav_items:
            btn = ttk.Button(bar, text=label, style="Sidebar.TButton",
                             command=lambda k=key: self.show(k))
            btn.pack(fill="x", padx=10, pady=1)
        tk.Frame(bar, bg=COLORS["sidebar"], height=20).pack()
        ttk.Button(bar, text="↪  LOGOUT / Switch account", style="Logout.TButton",
                   command=self.sign_out).pack(fill="x", padx=10, pady=4)
        tk.Label(bar, text="Signed in as " + (self.db.email or "school account"),
                 bg=COLORS["sidebar"], fg="#0b5cff",
                 font=("Segoe UI", 8), wraplength=200).pack(fill="x", padx=18, pady=(8, 0))
        tk.Label(bar, text="School Dashboard v" + APP_VERSION, bg=COLORS["sidebar"],
                 fg="#475569", font=("Segoe UI", 8)).pack(side="bottom", pady=10)

    def _build_statusbar(self):
        self.status = tk.Label(self.root, text="", background="#eef2f8", foreground="#0b5cff",
                               anchor="w", padx=12, font=("Segoe UI", 9))
        self.status.pack(side="bottom", fill="x")

    def _tick_status(self):
        state = "● Online — synced with Supabase" if not self.db.offline else "○ Offline — changes saved on this PC"
        who = f"   |   Admin view: {self.viewing_name}" if getattr(self, "viewing_name", None) else ""
        self.status.configure(text=state + who + "   |   Tip: double-click a row to edit")
        self.root.after(2000, self._tick_status)

    def sign_out(self):
        self.want_signout = True
        self.root.destroy()

    def view_school(self, user_id, name):
        self.db.set_viewing(user_id)
        self.viewing_name = name
        self.panels = {}
        self.show("dashboard")

    def exit_school_view(self):
        self.db.exit_viewing()
        self.viewing_name = None
        self.panels = {}
        self.show("schools")

    # ---------- panel switching ----------
    def build_panel(self, key):
        db = self.db
        if key == "schools":
            return AdminPanel(self.content, db, self)
        if key == "dashboard":
            return DashboardPanel(self.content, db)
        if key == "students":
            return make_students_panel(self.content, db)
        if key == "classes":
            return make_classes_panel(self.content, db)
        if key == "staff":
            return make_staff_panel(self.content, db)
        if key == "timetable":
            return make_timetable_panel(self.content, db)
        if key == "planner":
            return ClassPlannerPanel(self.content, db)
        if key == "attendance":
            return AttendancePanel(self.content, db)
        if key == "exams":
            return ExamsPanel(self.content, db)
        if key == "fees":
            return make_fees_panel(self.content, db)
        if key == "library":
            return LibraryPanel(self.content, db)
        if key == "transport":
            return make_routes_panel(self.content, db)
        if key == "hostel":
            return make_hostel_panel(self.content, db)
        if key == "messages":
            return make_messages_panel(self.content, db)
        if key == "notices":
            return make_notices_panel(self.content, db)
        if key == "phone":
            return make_phone_panel(self.content, db)
        if key == "settings":
            return SchoolInfoPanel(self.content, db)
        if key == "profile":
            return ProfilePanel(self.content, db)
        return ttk.Frame(self.content)

    def show(self, key):
        if key in self.panels:
            for w in self.panels[key].winfo_children():
                w.destroy()
            self.panels[key].destroy()
        panel = self.build_panel(key)
        panel.pack(fill="both", expand=True)
        self.panels[key] = panel


def main():
    while True:
        session = load_session()
        if not session:
            root = tk.Tk()
            root.withdraw()
            dialog = AuthDialog(root)
            root.wait_window(dialog)
            if not dialog.result:
                root.destroy()
                return
            session = dialog.result
            root.destroy()

        role = fetch_role(session)
        session["role"] = role
        save_session(session)

        db = SchoolDB(session)
        app = App(db)
        app.root.mainloop()
        if getattr(app, "want_signout", False):
            clear_session()
            continue
        return


if __name__ == "__main__":
    main()


