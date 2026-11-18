import { useState } from 'react'
import { Search } from 'lucide-react'
import { attendanceColor } from '../lib/styles'
import { AddButton, EmptyState, RowActions, avatarSrc, type ViewProps } from './shared'

export function StudentsView({ controller, onEdit, onDelete }: ViewProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const students = controller.data.students.filter(
    (student) => !term || student.name.toLowerCase().includes(term) || student.grade.toLowerCase().includes(term),
  )

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Students</h1>
          <AddButton onClick={() => onEdit({ kind: 'student' })} label="Add" />
        </div>
        <div className="mt-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </header>

      {students.length === 0 ? (
        <EmptyState
          message={term ? 'No students match your search.' : 'No students yet. Add one to get started.'}
          onAdd={term ? undefined : () => onEdit({ kind: 'student' })}
        />
      ) : (
        <div className="px-6 flex flex-col gap-3 mt-2">
          {students.map((student) => (
            <div
              key={student.id}
              onClick={() => onEdit({ kind: 'student', row: student })}
              className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-cyan-500/40 active:scale-[0.99] transition-all"
            >
              <img src={avatarSrc(student.avatar_url, student.name)} alt={student.name} className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-100 truncate">{student.name}</h4>
                <p className="text-xs text-slate-400 truncate">{student.grade}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-bold ${attendanceColor(student.attendance)}`}>{student.attendance}%</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{student.status}</div>
              </div>
              <RowActions
                onEdit={() => onEdit({ kind: 'student', row: student })}
                onDelete={() => onDelete({ table: 'students', id: student.id, label: student.name })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
