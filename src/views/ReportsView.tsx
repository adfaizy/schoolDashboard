import { ArrowLeft } from 'lucide-react'
import { COLORS } from '../lib/styles'
import type { ViewProps } from './shared'

export function ReportsView({ controller, onBack }: ViewProps & {
  onBack: () => void
}) {
  const { data } = controller
  const today = new Date().toISOString().slice(0, 10)
  const feesTotal = data.fees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0)
  const issuedBooks = data.books.filter((b) => b.status === 'issued').length
  const todayAttendance = data.attendance.filter((a) => a.date_str === today && a.entity_type === 'students')
  const presentToday = todayAttendance.filter((a) => a.status === 'present').length
  const avgAttendance = data.students.length
    ? Math.round(data.students.reduce((sum, s) => sum + (s.attendance || 0), 0) / data.students.length)
    : 0

  const stats = [
    { title: 'Students', value: String(data.students.length), color: COLORS.cyan },
    { title: 'Staff & Teachers', value: String(data.staff.length), color: COLORS.purple },
    { title: 'Classes', value: String(data.classes.length), color: COLORS.emerald },
    { title: 'Avg Attendance', value: data.students.length ? `${avgAttendance}%` : '—', color: COLORS.amber },
    { title: 'Present Today', value: todayAttendance.length ? String(presentToday) : '—', color: COLORS.emerald },
    { title: 'Fees Collected', value: `$${feesTotal.toLocaleString()}`, color: COLORS.rose },
    { title: 'Books Issued', value: String(issuedBooks), color: COLORS.amber },
    { title: 'Unread Messages', value: String(data.messages.reduce((sum, m) => sum + (m.unread || 0), 0)), color: COLORS.purple },
  ]

  const recentFees = [...data.fees]
    .sort((a, b) => String(b.payment_date ?? '').localeCompare(String(a.payment_date ?? '')))
    .slice(0, 5)

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-100 flex-1 tracking-wide">Reports</h1>
      </header>

      <div className="px-6 grid grid-cols-2 gap-3.5 mt-2">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.color.bg} rounded-full blur-2xl opacity-60`} />
            <h3 className="text-2xl font-black text-white tracking-tight relative z-10">{stat.value}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 relative z-10">{stat.title}</p>
          </div>
        ))}
      </div>

      <section className="px-6 mt-6 mb-8">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent fee payments</h2>
        <div className="flex flex-col gap-2">
          {recentFees.length === 0 ? (
            <p className="text-xs text-slate-500">No payments recorded yet.</p>
          ) : recentFees.map((fee) => {
            const student = data.students.find((s) => s.id === fee.student_id)
            return (
              <div key={fee.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-100">{student?.name ?? 'Unknown student'}</p>
                  <p className="text-[10px] text-slate-500">{fee.month_year} · {String(fee.payment_date ?? '').slice(0, 10)}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">${Number(fee.amount_paid).toLocaleString()}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
