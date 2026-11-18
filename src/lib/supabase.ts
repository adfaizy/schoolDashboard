import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SupabaseConfig = { url: string; key: string }

const STORAGE_KEY = 'schooldashboard.supabase.config'

function isPlaceholder(value?: string): boolean {
  if (!value) return true
  const v = value.trim()
  return v === '' || v.includes('YOUR_PROJECT') || v.includes('YOUR_ANON_KEY') || v.includes('PASTE_')
}

function readStored(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SupabaseConfig
    if (parsed?.url && parsed?.key && !isPlaceholder(parsed.url) && !isPlaceholder(parsed.key)) {
      return { url: parsed.url.trim(), key: parsed.key.trim() }
    }
  } catch {
    // Corrupt or unavailable storage — fall back to build-time env values.
  }
  return null
}

function readEnv(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!isPlaceholder(url) && !isPlaceholder(key)) {
    return { url: url!.trim(), key: key!.trim() }
  }
  return null
}

// Build-time config is authoritative so a stale value entered on a device cannot
// silently override the project this APK was built for.
export const supabaseConfig: SupabaseConfig | null = readEnv() ?? readStored()
export const isConfigured = supabaseConfig !== null

export const supabase: SupabaseClient | null = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

export function saveSupabaseConfig(url: string, key: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}
