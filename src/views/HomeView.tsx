import {
  AlertCircle, Bell, CalendarDays, CheckCircle2, Clock,
  CreditCard, FileText, GraduationCap, Plus, Settings, Users,
} from 'lucide-react'
import { COLORS, DEFAULT_AVATAR, Icon, colorFor } from '../lib/styles'
import type { EventItem } from '../lib/types'
import { AddButton, EmptyState, RowActions, avatarSrc, type ViewProps } from './shared'

export function HomeView({
  controller, onEdit, onDelete, onNotify, onTabChange,
}: ViewProps & { onTabChange: (tab: string) => void }) {
  const { data } = controller
  const name = data.profile?.full_name ?? 'Principal Sarah'
  const attendance = data.students.length
    ? Math.round(data.students.reduce((sum, s) => sum + s.attendance, 0) / data.students.length)
    : 0

  const stats = [
    { title: 'Total Students', value: String(data.students.length), icon: <Users size={22} />, color: COLORS.cyan },
    { title: 'Total Teachers', value: String(data.settings?.total_teachers ?? 84), icon: <GraduationCap size={22} />, color: COLORS.purple },
    { title: "Today's Attendance", value: data.students.length ? `${attendance}%` : '—', icon: <CheckCircle2 size={22} />, color: COLORS.emerald },
    { title: 'Pending Fees', value: data.settings?.pending_fees ?? '$12.5k', icon: <CreditCard size={22} />, color: COLORS.rose },
  ]

  const quickActions = [
    { name: 'Add User', icon: <Plus size={24} />, color: COLORS.cyan, action: () => onEdit({ kind: 'student' }) },
    { name: 'Attendance', icon: <CheckCircle2 size={24} />, color: COLORS.emerald, action: () => onNotify(`Average attendance: ${attendance}%`, 'success') },
    { name: 'Timetable', icon: <CalendarDays size={24} />, color: COLORS.purple, action: () => onTabChange('academics') },
    { name: 'Exams', icon: <FileText size={24} />, color: COLORS.amber, action: () => onEdit({ kind: 'event' }) },
    { name: 'Notices', icon: <AlertCircle size={24} />, color: COLORS.rose, action: () => onEdit({ kind: 'event' }) },
  ]

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-6 flex justify-between items-center sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={avatarSrc(data.profile?.avatar_url ?? DEFAULT_AVATAR, name)}
              alt={name}
              className="w-12 h-12 rounded-full border-[2px] border-cyan-500 p-0.5 object-cover"
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">Welcome back</p>
            <h2 className="text-lg font-bold text-slate-100">{name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit({ kind: 'settings' })}
            className="p-2.5 bg-slate-900 rounded-full border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
            aria-label="Edit overview numbers"
          >
            <Settings size={19} />
          </button>
          <button
            onClick={() => onEdit({ kind: 'event' })}
            className="relative p-2.5 bg-slate-900 rounded-full border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
            aria-label="Add notice"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-slate-900 rounded-full" />
          </button>
        </div>
      </header>

      <section className="px-6 mt-2">
        <div className="grid grid-cols-2 gap-3.5">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/60 relative overflow-hidden">
              <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.color.bg} rounded-full blur-2xl opacity-60`} />
              <div className={`w-10 h-10 rounded-xl ${stat.color.bg} border ${stat.color.border} ${stat.color.text} flex items-center justify-center mb-4 relative z-10`}>
                {stat.icon}
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight relative z-10">{stat.value}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1 relative z-10">{stat.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="px-6 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h2>
        </div>
        <div className="px-6 flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {quickActions.map((action) => (
            <button key={action.name} onClick={action.action} className="flex flex-col items-center gap-2.5 min-w-[72px] active:scale-95 transition-transform">
              <span className={`w-16 h-16 rounded-2xl ${action.color.bg} ${action.color.text} border ${action.color.border} flex items-center justify-center shadow-lg`}>
                {action.icon}
              </span>
              <span className="text-[10px] font-semibold text-slate-300 tracking-wide">{action.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 mt-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming & Activity</h2>
          <AddButton onClick={() => onEdit({ kind: 'event' })} label="Add" />
        </div>

        {data.events.length === 0 ? (
          <EmptyState message="No events yet. Add exams, meetings and notices to see them here." onAdd={() => onEdit({ kind: 'event' })} />
        ) : (
          <div className="flex flex-col gap-3">
            {data.events.map((event: EventItem) => {
              const accent = colorFor(event.accent)
              return (
                <div key={event.id} className={`bg-slate-900/60 p-4 rounded-2xl border border-slate-800 border-l-4 ${accent.accent} flex items-center gap-3`}>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/50 shrink-0">
                    <Icon name={event.icon} size={18} className={accent.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{event.type}</p>
                    <h4 className="text-sm font-semibold text-slate-100 truncate">{event.title}</h4>
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-xs">{event.time || 'No time set'}</span>
                    </div>
                  </div>
                  <RowActions
                    onEdit={() => onEdit({ kind: 'event', row: event })}
                    onDelete={() => onDelete({ table: 'events', id: event.id, label: event.title })}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
