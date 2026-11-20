import { ArrowLeft } from 'lucide-react'
import {
  classLabel, classSubjects, marksPercentage, money, pendingFees, sortedClasses,
  summarizeAttendance, teachingStaff, todayKey,
} from '../lib/school'
import { COLORS } from '../lib/styles'
import type { ViewProps } from './shared'

export function ReportsView({ controller, onBack }: ViewProps & {
  onBack: () => void
}) {
  const { data } = controller
  const today = todayKey()
  const feesTotal = data.fees.reduce((sum, fee) => sum + Number(fee.amount_paid || 0), 0)
  const pending = pendingFees(data)
  const issuedBooks = data.books.filter((book) => book.status === 'issued').length
  const overall = summarizeAttendance(data.attendance.filter((row) => row.entity_type === 'students'))
  const todayAttendance = summarizeAttendance(
    data.attendance.filter((row) => row.date_str === today && row.entity_type === 'students'),
  )

  const stats = [
    { title: 'Students', value: String(data.students.length), color: COLORS.cyan },
    { title: 'Teaching Staff', value: String(teachingStaff(data).length), color: COLORS.purple },
    { title: 'Classes', value: String(data.classes.length), color: COLORS.emerald },
    { title: 'Overall Attendance', value: overall.rate === null ? '—' : `${overall.rate}%`, color: COLORS.amber },
    { title: 'Present Today', value: todayAttendance.rate === null ? '—' : `${todayAttendance.rate}%`, color: COLORS.emerald },
    { title: 'Fees Collected', value: money(feesTotal), color: COLORS.rose },
    { title: 'Fees Pending', value: pending ? money(pending) : '—', color: COLORS.rose },
    { title: 'Books Issued', value: String(issuedBooks), color: COLORS.amber },
  ]

  const recentFees = [...data.fees]
    .sort((a, b) => String(b.payment_date ?? '').localeCompare(String(a.payment_date ?? '')))
    .slice(0, 5)

  const classes = sortedClasses(data.classes)

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-slate-900" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-100 flex-1 tracking-wide">Reports</h1>
      </header>

      <div className="px-6 grid grid-cols-2 gap-3.5 mt-2">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.color.bg} rounded-full blur-2xl opacity-60`} />
            <h3 className="text-xl font-black text-slate-900 tracking-tight relative z-10 truncate">{stat.value}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 relative z-10">{stat.title}</p>
          </div>
        ))}
      </div>

      <section className="px-6 mt-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Class coverage</h2>
        <div className="flex flex-col gap-2">
          {classes.length === 0 ? (
            <p className="text-xs text-slate-500">No classes yet.</p>
          ) : classes.map((klass) => {
            const students = data.students.filter((student) => student.class_id === klass.id)
            const subjects = classSubjects(data, klass.id)
            const filled = data.schedule.filter((item) => item.class_id === klass.id && item.period_no).length
            const results = students
              .map((student) => marksPercentage(data.examMarks.filter((mark) => mark.student_id === student.id)))
              .filter((value): value is number => value !== null)
            const average = results.length
              ? Math.round((results.reduce((sum, value) => sum + value, 0) / results.length) * 10) / 10
              : null
            return (
              <div key={klass.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-100">{classLabel(klass)}</p>
                  <p className="text-[10px] text-slate-500">{subjects.length} subjects</p>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                  <span>{students.length} student{students.length === 1 ? '' : 's'}</span>
                  <span>·</span>
                  <span>{filled}/8 periods</span>
                  <span>·</span>
                  <span>Result avg {average === null ? '—' : `${average}%`}</span>
                </div>
                {filled < 8 && (
                  <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-cyan-500/60" style={{ width: `${(filled / 8) * 100}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-6 mt-6 mb-8">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent fee payments</h2>
        <div className="flex flex-col gap-2">
          {recentFees.length === 0 ? (
            <p className="text-xs text-slate-500">No payments recorded yet.</p>
          ) : recentFees.map((fee) => {
            const student = data.students.find((row) => row.id === fee.student_id)
            const klass = student?.class_id ? data.classes.find((row) => row.id === student.class_id) : undefined
            return (
              <div key={fee.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-100">{student?.name ?? 'Unknown student'}</p>
                  <p className="text-[10px] text-slate-500">
                    {klass ? `${classLabel(klass)} · ` : ''}{fee.month_year} · {String(fee.payment_date ?? '').slice(0, 10)}
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-400">{money(Number(fee.amount_paid))}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
