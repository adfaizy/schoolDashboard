import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { classLabel, sortedClasses, studentClassLabel, summarizeAttendance } from '../lib/school'
import type { ViewProps } from './shared'

const STATUSES = ['present', 'absent', 'late', 'leave'] as const
const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  absent: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  late: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  leave: 'bg-slate-700/40 text-slate-300 border-slate-600',
}

export function AttendanceModuleView({ controller, onNotify, onBack }: ViewProps & {
  onBack: () => void
}) {
  const { data } = controller
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [entity, setEntity] = useState<'students' | 'staff'>('students')
  const [classId, setClassId] = useState('')

  const students = data.students
  const staff = data.staff.filter((row) => row.status !== 'inactive')
  const rows = entity === 'students'
    ? (classId === '__none__'
        ? students.filter((s) => !s.class_id)
        : classId ? students.filter((s) => s.class_id === classId) : students)
    : staff

  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const row of data.attendance) {
      if (row.date_str === date && row.entity_type === entity) map[row.record_id] = row.status
    }
    return map
  }, [data.attendance, date, entity])

  const summary = summarizeAttendance(
    rows
      .filter((row) => attendanceMap[row.id])
      .map((row) => ({
        date_str: date,
        entity_type: entity,
        record_id: row.id,
        status: attendanceMap[row.id],
      })),
  )

  async function mark(recordId: string, status: string) {
    await controller.setAttendance(date, entity, recordId, status)
  }

  async function markAll(status: string) {
    for (const row of rows) {
      await controller.setAttendance(date, entity, row.id, status)
    }
    onNotify(`Marked ${rows.length} as ${status}`, 'success')
  }

  const marked = rows.filter((r) => attendanceMap[r.id]).length

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-100 flex-1 tracking-wide">Attendance</h1>
      </header>

      <div className="px-6 flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            />
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              {(['students', 'staff'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEntity(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${entity === tab ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {entity === 'students' && (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              <option value="">All classes</option>
              {sortedClasses(data.classes).map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
              <option value="__none__">Unassigned students</option>
            </select>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            ['Present', summary.present, 'text-emerald-400'],
            ['Absent', summary.absent, 'text-rose-400'],
            ['Late', summary.late, 'text-amber-400'],
            ['Leave', summary.leave, 'text-slate-300'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl py-2">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {marked}/{rows.length} marked · {date}
            {summary.rate === null ? '' : ` · ${summary.rate}% present`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">All present</button>
            <button onClick={() => markAll('absent')} className="text-[10px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/30 rounded-lg px-2.5 py-1.5">All absent</button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-slate-500 py-10 text-center">
            {entity === 'students'
              ? (classId ? 'No students in this class yet.' : 'No students yet. Add students first.')
              : 'No active staff yet. Add staff first.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2 pb-6">
            {rows.map((row: any) => {
              const current = attendanceMap[row.id] ?? 'unmarked'
              const secondary = entity === 'students'
                ? [studentClassLabel(data, row), row.roll_no ? `Roll ${row.roll_no}` : ''].filter(Boolean).join(' · ')
                : `${row.designation || 'Staff'}${row.staff_category === 'teaching' ? ' · Teaching' : ' · Non-teaching'}`
              return (
                <div key={row.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                    {String(row.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">{row.name}</p>
                    <p className="text-[9px] text-slate-500">{secondary}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {STATUSES.map((status) => {
                      const active = current === status
                      return (
                        <button
                          key={status}
                          onClick={() => mark(row.id, status)}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${active ? STATUS_STYLES[status] : 'border-slate-800 text-slate-600'}`}
                        >
                          {status[0]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
