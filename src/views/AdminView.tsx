import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, RefreshCw, School, Search, ShieldCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AdminSchool = {
  id: string
  name: string
  principal: string
  students: number
  role_title: string
}

export function AdminView({
  adminEmail,
  onOpenSchool,
}: {
  adminEmail?: string
  onOpenSchool: (userId: string, name: string) => void
}) {
  const [schools, setSchools] = useState<AdminSchool[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [profiles, settingsRes, studentsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role_title').eq('role', 'school').order('full_name'),
        supabase.from('settings').select('user_id, school_name'),
        supabase.from('students').select('user_id'),
      ])
      const failed = [profiles, settingsRes, studentsRes].find((r) => r.error)
      if (failed?.error) throw failed.error

      const names = new Map((settingsRes.data ?? []).map((s: any) => [s.user_id, s.school_name]))
      const counts = new Map<string, number>()
      for (const s of studentsRes.data ?? []) {
        counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1)
      }
      setSchools((profiles.data ?? []).map((p: any) => ({
        id: p.id,
        name: names.get(p.id) || p.full_name || 'Unnamed school',
        principal: p.full_name || 'Principal',
        role_title: p.role_title || 'Head of Administration',
        students: counts.get(p.id) ?? 0,
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load schools.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = schools.filter((s) =>
    `${s.name} ${s.principal}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="px-5 pt-8 pb-4 relative overflow-hidden min-h-full">
      <div className="absolute -top-20 -right-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-wide">Admin Console</h1>
            <p className="text-[10px] text-slate-500">{adminEmail || 'Administrator'}</p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400"
          title="Refresh schools"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative mt-5 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-3 flex items-start gap-2.5">
        <ShieldCheck size={15} className="text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          You can view and manage every school. Select one to open its dashboard; changes you make
          are saved under that school's account.
        </p>
      </div>

      <div className="relative mt-4 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
        <Search size={15} className="text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search schools"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {error && (
        <div className="relative mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      <div className="relative mt-4 flex flex-col gap-2.5">
        {loading && <div className="text-center text-xs text-slate-500 py-8">Loading schools…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10">
            <School size={30} className="mx-auto text-slate-700 mb-3" />
            <p className="text-sm text-slate-300">No schools yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Schools appear here after an account signs up.</p>
          </div>
        )}
        {!loading && filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenSchool(s.id, s.name)}
            className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-cyan-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-sm">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">{s.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{s.principal} · {s.role_title}</p>
              </div>
              <ChevronRight size={17} className="text-slate-600" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Users size={12} /> {s.students} student{s.students === 1 ? '' : 's'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
