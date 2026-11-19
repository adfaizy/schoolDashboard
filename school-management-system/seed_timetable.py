"""
Seed the Class Planner timetable (the one from the timetable picture).

Run once from this folder:
    python seed_timetable.py

It is safe to re-run: existing classes, teachers and timetable cells are not duplicated.
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from school_db import SchoolDB

# Fixed bell times, exactly as printed on the timetable.
PERIODS = [
    (1, "P-1", "8:45 AM", "9:30 AM"),
    (2, "P-2", "9:30 AM", "10:00 AM"),
    (3, "P-3", "10:00 AM", "10:30 AM"),
    (4, "P-4", "10:30 AM", "11:00 AM"),
    (5, "P-5", "11:00 AM", "11:30 AM"),
    (6, "P-6", "12:00 PM", "12:30 PM"),
    (7, "P-7", "12:30 PM", "1:00 PM"),
    (8, "P-8", "1:00 PM", "1:30 PM"),
]

# Class order as shown in the picture (top to bottom).
CLASS_ORDER = [
    "Class 8", "Class 7", "Class 6", "Class 5", "Class 4",
    "Class 3", "Class 2", "Class 1", "Nursery", "ECE",
]

# 8 periods per class: (subject, teacher). None = free period ("+").
TIMETABLE = {
    "Class 8": [
        ("MATH", "Sahirsh Kanwal"),
        ("ISLAMIAT", "Sahirsh Kanwal"),
        ("HIST & GEOG", "Sahirsh Kanwal"),
        ("URDU", "Sahirsh Kanwal"),
        ("ENGLISH", "Madiha Naz"),
        ("SCIENCE", "Sahirsh Kanwal"),
        ("COMPUTER", "Sahirsh Kanwal"),
        ("T.Q", "Muniba Tufail"),
    ],
    "Class 7": [
        ("T.Q", "Muniba Tufail"),
        ("ISLAMIAT", "Muniba Tufail"),
        ("HIST & GEOG", "Sahirsh Kanwal"),
        ("SCIENCE", "Madiha Naz"),
        ("MATH", "Sahirsh Kanwal"),
        ("ENGLISH", "Madiha Naz"),
        ("COMPUTER", "Sahirsh Kanwal"),
        ("URDU", "Madiha Naz"),
    ],
    "Class 6": [
        ("ENGLISH", "Madiha Naz"),
        ("ISLAMIAT", "Madiha Naz"),
        ("URDU", "Madiha Naz"),
        ("SCIENCE", "Madiha Naz"),
        ("T.Q", "Muniba Tufail"),
        ("MATH", "Anna"),
        ("HIST & GEOG", "Madiha Naz"),
        ("COMPUTER", "Sahirsh Kanwal"),
    ],
    "Class 5": [
        ("NAZRA QURAN", "Misba"),
        ("MATH", "Misba"),
        ("SCIENCE", "Misba"),
        ("URDU", "Misba"),
        ("ENGLISH", "Anna"),
        ("ISLAMIAT", "Misba"),
        ("SOCIAL STUDIES", "Misba"),
        ("GAMES", "Misba"),
    ],
    "Class 4": [
        ("ENGLISH", "Anna"),
        ("MATH", "Anna"),
        ("SCIENCE", "Anna"),
        ("URDU", "Anna"),
        ("ISLAMIAT", "Misba"),
        ("GAMES", "Muneeba Aslam"),
        ("NAZRA QURAN", "Anna"),
        ("SOCIAL STUDIES", "Anna"),
    ],
    "Class 3": [
        ("NAZRA QURAN", "Asbaha Aslam"),
        ("MATH", "Asbaha Aslam"),
        ("ENGLISH", "Asbaha Aslam"),
        ("URDU", "Asbaha Aslam"),
        ("ISLAMIAT", "Asbaha Aslam"),
        ("GAMES", "Asbaha Aslam"),
        ("DRAWING", "Asbaha Aslam"),
        ("G.KN", "Asbaha Aslam"),
    ],
    "Class 2": [
        ("G.KN", "Muneeba Aslam"),
        ("MATH", "Muneeba Aslam"),
        ("ENGLISH", "Muneeba Aslam"),
        ("URDU", "Muneeba Aslam"),
        ("ISLAMIAT", "Muneeba Aslam"),
        ("GAMES", "Muneeba Aslam"),
        ("NAZRA QURAN", "Muneeba Aslam"),
        ("DRAWING", "Muneeba Aslam"),
    ],
    "Class 1": [
        ("G.KN", "Sarwat Jabin"),
        ("MATH", "Sarwat Jabin"),
        ("ENGLISH", "Sarwat Jabin"),
        ("URDU", "Sarwat Jabin"),
        ("ISLAMIAT", "Sarwat Jabin"),
        ("GAMES", "Sarwat Jabin"),
        ("NAZRA QURAN", "Sarwat Jabin"),
        ("DRAWING", "Sarwat Jabin"),
    ],
    "Nursery": [
        ("G.KN", "Kiran"),
        ("MATH", "Kiran"),
        ("ENGLISH", "Kiran"),
        ("URDU", "Kiran"),
        ("DRAWING", "Kiran"),
        None,
        None,
        None,
    ],
    "ECE": [
        ("G.KN", "Kiran"),
        ("MATH", "Kiran"),
        ("ENGLISH", "Kiran"),
        ("URDU", "Kiran"),
        ("DRAWING", "Kiran"),
        None,
        None,
        None,
    ],
}

DAY = "Daily"


def main():
    db = SchoolDB()

    classes = {c.get("grade"): c for c in db.classes()}
    staff = {s.get("name"): s for s in db.staff()}
    schedule = db.select("schedule_items")

    created_classes = 0
    for name in CLASS_ORDER:
        if name not in classes:
            row = db.insert("classes", {"grade": name, "section": "", "subjects": []})
            classes[name] = row
            created_classes += 1
            print(f"class created: {name}")

    created_staff = 0
    teachers = sorted({teacher for cells in TIMETABLE.values() for cell in cells if cell for teacher in [cell[1]]})
    for name in teachers:
        if name not in staff:
            row = db.insert("staff", {
                "name": name,
                "designation": "Teacher",
                "staff_category": "teaching",
                "status": "active",
            })
            staff[name] = row
            created_staff += 1
            print(f"teacher created: {name}")

    existing = {
        (row.get("class_id"), row.get("period_no"))
        for row in schedule
        if row.get("class_id") is not None and row.get("period_no") is not None
    }

    created_cells = 0
    for class_name in CLASS_ORDER:
        class_id = classes[class_name]["id"]
        for index, cell in enumerate(TIMETABLE[class_name], start=1):
            key = (class_id, index)
            if key in existing:
                continue
            if cell is None:
                # Free period: store an empty cell so the "+" can be assigned later.
                subject, teacher = "", ""
            else:
                subject, teacher = cell
            _, _, start, end = PERIODS[index - 1]
            db.insert("schedule_items", {
                "day": DAY,
                "time": f"{start} – {end}",
                "subject": subject,
                "teacher": teacher,
                "room": "",
                "color": "cyan",
                "class_id": class_id,
                "period_no": index,
            })
            created_cells += 1

    # Keep the subject list on each class in sync with its timetable.
    for class_name in CLASS_ORDER:
        subjects = []
        for cell in TIMETABLE[class_name]:
            if cell and cell[0] not in subjects:
                subjects.append(cell[0])
        row = classes[class_name]
        current = row.get("subjects") or []
        if sorted(current) != sorted(subjects):
            db.update("classes", row["id"], {"subjects": subjects})

    print()
    print(f"Classes created: {created_classes} (total {len(CLASS_ORDER)})")
    print(f"Teachers created: {created_staff} (total {len(teachers)})")
    print(f"Timetable cells created: {created_cells} (8 per class = {len(CLASS_ORDER) * 8})")
    print(f"Offline mode: {db.offline}")


if __name__ == "__main__":
    main()
