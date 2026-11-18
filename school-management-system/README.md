# School Management System â€” Desktop Edition

A fully functional school management system written in pure Python (Tkinter + the standard
library â€” no pip installs required). It uses the **same Supabase database as the
School Dashboard Android APK**, so data entered here also appears on the phone and vice-versa.

Works offline too: if Supabase is unreachable, changes are stored in `school_local.json`
on this PC.

## Run

Double-click **`run.bat`**, or:

```powershell
python school_system.py
```

Requires Python 3.9+ with Tkinter (included with the standard Windows installer).

## Modules

| Module | What it does |
|---|---|
| Dashboard & Reports | Live stats (students, staff, classes, books issued, unread messages, fees collected) |
| Students & Parents | Name, class, roll no., parent details, admission date, attendance, status |
| Classes & Subjects | Grade + section + comma-separated subject list |
| Teachers & Staff | Name, designation, teaching / non-teaching, status |
| Timetable | Day, time, subject, teacher, room, class, colour tag |
| Attendance | Mark present / absent / late / leave per date, students or staff |
| Exams & Results | Session, term, per-subject marks; generates a printable result card |
| Fees & Payments | Record monthly payments per student, see history |
| Library (Book Bank) | Books with ISBN; issue to students / return |
| Transport | Routes + assign students to routes |
| Hostel | Rooms with capacity + assign students (with capacity check) |
| Messages | Chat/thread records with unread counts |
| Notices & Events | Exams, notices, alerts, events, meetings |
| School Settings | School name, status, total teachers, pending fees |
| Principal Profile | Name, role title, avatar URL |

Double-click any row to edit it.

## Data model

All data lives in your Supabase project (`yecmhcwgnivgxjihrhsa`) in these tables:
`classes`, `students` (extended), `staff`, `attendance`, `schedule_items`, `exam_marks`,
`fees`, `library_books`, `transport_routes`, `transport_passengers`, `hostel_rooms`,
`hostel_assignments`, `messages`, `events`, `profiles`, `settings`.

Schema: `../supabase/schema-noauth.sql` + `schema-modules.sql`.

The same tables power the Android app â€” that is the "shared database" both apps use.

