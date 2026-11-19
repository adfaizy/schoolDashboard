import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Eraser, X } from 'lucide-react'
import type { ScheduleItem, SchoolClass } from '../lib/types'
import type { ViewProps } from './shared'

const PERIODS = [
  { no: 1, label: 'P-1', start: '8:45 AM', end: '9:30 AM' },
  { no: 2, label: 'P-2', start: '9:30 AM', end: '10:00 AM' },
  { no: 3, label: 'P-3', start: '10:00 AM', end: '10:30 AM' },
  { no: 4, label: 'P-4', start: '10:30 AM', end: '11:00 AM' },
  { no: 5, label: 'P-5', start: '11:00 AM', end: '11:30 AM' },
  { no: 6, label: 'P-6', start: '12:00 PM', end: '12:30 PM' },
  { no: 7, label: 'P-7', start: '12:30 PM', end: '1:00 PM' },
  { no: 8, label: 'P-8', start: '1:00 PM', end: '1:30 PM' },
]
const BREAK_AFTER = 5

const DEFAULT_SUBJECTS = [
  'URDU', 'ENGLISH', 'MATH', 'SCIENCE', 'ISLAMIAT', 'HIST & GEOG', 'COMPUTER',
  'T.Q', 'NAZRA QURAN', 'SOCIAL STUDIES', 'GAMES', 'DRAWING', 'G.KN',
]

/** Class 8 … Class 1 first, then Nursery / ECE, like the printed timetable. */
function classOrder(a: SchoolClass, b: SchoolClass) {
  const num = (grade: string) => {
    const match = grade.match(/(\d+)/)
    return match ? Number(match[1]) : -1
  }
  const na = num(a.grade)
  const nb = num(b.grade)
  if (na !== nb) return nb - na
  const rank = (grade: string) => (grade.toLowerCase().startsWith('nursery') ? 0 : grade.toLowerCase().startsWith('ece') ? 1 : 2)
  const ra = rank(a.grade)
  const rb = rank(b.grade)
  if (ra !== rb) return ra - rb
  return `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`)
}

function classLabel(row: SchoolClass) {
  return `${row.grade}${row.section ? ' ' + row.section : ''}`
}

type CellTarget = { klass: SchoolClass; period: typeof PERIODS[number] }

export function TimetableView({ controller, onNotify }: ViewProps) {
  const { data } = controller
  const [target, setTarget] = useState<CellTarget | null>(null)
  const [saving, setSaving] = useState(false)

  const classes = useMemo(() => [...data.classes].sort(classOrder), [data.classes])

  const cellFor = (classId: string, periodNo: number): ScheduleItem | undefined =>
    data.schedule.find((item) => item.class_id === classId && Number(item.period_no) === periodNo)

  const subjectOptions = useMemo(() => {
    if (!target) return DEFAULT_SUBJECTS
    const current = cellFor(target.klass.id, target.period.no)?.subject
    const klassSubjects = Array.isArray(target.klass.subjects) ? target.klass.subjects : []
    const used = data.schedule
      .filter((item) => item.class_id === target.klass.id && item.subject)
      .map((item) => item.subject)
    return Array.from(new Set([...klassSubjects, ...used, ...DEFAULT_SUBJECTS, ...(current ? [current] : [])]))
  }, [target, data.schedule])

  const teacherOptions = useMemo(() => {
    const names = data.staff.map((s) => s.name)
    const current = target ? cellFor(target.klass.id, target.period.no)?.teacher : ''
    return Array.from(new Set([...names, ...(current ? [current] : [])])).filter(Boolean)
  }, [data.staff, target, data.schedule])

  const existing = target ? cellFor(target.klass.id, target.period.no) : undefined
  const [subject, setSubject] = useState('')
  const [teacher, setTeacher] = useState('')

  function openCell(klass: SchoolClass, period: typeof PERIODS[number]) {
    const row = cellFor(klass.id, period.no)
    setSubject(row?.subject ?? '')
    setTeacher(row?.teacher ?? '')
    setTarget({ klass, period })
  }

  async function saveCell() {
    if (!target) return
    setSaving(true)
    try {
      await controller.saveRecord('schedule_items', {
        ...(existing ? { id: existing.id } : {}),
        day: 'Daily',
        time: `${target.period.start} – ${target.period.end}`,
        subject: subject.trim(),
        teacher: teacher.trim(),
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
      if (existing) await controller.deleteRecord('schedule_items', existing.id)
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
              {classes.length} classes · {PERIODS.length} periods · tap a cell to assign
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <CalendarDays size={18} />
          </div>
        </div>
      </header>

      {classes.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
            <CalendarDays size={22} />
          </div>
          <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">
            No classes yet. Add classes first in <span className="text-cyan-400 font-semibold">Manage → Classes &amp; Subjects</span>,
            then the timetable grid appears here.
          </p>
        </div>
      ) : (
        <>
          <p className="px-6 pb-2 text-[10px] text-slate-600">Swipe left/right to see all periods</p>
          <div className="overflow-x-auto scrollbar-hide pb-6" style={{ scrollbarWidth: 'none' }}>
            <table className="border-separate border-spacing-0 text-[10px]" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-900 border-b border-r border-slate-800 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-300" style={{ minWidth: 84, width: 84 }}>
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
                          <div className="text-[9px] font-black uppercase tracking-wider text-amber-400">Break</div>
                          <div className="text-[8px] text-amber-500/80 whitespace-nowrap">11:30-12:00</div>
                        </th>,
                      )
                    }
                    return cells
                  }, [])}
                </tr>
              </thead>
              <tbody>
                {classes.map((klass) => (
                  <tr key={klass.id}>
                    <th className="sticky left-0 z-10 bg-slate-900 border-b border-r border-slate-800 px-2 py-2 text-left align-middle" style={{ minWidth: 84, width: 84 }}>
                      <span className="text-[11px] font-bold text-slate-200">{classLabel(klass)}</span>
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
                                <span className="text-[8px] italic text-cyan-400 leading-tight break-words">{cell.teacher || '—'}</span>
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
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/70 [writing-mode:vertical-rl]">Break</span>
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
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-5 fade-in-up">
          <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <h3 className="text-sm font-bold text-slate-100">Assign Period</h3>
              <button onClick={() => setTarget(null)} className="text-slate-500 hover:text-white p-1" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-4 flex flex-col gap-3">
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <p><span className="font-bold text-slate-100">Class:</span> {classLabel(target.klass)}</p>
                <p>
                  <span className="font-bold text-slate-100">Period:</span> {target.period.label}
                  <span className="text-slate-500"> ({target.period.start}–{target.period.end})</span>
                </p>
              </div>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</span>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
                >
                  <option value="">— Free period —</option>
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
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
                  <input
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="Teacher name"
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100"
                  />
                )}
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800">
              <button
                onClick={clearCell}
                disabled={saving}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-400 disabled:opacity-50"
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
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-[11px] font-bold text-slate-950 disabled:opacity-60"
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
