import { useState } from 'react'
import { MapPin, User } from 'lucide-react'
import { colorFor } from '../lib/styles'
import { AddButton, EmptyState, RowActions, type ViewProps } from './shared'

export function AcademicsView({ controller, onEdit, onDelete }: ViewProps) {
  const [selectedDay, setSelectedDay] = useState('Today')
  const all = controller.data.schedule
  const days = Array.from(new Set(all.map((item) => item.day)))
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0]
  const items = all.filter((item) => item.day === activeDay)

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Academics</h1>
          <AddButton onClick={() => onEdit({ kind: 'schedule' })} label="Add" />
        </div>
        {days.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  day === activeDay
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </header>

      {all.length === 0 ? (
        <EmptyState message="No timetable entries yet. Add your first class to build the schedule." onAdd={() => onEdit({ kind: 'schedule' })} />
      ) : items.length === 0 ? (
        <EmptyState message={`Nothing scheduled for ${activeDay}. Add a class or pick another day.`} onAdd={() => onEdit({ kind: 'schedule' })} />
      ) : (
        <div className="px-6 mt-2 relative">
          <div className="absolute left-[39px] top-2 bottom-4 w-px bg-slate-800 z-0" />
          <div className="flex flex-col gap-6 relative z-10">
            {items.map((item) => {
              const accent = colorFor(item.color)
              const [time, period] = item.time.split(' ')
              return (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 pt-1 text-right shrink-0 bg-slate-950">
                    <span className="text-[10px] font-bold text-slate-300">{time}</span>
                    <span className="text-[9px] text-slate-500 block">{period ?? ''}</span>
                  </div>
                  <div
                    onClick={() => onEdit({ kind: 'schedule', row: item })}
                    className={`flex-1 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 border-l-4 ${accent.accent} shadow-lg cursor-pointer hover:border-slate-600 active:scale-[0.99] transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-100 mb-1.5">{item.subject}</h4>
                      <RowActions
                        onEdit={() => onEdit({ kind: 'schedule', row: item })}
                        onDelete={() => onDelete({ table: 'schedule_items', id: item.id, label: item.subject })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {item.teacher && <span className="flex items-center gap-1"><User size={12} /> {item.teacher}</span>}
                      {item.room && <span className="flex items-center gap-1"><MapPin size={12} /> {item.room}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
