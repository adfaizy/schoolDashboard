import { useState } from 'react'
import { AlertCircle, ArrowRight, Database, Smartphone } from 'lucide-react'
import { clearSupabaseConfig, saveSupabaseConfig } from '../lib/supabase'

export function SetupScreen({ onCancel }: { onCancel: () => void }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  function save() {
    const cleanUrl = url.trim().replace(/\/$/, '')
    const cleanKey = key.trim()
    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      setError('Enter your Supabase Project URL (https://xxxx.supabase.co).')
      return
    }
    if (cleanKey.length < 30) {
      setError('Enter the anon/public key from Supabase → Project Settings → API.')
      return
    }
    saveSupabaseConfig(cleanUrl, cleanKey)
    window.location.reload()
  }

  function useLocal() {
    clearSupabaseConfig()
    window.location.reload()
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-7 bg-slate-950 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
          <Database size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Connect Supabase</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Optional — without it the app stores data on this device and works offline.
          To sync to the cloud, run <span className="text-slate-300">supabase/schema-noauth.sql</span>
          in your SQL Editor, then paste your URL and anon key below. No login needed.
        </p>

        <div className="mt-7 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Project URL</label>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              placeholder="https://abcdefgh.supabase.co"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Anon / public key</label>
            <textarea
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(null) }}
              rows={3}
              placeholder="eyJhbGciOi..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={save}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2"
          >
            Save & Restart <ArrowRight size={16} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300"
            >
              Back
            </button>
            <button
              onClick={useLocal}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5"
            >
              <Smartphone size={14} /> Use locally
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
