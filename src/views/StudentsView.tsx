import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import {
  classLabel, sortedClasses, statusForAttendance, studentAttendance, studentClass,
  studentClassLabel,
} from '../lib/school'
import { attendanceColor } from '../lib/styles'
import type { Student } from '../lib/types'
import { AddButton, EmptyState, RowActions, avatarSrc, type ViewProps } from './shared'

function statusClass(status: string): string {
  switch (status) {
    case 'Excellent': return 'text-emerald-400'
    case 'Good': return 'text-cyan-400'
    case 'Warning': return 'text-amber-400'
    case 'Critical': return 'text-rose-400'
    default: return 'text-slate-500'
  }
}

export function StudentsView({ controller, onEdit, onDelete, onTransfer, onOpenModule }: ViewProps) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const { data } = controller
  const classes = sortedClasses(data.classes)
  const term = search.trim().toLowerCase()

  const students = data.students.filter((student) => {
    if (classFilter && student.class_id !== classFilter) return false
    if (!term) return true
    const klass = studentClass(data, student)
    return [student.name, student.roll_no ?? '', student.father_name ?? '', klass ? classLabel(klass) : '']
      .some((value) => String(value).toLowerCase().includes(term))
  })

  function addStudent() {
    if (classes.length === 0) {
      onOpenModule('classes')
      return
    }
    onEdit({ kind: 'student' })
  }

  function countFor(classId: string): number {
    return data.students.filter((student) => student.class_id === classId).length
  }

  function renderStudent(student: Student) {
    const rate = studentAttendance(data, student.id)
    const status = statusForAttendance(rate)
    return (
      <div
        key={student.id}
        onClick={() => onEdit({ kind: 'student', row: student })}
        className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-cyan-500/40 active:scale-[0.99] transition-all"
      >
        <img src={avatarSrc(student.avatar_url, student.name)} alt={student.name} className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-100 truncate">{student.name}</h4>
          <p className="text-xs text-slate-400 truncate">
            {studentClassLabel(data, student)}
            {student.roll_no ? ` · Roll ${student.roll_no}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xs font-bold ${attendanceColor(rate)}`}>{rate === null ? '—' : `${rate}%`}</div>
          <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${statusClass(status)}`}>{status}</div>
        </div>
        <RowActions
          onTransfer={() => onTransfer({ kind: 'student', id: student.id, name: student.name, currentClassId: student.class_id })}
          onEdit={() => onEdit({ kind: 'student', row: student })}
          onDelete={() => onDelete({ table: 'students', id: student.id, label: student.name })}
        />
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Students</h1>
          <AddButton onClick={addStudent} label="Add" />
        </div>
        <div className="mt-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, roll or class..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        {classes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setClassFilter('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${classFilter === '' ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
            >
              All · {data.students.length}
            </button>
            {classes.map((klass) => (
              <button
                key={klass.id}
                onClick={() => setClassFilter(klass.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${classFilter === klass.id ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
              >
                {classLabel(klass)} · {countFor(klass.id)}
              </button>
            ))}
          </div>
        )}
      </header>

      {classes.length === 0 && (
        <div className="mx-6 mb-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-cyan-300 mb-1">
            <Users size={16} />
            <p className="text-xs font-bold">Start with classes</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every student belongs to a class, and the class carries the subject list used by the timetable and result cards.
          </p>
          <button onClick={() => onOpenModule('classes')} className="mt-3 text-[11px] font-bold text-cyan-400">
            + Add your first class
          </button>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          message={term || classFilter ? 'No students match this filter.' : 'No students yet. Add one to get started.'}
          onAdd={term || classFilter ? undefined : addStudent}
        />
      ) : (
        <div className="px-6 flex flex-col gap-3 mt-2">
          {students.map(renderStudent)}
        </div>
      )}
    </div>
  )
}
