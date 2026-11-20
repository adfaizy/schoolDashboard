import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CalendarDays, Eraser, X } from 'lucide-react'
import { BREAK_AFTER, BREAK, PERIODS, periodTime, type PeriodDef } from '../lib/periods'
import {
  classLabel, classSubjects, findClass, sortedClasses, teachingStaff,
} from '../lib/school'
import type { ScheduleItem, SchoolClass } from '../lib/types'
import type { ViewProps } from './shared'

type CellTarget = { klass: SchoolClass; period: PeriodDef }

export function TimetableView({ controller, onNotify, onOpenModule }: ViewProps) {
  const { data } = controller
  const [target, setTarget] = useState<CellTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [subject, setSubject] = useState('')
  const [teacher, setTeacher] = useState('')
  const [classFilter, setClassFilter] = useState('')

  const classes = useMemo(() => sortedClasses(data.classes), [data.classes])
  const visibleClasses = classFilter ? classes.filter((klass) => klass.id === classFilter) : classes

  const cellFor = (classId: string, periodNo: number): ScheduleItem | undefined =>
    data.schedule.find((item) => item.class_id === classId && Number(item.period_no) === periodNo)

  const assignedCount = classes.reduce(
    (total, klass) => total + PERIODS.filter((period) => cellFor(klass.id, period.no)?.subject).length,
    0,
  )
  const slotCount = classes.length * PERIODS.length

  const staff = teachingStaff(data)
  const targetSubjects = target ? classSubjects(data, target.klass.id) : []
  const currentCell = target ? cellFor(target.klass.id, target.period.no) : undefined
  const subjectOptions = useMemo(() => {
    if (!target) return []
    const current = currentCell?.subject?.trim()
    return current && !targetSubjects.some((value) => value.toLowerCase() === current.toLowerCase())
      ? [...targetSubjects, current]
      : targetSubjects
  }, [target, currentCell, targetSubjects])

  const teacherOptions = useMemo(() => {
    const names = staff.map((member) => member.name)
    const current = currentCell?.teacher?.trim()
    return current && !names.includes(current) ? [...names, current] : names
  }, [staff, currentCell])

  const conflict = useMemo(() => {
    if (!target || !teacher) return undefined
    return data.schedule.find((item) =>
      item.class_id !== target.klass.id
      && Number(item.period_no) === target.period.no
      && item.teacher === teacher
      && Boolean(item.subject),
    )
  }, [target, teacher, data.schedule])

  const subjectMissing = target
    ? Boolean(subject) && !targetSubjects.some((value) => value.toLowerCase() === subject.toLowerCase())
      && subject !== currentCell?.subject
    : false

  function openCell(klass: SchoolClass, period: PeriodDef) {
    const row = cellFor(klass.id, period.no)
    setSubject(row?.subject ?? '')
    setTeacher(row?.teacher ?? '')
    setTarget({ klass, period })
  }

  async function saveCell() {
    if (!target) return
    const cleanSubject = subject.trim()
    const cleanTeacher = teacher.trim()

    if (!cleanSubject && !cleanTeacher) {
      await clearCell()
      return
    }
    if (!cleanSubject) {
      onNotify('Choose a subject for this period, or clear the teacher.', 'error')
      return
    }
    if (subjectMissing) {
      onNotify(`${cleanSubject} is not in ${classLabel(target.klass)} subjects. Add it in Classes & Subjects first.`, 'error')
      return
    }

    setSaving(true)
    try {
      await controller.saveRecord('schedule_items', {
        ...(currentCell ? { id: currentCell.id } : {}),
        day: 'Daily',
        time: periodTime(target.period),
        subject: cleanSubject,
        teacher: cleanTeacher,
        room: '',
        color: 'cyan',
        class_id: target.klass.id,
        period_no: target.period.no,
      })
      onNotify('Period saved', 'success')
      setTarget(null)
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Could not save the period', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function clearCell() {
    if (!target) return
    setSaving(true)
    try {
      if (currentCell) await controller.deleteRecord('schedule_items', currentCell.id)
      onNotify('Period cleared', 'success')
      setTarget(null)
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Could not clear the period', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Timetable</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              {classes.length} classes · {assignedCount}/{slotCount || 0} periods assigned
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <CalendarDays size={18} />
          </div>
        </div>
        {classes.length > 0 && (
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="mt-3 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
          >
            <option value="">All classes</option>
            {classes.map((klass) => (
              <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>
            ))}
          </select>
        )}
      </header>

      {classes.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
            <CalendarDays size={22} />
          </div>
          <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">
            No classes yet. Add classes and their subjects first, then the timetable grid appears here.
          </p>
          <button onClick={() => onOpenModule('classes')} className="mt-4 text-xs font-bold text-cyan-400">
            Open Classes &amp; Subjects
          </button>
        </div>
      ) : (
        <>
          <p className="px-6 pb-2 text-[10px] text-slate-600">Swipe left/right to see all periods</p>
          <div className="overflow-x-auto scrollbar-hide pb-6" style={{ scrollbarWidth: 'none' }}>
            <table className="border-separate border-spacing-0 text-[10px]" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-900 border-b border-r border-slate-800 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-300" style={{ minWidth: 90, width: 90 }}>
                    Class
                  </th>
                  {PERIODS.map((period) => (
                    <th key={period.no} className="bg-slate-900 border-b border-r border-slate-800 px-1 py-2" style={{ minWidth: 100, width: 100 }}>
                      <div className="text-[10px] font-black text-cyan-300">{period.label}</div>
                      <div className="text-[8px] font-medium text-slate-400 whitespace-nowrap">{period.start}-{period.end}</div>
                    </th>
                  )).reduce<ReactNode[]>((cells, node, index) => {
                    cells.push(node)
                    if (index === BREAK_AFTER - 1) {
                      cells.push(
                        <th key="break" className="bg-amber-500/15 border-b border-r border-amber-500/30 px-1 py-2" style={{ minWidth: 58, width: 58 }}>
                          <div className="text-[9px] font-black uppercase tracking-wider text-amber-400">{BREAK.label}</div>
                          <div className="text-[8px] text-amber-500/80 whitespace-nowrap">{BREAK.start}-{BREAK.end}</div>
                        </th>,
                      )
                    }
                    return cells
                  }, [])}
                </tr>
              </thead>
              <tbody>
                {visibleClasses.map((klass) => (
                  <tr key={klass.id}>
                    <th className="sticky left-0 z-10 bg-slate-900 border-b border-r border-slate-800 px-2 py-2 text-left align-middle" style={{ minWidth: 90, width: 90 }}>
                      <span className="text-[11px] font-bold text-slate-200">{classLabel(klass)}</span>
                      <span className="block text-[8px] font-medium text-slate-500">{classSubjects(data, klass.id).length} subjects</span>
                    </th>
                    {PERIODS.map((period) => {
                      const cell = cellFor(klass.id, period.no)
                      return (
                        <td key={period.no} className="border-b border-r border-slate-800/70 p-0 align-top" style={{ minWidth: 100, width: 100 }}>
                          <button
                            onClick={() => openCell(klass, period)}
                            className="w-full h-[62px] px-1 py-1.5 flex flex-col items-center justify-center text-center hover:bg-cyan-500/10 active:bg-cyan-500/15 transition-colors"
                          >
                            <span className="text-[7px] text-slate-600 leading-none mb-0.5 whitespace-nowrap">
                              {period.start}–{period.end}
                            </span>
                            {cell?.subject ? (
                              <>
                                <span className="text-[10px] font-bold text-slate-100 leading-tight break-words">{cell.subject}</span>
                                <span className="text-[8px] italic text-cyan-400 leading-tight break-words">{cell.teacher || 'Unassigned'}</span>
                              </>
                            ) : (
                              <span className="text-base font-light text-slate-600 leading-none">+</span>
                            )}
                          </button>
                        </td>
                      )
                    }).reduce<ReactNode[]>((cells, node, index) => {
                      cells.push(node)
                      if (index === BREAK_AFTER - 1) {
                        cells.push(
                          <td key="break" className="bg-amber-500/[0.07] border-b border-r border-amber-500/20 text-center align-middle" style={{ minWidth: 58, width: 58 }}>
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/70 [writing-mode:vertical-rl]">{BREAK.label}</span>
                          </td>,
                        )
                      }
                      return cells
                    }, [])}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {target && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#cbd5e1]/80 backdrop-blur-sm px-5 fade-in-up">
          <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <h3 className="text-sm font-bold text-slate-100">Assign Period</h3>
              <button onClick={() => setTarget(null)} className="text-slate-500 hover:text-slate-900 p-1" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-4 flex flex-col gap-3">
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <p><span className="font-bold text-slate-100">Class:</span> {classLabel(target.klass)}</p>
                <p>
                  <span className="font-bold text-slate-100">Period:</span> {target.period.label}
                  <span className="text-slate-500"> ({periodTime(target.period)})</span>
                </p>
              </div>

              {targetSubjects.length === 0 && (
                <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>
                    This class has no subjects yet. Add them under Classes &amp; Subjects first.
                  </p>
                </div>
              )}

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</span>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={subjectOptions.length === 0}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 disabled:opacity-50"
                >
                  <option value="">— Free period —</option>
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {subjectMissing && (
                  <p className="text-[10px] text-amber-400 mt-1.5">Not part of this class subject list.</p>
                )}
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher</span>
                {teacherOptions.length > 0 ? (
                  <select
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
                  >
                    <option value="">— Not assigned —</option>
                    {teacherOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-400">
                    No active teaching staff. Add teachers under Teachers &amp; Staff.
                  </p>
                )}
              </label>

              {conflict && (
                <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>
                    {teacher} is already teaching {classLabel(findClass(data, conflict.class_id))} in {target.period.label}.
                    Double-booking is allowed but usually needs attention.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800">
              <button
                onClick={clearCell}
                disabled={saving || !currentCell}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-400 disabled:opacity-30"
              >
                <Eraser size={13} /> Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-[11px] font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCell}
                  disabled={saving || (subjectOptions.length === 0 && !subject)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-[11px] font-bold text-slate-950 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Period'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
