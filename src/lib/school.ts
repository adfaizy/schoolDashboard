import type {
  AttendanceRow, DashboardData, ExamMark, SchoolClass, StaffRow, Student,
} from './types'

/** One place for every cross-module lookup so the app stays relational. */

export function classLabel(row: SchoolClass | null | undefined): string {
  if (!row) return 'No class'
  return `${row.grade}${row.section ? ` ${row.section}` : ''}`
}

function gradeNumber(grade: string): number {
  const match = grade.match(/(\d+)/)
  return match ? Number(match[1]) : -1
}

/** Class 8 … Class 1 first, then Nursery / ECE, like the printed timetable. */
export function classSortKey(a: SchoolClass, b: SchoolClass): number {
  const na = gradeNumber(a.grade)
  const nb = gradeNumber(b.grade)
  if (na !== nb) return nb - na
  const rank = (grade: string) => {
    const low = grade.toLowerCase()
    return low.startsWith('nursery') ? 0 : low.startsWith('ece') ? 1 : 2
  }
  const ra = rank(a.grade)
  const rb = rank(b.grade)
  if (ra !== rb) return ra - rb
  return classLabel(a).localeCompare(classLabel(b))
}

export function sortedClasses(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort(classSortKey)
}

export function findClass(data: DashboardData, id: string | null | undefined): SchoolClass | undefined {
  if (!id) return undefined
  return data.classes.find((row) => row.id === id)
}

/** Students keep a legacy `grade` text column; the class link is authoritative. */
export function studentClass(data: DashboardData, student: Student): SchoolClass | undefined {
  const linked = findClass(data, student.class_id)
  if (linked) return linked
  const legacy = String(student.grade ?? '').trim().toLowerCase()
  if (!legacy) return undefined
  return data.classes.find((row) => classLabel(row).toLowerCase() === legacy)
}

export function studentClassLabel(data: DashboardData, student: Student): string {
  return classLabel(studentClass(data, student))
}

export function classSubjects(data: DashboardData, classId: string | null | undefined): string[] {
  const klass = findClass(data, classId)
  if (!klass || !Array.isArray(klass.subjects)) return []
  const seen = new Set<string>()
  return klass.subjects
    .map((subject) => String(subject ?? '').trim())
    .filter((subject) => {
      if (!subject || seen.has(subject.toLowerCase())) return false
      seen.add(subject.toLowerCase())
      return true
    })
}

/** Only active teaching staff can be assigned to a period. */
export function teachingStaff(data: DashboardData): StaffRow[] {
  return data.staff
    .filter((row) => row.staff_category === 'teaching' && row.status !== 'inactive')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function activeStaff(data: DashboardData): StaffRow[] {
  return data.staff.filter((row) => row.status !== 'inactive')
}

export function studentName(data: DashboardData, id: string | null | undefined): string {
  return data.students.find((row) => row.id === id)?.name ?? 'Unknown student'
}

export function studentOptions(
  data: DashboardData,
  emptyLabel?: string,
): { value: string; label: string }[] {
  const options = [...data.students]
    .sort((a, b) => {
      const ca = studentClass(data, a)
      const cb = studentClass(data, b)
      if (ca && cb) {
        const byClass = classSortKey(ca, cb)
        if (byClass !== 0) return byClass
      } else if (ca) return -1
      else if (cb) return 1
      return a.name.localeCompare(b.name)
    })
    .map((student) => {
      const klass = studentClass(data, student)
      return {
        value: student.id,
        label: klass ? `${student.name} · ${classLabel(klass)}` : `${student.name} · unassigned`,
      }
    })
  return emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options
}

export type AttendanceSummary = {
  marked: number
  present: number
  absent: number
  late: number
  leave: number
  rate: number | null
}

export function summarizeAttendance(rows: AttendanceRow[]): AttendanceSummary {
  const summary = { marked: 0, present: 0, absent: 0, late: 0, leave: 0, rate: null as number | null }
  for (const row of rows) {
    if (row.status === 'present') summary.present += 1
    else if (row.status === 'absent') summary.absent += 1
    else if (row.status === 'late') summary.late += 1
    else if (row.status === 'leave') summary.leave += 1
  }
  summary.marked = summary.present + summary.absent + summary.late + summary.leave
  if (summary.marked) {
    // Late arrivals are on campus, so they count towards the attendance rate.
    summary.rate = Math.round(((summary.present + summary.late) / summary.marked) * 100)
  }
  return summary
}

export function studentAttendance(data: DashboardData, studentId: string): number | null {
  return summarizeAttendance(
    data.attendance.filter((row) => row.entity_type === 'students' && row.record_id === studentId),
  ).rate
}

export function statusForAttendance(rate: number | null): string {
  if (rate === null) return 'No records'
  if (rate >= 90) return 'Excellent'
  if (rate >= 75) return 'Good'
  if (rate >= 60) return 'Warning'
  return 'Critical'
}

export function gradeFor(percentage: number | null): string {
  if (percentage === null || Number.isNaN(percentage)) return '—'
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  if (percentage >= 40) return 'E'
  return 'F'
}

export function marksPercentage(marks: Pick<ExamMark, 'marks_obtained' | 'total_marks'>[]): number | null {
  const total = marks.reduce((sum, row) => sum + Number(row.total_marks || 0), 0)
  if (!total) return null
  const obtained = marks.reduce((sum, row) => sum + Number(row.marks_obtained || 0), 0)
  return Math.round((obtained / total) * 1000) / 10
}

export function money(value: number): string {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

export function pendingFees(data: DashboardData): number {
  return data.fees
    .filter((row) => row.status !== 'paid')
    .reduce((sum, row) => sum + Number(row.amount_paid || 0), 0)
}

export function academicYear(today = new Date()): string {
  const year = today.getFullYear()
  return today.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

export const TERM_OPTIONS = ['Term 1', 'Term 2', 'Final Term']

export function todayKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
