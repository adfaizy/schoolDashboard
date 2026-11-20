import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, ChevronRight, KeyRound, RefreshCw, School, Search, ShieldCheck, Trash2, Users, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type AdminSchool = {
  id: string
  email: string
  name: string
  principal: string
  students: number
  createdAt?: string
}

type Notice = { kind: 'success' | 'error'; text: string } | null

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
  const [notice, setNotice] = useState<Notice>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminSchool | null>(null)
  const [busy, setBusy] = useState(false)
  const [controlsAvailable, setControlsAvailable] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) {
      setNotice({ kind: 'error', text: 'Supabase is not configured.' })
      setLoading(false)
      return
    }
    setLoading(true)
    setNotice(null)
    try {
      const { data, error } = await supabase.rpc('admin_list_school_users')
      if (!error && Array.isArray(data)) {
        setControlsAvailable(true)
        setSchools((data as any[]).map((row) => ({
          id: String(row.id),
          email: String(row.email ?? ''),
          name: row.school_name || row.full_name || row.email || 'Unnamed school',
          principal: row.full_name || 'Principal',
          students: Number(row.students ?? 0),
          createdAt: row.created_at,
        })))
        return
      }

      // Fallback for installs that have not installed the latest schema SQL yet.
      setControlsAvailable(false)
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
        email: '',
        name: names.get(p.id) || p.full_name || 'Unnamed school',
        principal: p.full_name || 'Principal',
        students: counts.get(p.id) ?? 0,
      })))
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load schools.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function resetPassword(school: AdminSchool) {
    if (!supabase || !school.email) {
      setNotice({ kind: 'error', text: 'Run supabase/admin-controls.sql to see user emails, then refresh.' })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(school.email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setNotice({ kind: 'success', text: `Password reset email sent to ${school.email}.` })
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not send reset email.' })
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!supabase || !deleteTarget) return
    setBusy(true)
    setNotice(null)
    try {
      const { error } = await supabase.rpc('admin_delete_school_user', { target: deleteTarget.id })
      if (error) throw error
      setNotice({ kind: 'success', text: `${deleteTarget.name} was deleted.` })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not delete this account.' })
    } finally {
      setBusy(false)
    }
  }

  const filtered = schools.filter((s) =>
    `${s.name} ${s.principal} ${s.email}`.toLowerCase().includes(query.trim().toLowerCase()),
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
          Schools sign themselves up and sign in without approval. As admin you can open any school,
          send a password reset, or delete the account and all of its data.
        </p>
      </div>

      {!controlsAvailable && (
        <div className="relative mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] text-amber-300 leading-relaxed">
          Account controls are not installed yet. Run <span className="font-bold">supabase/admin-controls.sql</span> in the Supabase SQL Editor, then refresh.
        </div>
      )}

      <div className="relative mt-4 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
        <Search size={15} className="text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search schools or emails"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {notice && (
        <div className={`relative mt-4 rounded-xl border p-3 text-[11px] leading-relaxed ${
          notice.kind === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        }`}>
          {notice.text}
        </div>
      )}

      <div className="relative mt-4 flex flex-col gap-2.5">
        {loading && <div className="text-center text-xs text-slate-500 py-8">Loading schools…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10">
            <School size={30} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-300">No schools yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Accounts appear here as soon as a school signs up.</p>
          </div>
        )}
        {!loading && filtered.map((s) => (
          <div key={s.id} className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenSchool(s.id, s.name)}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/20 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-sm">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{s.email || s.principal}</p>
                </div>
                <ChevronRight size={17} className="text-slate-600 shrink-0" />
              </button>
              <button
                onClick={() => void resetPassword(s)}
                disabled={busy || !s.email}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 disabled:opacity-40"
                aria-label={`Reset password for ${s.name}`}
                title="Send password reset email"
              >
                <KeyRound size={14} />
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
                disabled={busy}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-40"
                aria-label={`Delete ${s.name}`}
                title="Delete school account"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Users size={12} /> {s.students} student{s.students === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#cbd5e1]/80 backdrop-blur-sm p-6 fade-in-up">
          <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-100">Delete {deleteTarget.name}?</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The login and every record owned by this school will be permanently removed.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-500 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
            <button
              onClick={() => setDeleteTarget(null)}
              className="mt-3 text-slate-500 hover:text-slate-900"
              aria-label="Close"
            >
              <X size={16} className="mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
