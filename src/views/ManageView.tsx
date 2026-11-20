import {
  BarChart3, ClipboardCheck, GraduationCap, School, Smartphone,
} from 'lucide-react'
import { MODULES } from '../lib/modules'
import { classSubjects, todayKey } from '../lib/school'
import type { ViewProps } from './shared'

export function ManageView({ controller, onOpen }: ViewProps & {
  onOpen: (moduleId: string) => void
}) {
  const { data } = controller
  const today = todayKey()
  const markedToday = data.attendance.filter((a) => a.date_str === today).length
  const unassigned = data.students.filter((student) => !student.class_id).length
  const emptyClasses = data.classes.filter((klass) => classSubjects(data, klass.id).length === 0).length
  const slots = data.classes.length * 8
  const filled = data.schedule.filter((item) => item.class_id && item.period_no).length

  const moduleCards = MODULES.map((module) => {
    const count = (() => {
      switch (module.id) {
        case 'staff': return data.staff.length
        case 'fees': return data.fees.length
        case 'library': return data.books.length
        case 'transport': return data.transportPassengers.length
        case 'hostel': return data.hostelAssignments.length
        default: return 0
      }
    })()
    return {
      id: module.id, label: module.label, tagline: module.tagline,
      icon: module.icon, accent: module.accent, count,
    }
  })

  const cards = [
    {
      id: 'classes', label: 'Classes & Subjects', tagline: 'Roster plus each class subject list',
      icon: School, accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', count: data.classes.length,
    },
    ...moduleCards,
    {
      id: 'exams', label: 'Exams & Results', tagline: 'Marks, percentages and result cards',
      icon: GraduationCap, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30', count: data.examMarks.length,
    },
    {
      id: 'attendance', label: 'Attendance', tagline: 'Mark present / absent / late',
      icon: ClipboardCheck, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', count: markedToday,
    },
    {
      id: 'reports', label: 'Reports', tagline: 'Fees, attendance and class coverage',
      icon: BarChart3, accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', count: null as number | null,
    },
  ]

  const issues = [
    unassigned ? `${unassigned} student${unassigned === 1 ? '' : 's'} without a class` : '',
    emptyClasses ? `${emptyClasses} class${emptyClasses === 1 ? '' : 'es'} without subjects` : '',
    slots && filled < slots ? `${slots - filled} timetable periods still empty` : '',
  ].filter(Boolean)

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Smartphone size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-wide">School Manager</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">All modules · shared with the desktop app</p>
          </div>
        </div>
      </header>

      {issues.length > 0 && (
        <div className="mx-6 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">Needs attention</p>
          {issues.map((issue) => (
            <p key={issue} className="text-[11px] text-amber-200/80 leading-relaxed">• {issue}</p>
          ))}
        </div>
      )}

      <div className="px-6 grid grid-cols-2 gap-3.5 pb-8">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onOpen(card.id)}
            className="text-left bg-slate-900/70 rounded-2xl border border-slate-800 p-4 flex flex-col gap-3 hover:border-cyan-500/40 active:scale-[0.98] transition-all"
          >
            <div className={`w-11 h-11 rounded-xl border ${card.accent} flex items-center justify-center`}>
              <card.icon size={20} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-100 leading-tight">{card.label}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{card.tagline}</p>
            </div>
            {card.count !== null && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {card.count} record{card.count === 1 ? '' : 's'}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
