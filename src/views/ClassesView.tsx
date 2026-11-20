import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRightLeft, CalendarDays, Check, Layers, Pencil, Plus, Trash2, Users, X,
} from 'lucide-react'
import { classLabel, sortedClasses } from '../lib/school'
import type { SchoolClass } from '../lib/types'
import type { ViewProps } from './shared'

type Draft = {
  id?: string
  grade: string
  section: string
  subjects: string[]
}

function cleanSubjects(list: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of list) {
    const subject = String(value ?? '').trim()
    if (!subject || seen.has(subject.toLowerCase())) continue
    seen.add(subject.toLowerCase())
    result.push(subject)
  }
  return result
}

export function ClassesView({ controller, onNotify, onTransfer, onBack }: ViewProps & { onBack: () => void }) {
  const { data } = controller
  const classes = useMemo(() => sortedClasses(data.classes), [data.classes])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<SchoolClass | null>(null)
  const [busy, setBusy] = useState(false)

  const studentsIn = (classId: string) =>
    data.students.filter((student) => student.class_id === classId)

  const periodsIn = (classId: string) =>
    data.schedule.filter((item) => item.class_id === classId)

  function openEditor(klass?: SchoolClass) {
    setNewSubject('')
    setDraft(klass ? {
      id: klass.id,
      grade: klass.grade,
      section: klass.section ?? '',
      subjects: cleanSubjects(klass.subjects ?? []),
    } : { grade: '', section: '', subjects: [] })
  }

  function addSubjects() {
    if (!draft) return
    const incoming = newSubject.split(',').map((value) => value.trim()).filter(Boolean)
    if (incoming.length === 0) return
    setDraft({ ...draft, subjects: cleanSubjects([...draft.subjects, ...incoming]) })
    setNewSubject('')
  }

  async function deleteClassSubject(klass: SchoolClass, subject: string) {
    const periods = data.schedule.filter((item) => item.class_id === klass.id && item.subject === subject).length
    const studentIds = new Set(studentsIn(klass.id).map((student) => student.id))
    const marks = data.examMarks.filter((row) => studentIds.has(row.student_id) && row.subject === subject).length
    if (periods || marks) {
      const parts: string[] = []
      if (periods) parts.push(`${periods} timetable period${periods === 1 ? '' : 's'}`)
      if (marks) parts.push(`${marks} exam mark${marks === 1 ? '' : 's'}`)
      onNotify(`Cannot remove ${subject}: used in ${parts.join(' and ')}. Clear those records first.`, 'error')
      return
    }
    setSaving(true)
    try {
      await controller.saveModule('classes', {
        id: klass.id,
        grade: klass.grade,
        section: klass.section,
        subjects: cleanSubjects(klass.subjects ?? []).filter((value) => value !== subject),
      })
      onNotify(`${subject} removed from ${classLabel(klass)}`, 'success')
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not remove the subject', 'error')
    } finally {
      setSaving(false)
    }
  }

  function removeSubject(subject: string) {
    if (!draft?.id) {
      setDraft(draft ? { ...draft, subjects: draft.subjects.filter((value) => value !== subject) } : draft)
      return
    }
    const periods = data.schedule.filter((item) => item.class_id === draft.id && item.subject === subject).length
    const studentIds = new Set(studentsIn(draft.id).map((student) => student.id))
    const marks = data.examMarks.filter((row) => studentIds.has(row.student_id) && row.subject === subject).length
    if (periods || marks) {
      const parts = []
      if (periods) parts.push(`${periods} timetable period${periods === 1 ? '' : 's'}`)
      if (marks) parts.push(`${marks} exam mark${marks === 1 ? '' : 's'}`)
      onNotify(`Cannot remove ${subject}: used in ${parts.join(' and ')}. Clear those records first.`, 'error')
      return
    }
    setDraft({ ...draft, subjects: draft.subjects.filter((value) => value !== subject) })
  }

  async function save() {
    if (!draft) return
    const grade = draft.grade.trim()
    if (!grade) {
      onNotify('Enter a class name, e.g. Class 8 or Nursery.', 'error')
      return
    }
    const label = `${grade}${draft.section.trim() ? ` ${draft.section.trim()}` : ''}`.toLowerCase()
    const duplicate = classes.find((klass) =>
      klass.id !== draft.id && classLabel(klass).toLowerCase() === label,
    )
    if (duplicate) {
      onNotify(`${classLabel(duplicate)} already exists. Use a different section.`, 'error')
      return
    }
    setSaving(true)
    try {
      await controller.saveModule('classes', {
        ...(draft.id ? { id: draft.id } : {}),
        grade,
        section: draft.section.trim(),
        subjects: cleanSubjects(draft.subjects),
      })
      onNotify(draft.id ? 'Class updated' : 'Class added', 'success')
      setDraft(null)
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not save the class', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await controller.deleteModule('classes', deleting.id)
      onNotify(`${classLabel(deleting)} deleted`, 'success')
      setDeleting(null)
      setDraft(null)
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not delete the class', 'error')
    } finally {
      setBusy(false)
    }
  }

  function requestDelete(klass: SchoolClass) {
    const students = studentsIn(klass.id).length
    const periods = periodsIn(klass.id).length
    if (students || periods) {
      onNotify(
        `${classLabel(klass)} cannot be deleted: ${students} student${students === 1 ? '' : 's'} and ${periods} timetable period${periods === 1 ? '' : 's'} still linked.`,
        'error',
      )
      return
    }
    setDeleting(klass)
  }

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-slate-900" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100 tracking-wide">Classes &amp; Subjects</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Source of truth for every module</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold"
        >
          <Plus size={14} /> Add
        </button>
      </header>

      <div className="px-6 mt-2">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Students are enrolled here, timetable subjects come from each class list, and result cards only accept
            subjects the class actually studies.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Layers size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-200">No classes yet</p>
            <p className="text-xs text-slate-500 max-w-[260px] mt-1 leading-relaxed">
              Add the classes your school runs, with the subject list for each one.
            </p>
            <button onClick={() => openEditor()} className="mt-4 text-xs font-bold text-cyan-400">
              + Add your first class
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {classes.map((klass) => {
              const subjects = cleanSubjects(klass.subjects ?? [])
              const students = studentsIn(klass.id).length
              const assigned = periodsIn(klass.id).filter((item) => item.subject).length
              return (
                <div
                  key={klass.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => openEditor(klass)} className="text-left">
                        <h3 className="text-sm font-bold text-slate-100">{classLabel(klass)}</h3>
                      </button>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {subjects.length} subject{subjects.length === 1 ? '' : 's'} · {students} student{students === 1 ? '' : 's'} · {assigned} period{assigned === 1 ? '' : 's'} assigned
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onTransfer({
                          kind: 'class',
                          id: klass.id,
                          name: classLabel(klass),
                          currentClassId: klass.id,
                        })}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[9px] font-bold text-fuchsia-400 hover:bg-fuchsia-500/10"
                        aria-label={`Transfer ${classLabel(klass)}`}
                        title="Move all students and timetable periods to another class"
                      >
                        <ArrowRightLeft size={12} /> Move
                      </button>
                      <button
                        onClick={() => openEditor(klass)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[9px] font-bold text-cyan-400 hover:bg-cyan-500/10"
                        aria-label="Edit class"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => requestDelete(klass)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[9px] font-bold text-rose-400 hover:bg-rose-500/10"
                        aria-label="Delete class"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>

                  {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {subjects.map((subject) => (
                        <span key={subject} className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                          {subject}
                          <button
                            onClick={(event) => { event.stopPropagation(); onTransfer({
                              kind: 'subject',
                              id: klass.id,
                              name: `${subject} · ${classLabel(klass)}`,
                              currentClassId: klass.id,
                              subject,
                            }) }}
                            className="text-slate-500 hover:text-fuchsia-400"
                            aria-label={`Transfer ${subject}`}
                            title={`Transfer ${subject} to another class`}
                          >
                            <ArrowRightLeft size={10} />
                          </button>
                          <button
                            onClick={(event) => { event.stopPropagation(); void deleteClassSubject(klass, subject) }}
                            className="text-slate-600 hover:text-rose-400"
                            aria-label={`Delete ${subject}`}
                            title={`Delete ${subject}`}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => openEditor(klass)} className="mt-3 text-[10px] font-bold text-amber-400">
                      + Add subjects for this class
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {draft && (
        <div className="absolute inset-0 z-[72] flex items-end bg-[#e4e4e7]/85 backdrop-blur-sm fade-in-up">
          <div className="w-full max-h-[90%] overflow-y-auto scrollbar-hide bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-100">{draft.id ? 'Edit Class' : 'New Class'}</h3>
              <button onClick={() => setDraft(null)} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-slate-900" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class / grade *</span>
                  <input
                    value={draft.grade}
                    onChange={(event) => setDraft({ ...draft, grade: event.target.value })}
                    placeholder="e.g. Class 8 or Nursery"
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Section</span>
                  <input
                    value={draft.section}
                    onChange={(event) => setDraft({ ...draft, section: event.target.value })}
                    placeholder="A"
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subjects</span>
                  <span className="text-[10px] text-slate-500">{draft.subjects.length} added</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSubject}
                    onChange={(event) => setNewSubject(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addSubjects()
                      }
                    }}
                    placeholder="e.g. Math, English"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    onClick={addSubjects}
                    disabled={!newSubject.trim()}
                    className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Comma-separate to add several at once.</p>

                <div className="flex flex-col gap-1.5 mt-3">
                  {draft.subjects.length === 0 && (
                    <p className="text-[11px] text-amber-400">No subjects yet. The timetable cannot be filled until you add at least one.</p>
                  )}
                  {draft.subjects.map((subject) => {
                    const periods = draft.id
                      ? data.schedule.filter((item) => item.class_id === draft.id && item.subject === subject).length
                      : 0
                    return (
                      <div key={subject} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                        <span className="flex-1 text-xs font-semibold text-slate-200">{subject}</span>
                        {periods > 0 && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-1">
                            <CalendarDays size={10} /> {periods}
                          </span>
                        )}
                        <button
                          onClick={() => removeSubject(subject)}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                          aria-label={`Remove ${subject}`}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {draft.id && (
                <button
                  onClick={() => {
                    const klass = classes.find((row) => row.id === draft.id)
                    if (klass) requestDelete(klass)
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 self-start"
                >
                  <Trash2 size={13} /> Delete this class
                </button>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setDraft(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-cyan-500 text-sm font-bold text-slate-950 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Check size={15} /> {saving ? 'Saving...' : 'Save Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="absolute inset-0 z-[75] flex items-center justify-center bg-[#e4e4e7]/85 backdrop-blur-sm p-6 fade-in-up">
          <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-100">Delete {classLabel(deleting)}?</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The class and its subject list will be removed. Students and timetable periods are not linked, so
              nothing else is deleted.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleting(null)} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={busy} className="flex-1 py-3 rounded-xl bg-rose-500 text-sm font-bold text-white disabled:opacity-60">
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
