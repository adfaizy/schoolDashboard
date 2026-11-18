import { useState, type FormEvent } from 'react'
import { AlertCircle, GraduationCap, Loader2, Lock, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthScreen({ onConfigure }: { onConfigure: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
      } else {
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) throw e
        setNotice('Account created. If email confirmation is on, check your inbox, then sign in.')
        setMode('signin')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to continue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-7 bg-slate-950 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
          <GraduationCap size={30} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-wide">School Dashboard</h1>
        <p className="text-sm text-slate-400 mt-2">
          {mode === 'signin' ? 'Sign in to manage your school.' : 'Create your administrator account.'}
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@school.edu"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null) }}
          className="mt-5 w-full text-center text-xs text-cyan-400 font-medium"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
        <button onClick={onConfigure} className="mt-4 w-full text-center text-[11px] text-slate-500">
          Change Supabase connection
        </button>
      </div>
    </div>
  )
}
