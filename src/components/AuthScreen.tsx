import { useRef, useState } from 'react'
import { AlertCircle, LogIn, UserPlus, Database, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'adfaizy1976@gmail.com'

export function AuthScreen({ onShowSetup }: { onShowSetup?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function fillAdmin() {
    setMode('login')
    setEmail(ADMIN_EMAIL)
    setError(null)
    setNotice('Admin email filled. Enter the admin password to continue.')
    window.setTimeout(() => passwordRef.current?.focus(), 0)
  }

  async function submit() {
    if (!supabase) return
    setError(null)
    setNotice(null)
    const e = email.trim()
    if (!e || !password) {
      setError('Email and password are required.')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: e, password })
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: e,
          password,
          options: { data: { full_name: fullName.trim() || 'School Principal' } },
        })
        if (err) throw err
        setNotice('Account created. If email confirmation is enabled, check your inbox. Otherwise you can sign in now.')
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-7 bg-slate-950 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
          {mode === 'login' ? <LogIn size={28} /> : <UserPlus size={28} />}
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-wide">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          {mode === 'login'
            ? 'Sign in to manage your school.'
            : 'Sign up to set up your school dashboard.'}
        </p>

        <div className="mt-7 flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Full name</label>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(null) }}
                placeholder="Principal name"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              type="email"
              autoComplete="email"
              placeholder="you@school.com"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <input
              ref={passwordRef}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
            />
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
            onClick={submit}
            disabled={busy}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl py-3 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>

          <button
            onClick={fillAdmin}
            className="w-full py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-cyan-500/20 active:scale-[0.98] transition-all"
          >
            <ShieldCheck size={15} /> Admin Login
          </button>

          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setNotice(null); setPassword('') }}
            className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-cyan-500/40 hover:text-cyan-300"
          >
            <UserPlus size={14} />
            {mode === 'login' ? 'Create school account (Sign up)' : 'I already have an account (Sign in)'}
          </button>

          {mode === 'login' && (
            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              Administrator account: {ADMIN_EMAIL}
            </p>
          )}

          {onShowSetup && (
            <button
              onClick={onShowSetup}
              className="mt-2 text-[10px] text-slate-500 flex items-center justify-center gap-1.5"
            >
              <Database size={12} /> Change Supabase connection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
