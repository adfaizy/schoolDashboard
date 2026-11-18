import { BarChart3, ClipboardCheck, Smartphone } from 'lucide-react'
import { MODULES } from '../lib/modules'
import type { ViewProps } from './shared'

export function ManageView({ controller, onOpen }: ViewProps & {
  onOpen: (moduleId: string) => void
}) {
  const { data } = controller
  const today = new Date().toISOString().slice(0, 10)
  const markedToday = data.attendance.filter((a) => a.date_str === today).length

  const cards = [
    ...MODULES.map((m) => {
      const count = (() => {
        switch (m.id) {
          case 'classes': return data.classes.length
          case 'staff': return data.staff.length
          case 'exams': return data.examMarks.length
          case 'fees': return data.fees.length
          case 'library': return data.books.length
          case 'transport': return data.transportPassengers.length
          case 'hostel': return data.hostelAssignments.length
          default: return 0
        }
      })()
      return { id: m.id, label: m.label, tagline: m.tagline, icon: m.icon, accent: m.accent, count }
    }),
    { id: 'attendance', label: 'Attendance', tagline: 'Mark present / absent / late', icon: ClipboardCheck, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', count: markedToday },
    { id: 'reports', label: 'Reports', tagline: 'Fees, books, attendance summary', icon: BarChart3, accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', count: null as number | null },
  ]

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
