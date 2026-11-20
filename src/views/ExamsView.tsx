import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, GraduationCap, Save, X } from 'lucide-react'
import {
  TERM_OPTIONS, academicYear, classLabel, classSubjects, gradeFor, marksPercentage,
  sortedClasses, studentClass,
} from '../lib/school'
import type { ExamMark } from '../lib/types'
import type { ViewProps } from './shared'

type Draft = { obtained: string; total: string }

export function ExamsView({ controller, onNotify, onBack }: ViewProps & { onBack: () => void }) {
  const { data } = controller
  const [session, setSession] = useState(academicYear())
  const [term, setTerm] = useState(TERM_OPTIONS[0])
  const [classFilter, setClassFilter] = useState('')
  const [studentId, setStudentId] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState(false)

  const classes = useMemo(() => sortedClasses(data.classes), [data.classes])
  const students = useMemo(() => {
    return data.students
      .filter((student) => !classFilter || student.class_id === classFilter)
      .sort((a, b) => {
        const ca = studentClass(data, a)
        const cb = studentClass(data, b)
        if (ca && cb) {
          const byClass = ca.grade.localeCompare(cb.grade, undefined, { numeric: true })
          if (byClass !== 0) return byClass
        }
        return a.name.localeCompare(b.name)
      })
  }, [data, classFilter])

  const student = students.find((row) => row.id === studentId) ?? data.students.find((row) => row.id === studentId)
  const klass = student ? studentClass(data, student) : undefined
  const subjects = classSubjects(data, klass?.id)

  const existing = useMemo(
    () => data.examMarks.filter((mark) =>
      mark.student_id === studentId && mark.session === session && mark.term === term,
    ),
    [data.examMarks, studentId, session, term],
  )

  // Build the mark sheet whenever the selected student / term changes.
  useEffect(() => {
    if (!studentId) {
      setDrafts({})
      return
    }
    const next: Record<string, Draft> = {}
    for (const subject of subjects) {
      const mark = existing.find((row) => row.subject === subject)
      next[subject] = {
        obtained: mark ? String(mark.marks_obtained) : '',
        total: mark ? String(mark.total_marks) : '100',
      }
    }
    // Keep marks for subjects that were removed from the class list so they can be cleared.
    for (const mark of existing) {
      if (!next[mark.subject]) {
        next[mark.subject] = { obtained: String(mark.marks_obtained), total: String(mark.total_marks) }
      }
    }
    setDrafts(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, session, term, data.examMarks, data.classes])

  const rows = Object.entries(drafts)
  const filled = rows.filter(([, draft]) => draft.obtained.trim() !== '')
  const totals = filled.reduce((acc, [, draft]) => {
    const obtained = Number(draft.obtained)
    const total = Number(draft.total || 100)
    if (!Number.isFinite(obtained) || !Number.isFinite(total)) return acc
    return { obtained: acc.obtained + obtained, total: acc.total + total }
  }, { obtained: 0, total: 0 })
  const percentage = totals.total > 0 ? Math.round((totals.obtained / totals.total) * 1000) / 10 : null

  const classAverage = useMemo(() => {
    const list = students
      .map((row) => {
        const marks = data.examMarks.filter((mark) =>
          mark.student_id === row.id && mark.session === session && mark.term === term,
        )
        return marksPercentage(marks)
      })
      .filter((value): value is number => value !== null)
    if (!list.length) return null
    return Math.round((list.reduce((sum, value) => sum + value, 0) / list.length) * 10) / 10
  }, [students, data.examMarks, session, term])

  function changeStudent(id: string) {
    setStudentId(id)
  }

  function setMark(subject: string, key: keyof Draft, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [subject]: { ...prev[subject], [key]: value },
    }))
  }

  async function saveMarks() {
    if (!student || !studentId) return
    if (!klass) {
      onNotify('Assign this student to a class before entering marks.', 'error')
      return
    }
    const upserts: Array<{ table: 'exam_marks'; row: Record<string, unknown> }> = []
    const deletes: Array<{ table: 'exam_marks'; id: string }> = []

    for (const [subject, draft] of rows) {
      const existingMark = existing.find((mark) => mark.subject === subject)
      const raw = draft.obtained.trim()
      if (!raw) {
        if (existingMark) deletes.push({ table: 'exam_marks', id: existingMark.id })
        continue
      }
      const obtained = Number(raw)
      const total = Number(draft.total || 100)
      if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
        onNotify(`${subject}: enter marks between 0 and ${draft.total || 100}.`, 'error')
        return
      }
      upserts.push({
        table: 'exam_marks',
        row: {
          ...(existingMark ? { id: existingMark.id } : {}),
          session,
          term,
          student_id: studentId,
          subject,
          marks_obtained: obtained,
          total_marks: total,
        },
      })
    }

    if (!upserts.length && !deletes.length) {
      onNotify('Nothing to save — enter at least one mark.', 'error')
      return
    }

    setSaving(true)
    try {
      await controller.applyModuleChanges(upserts, deletes)
      onNotify(`Result saved for ${student.name}`, 'success')
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not save the result', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-slate-900" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100 tracking-wide">Exams &amp; Results</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Subject list comes from the class</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <GraduationCap size={17} />
        </div>
      </header>

      <div className="px-6 mt-2 flex flex-col gap-3 pb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session</span>
            <input
              value={session}
              onChange={(event) => setSession(event.target.value)}
              placeholder="2026-2027"
              className="mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Term</span>
            <select
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              {TERM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Class</span>
            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value)
                setStudentId('')
              }}
              className="mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All classes</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{classLabel(row)}</option>)}
            </select>
          </label>
        </div>

        {students.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-slate-500">
              {classFilter ? 'No students in this class yet.' : 'No students yet. Add students first.'}
            </p>
            <button onClick={() => controller.refresh()} className="mt-3 text-[11px] font-bold text-cyan-400">
              Refresh
            </button>
          </div>
        ) : (
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Student</span>
            <select
              value={studentId}
              onChange={(event) => changeStudent(event.target.value)}
              className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
            >
              <option value="">Select a student…</option>
              {students.map((row) => {
                const marks = data.examMarks.filter((mark) =>
                  mark.student_id === row.id && mark.session === session && mark.term === term,
                )
                const pct = marksPercentage(marks)
                const rowClass = studentClass(data, row)
                return (
                  <option key={row.id} value={row.id}>
                    {row.name}{rowClass ? ` · ${classLabel(rowClass)}` : ''}{pct === null ? '' : ` · ${pct}%`}
                  </option>
                )
              })}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {students.length} student{students.length === 1 ? '' : 's'}
              {classAverage === null ? '' : ` · class average ${classAverage}%`}
            </p>
          </label>
        )}

        {student && (
          <div className="flex flex-col gap-3">
            {!klass && (
              <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p>This student has no class. Assign a class in Students to load the correct subject list.</p>
              </div>
            )}

            {klass && subjects.length === 0 && existing.length === 0 && (
              <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p>{classLabel(klass)} has no subjects. Add them in Classes &amp; Subjects first.</p>
              </div>
            )}

            {rows.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-100">{student.name}</p>
                    <p className="text-[10px] text-slate-500">{klass ? classLabel(klass) : 'No class'} · {session} · {term}</p>
                  </div>
                  <button
                    onClick={() => setDrafts({})}
                    className="text-[10px] font-bold text-slate-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <X size={12} /> Reset
                  </button>
                </div>

                <div className="px-4 py-2">
                  <div className="grid grid-cols-[1fr_58px_58px_38px] gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 py-2">
                    <span>Subject</span>
                    <span className="text-center">Obtained</span>
                    <span className="text-center">Total</span>
                    <span className="text-center">Grade</span>
                  </div>
                  {rows.map(([subject, draft]) => {
                    const obtained = Number(draft.obtained)
                    const total = Number(draft.total)
                    const valid = draft.obtained.trim() !== '' && Number.isFinite(obtained) && Number.isFinite(total)
                    const pct = valid && total > 0 ? (obtained / total) * 100 : null
                    const invalid = valid && (obtained < 0 || obtained > total)
                    return (
                      <div key={subject} className="grid grid-cols-[1fr_58px_58px_38px] gap-2 items-center py-1">
                        <span className={`text-[11px] font-semibold truncate ${subjects.includes(subject) ? 'text-slate-200' : 'text-amber-400'}`}>
                          {subject}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={draft.obtained}
                          onChange={(event) => setMark(subject, 'obtained', event.target.value)}
                          placeholder="—"
                          className={`w-full bg-slate-950 border rounded-lg px-1.5 py-1.5 text-center text-[11px] text-slate-100 ${invalid ? 'border-rose-500' : 'border-slate-700'}`}
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          value={draft.total}
                          onChange={(event) => setMark(subject, 'total', event.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1.5 text-center text-[11px] text-slate-100"
                        />
                        <span className={`text-center text-[10px] font-bold ${pct === null ? 'text-slate-600' : 'text-cyan-300'}`}>
                          {pct === null ? '—' : gradeFor(pct)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/40">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Marks</p>
                    <p className="text-sm font-bold text-slate-100">
                      {totals.obtained}<span className="text-[10px] text-slate-500">/{totals.total || 0}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Percentage</p>
                    <p className="text-sm font-bold text-cyan-300">{percentage === null ? '—' : `${percentage}%`}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Grade</p>
                    <p className={`text-sm font-bold ${percentage !== null && percentage < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {gradeFor(percentage)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <button
                onClick={saveMarks}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-cyan-500 text-sm font-bold text-slate-950 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Save size={15} className="animate-pulse" /> : <Check size={15} />}
                {saving ? 'Saving result...' : 'Save Result Card'}
              </button>
            )}

            {rows.length > 0 && (
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Leave a subject blank to keep it out of the result. Clearing a saved subject removes that mark.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
