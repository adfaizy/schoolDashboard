import { useCallback, useEffect, useRef, useState } from 'react'
import { isConfigured, supabase } from '../lib/supabase'
import { loadLocal, saveLocal } from '../lib/localData'
import type { DashboardData } from '../lib/types'

export type TableName = 'students' | 'schedule_items' | 'messages' | 'events'
type ListKey = 'students' | 'schedule' | 'messages' | 'events'

const TABLE_TO_KEY: Record<TableName, ListKey> = {
  students: 'students',
  schedule_items: 'schedule',
  messages: 'messages',
  events: 'events',
}

const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Something went wrong.'
  if (raw.includes('PGRST205') || raw.toLowerCase().includes('could not find the table')) {
    return 'Supabase tables are missing. Run schema-noauth.sql in your SQL Editor — using device storage for now.'
  }
  if (raw.includes('PGRST301') || raw.toLowerCase().includes('row level security')) {
    return 'Supabase permissions are blocking access — using device storage for now.'
  }
  return `${raw} (saved on device instead)`
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(() => loadLocal())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remoteOk, setRemoteOk] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!isConfigured || !supabase) {
      setData(loadLocal())
      return false
    }
    setLoading(true)
    try {
      const [students, schedule, messages, events, profile, settings] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('schedule_items').select('*').order('created_at', { ascending: true }),
        supabase.from('messages').select('*').order('created_at', { ascending: true }),
        supabase.from('events').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('id', SINGLETON_ID).maybeSingle(),
        supabase.from('settings').select('*').eq('id', SINGLETON_ID).maybeSingle(),
      ])
      const failed = [students, schedule, messages, events, profile, settings].find((r) => r.error)
      if (failed?.error) throw failed.error

      const next: DashboardData = {
        students: (students.data ?? []) as DashboardData['students'],
        schedule: (schedule.data ?? []) as DashboardData['schedule'],
        messages: (messages.data ?? []) as DashboardData['messages'],
        events: (events.data ?? []) as DashboardData['events'],
        profile: (profile.data ?? null) as DashboardData['profile'],
        settings: (settings.data ?? null) as DashboardData['settings'],
      }
      setData(next)
      saveLocal(next)
      setRemoteOk(true)
      setError(null)
      return true
    } catch (e) {
      setData(loadLocal())
      setRemoteOk(false)
      setError(errorMessage(e))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function commitLocal(next: DashboardData) {
    dataRef.current = next
    setData(next)
    saveLocal(next)
  }

  async function tryRemote(write: () => Promise<void>): Promise<boolean> {
    if (!isConfigured || !supabase || !remoteOk) return false
    try {
      await write()
      await refresh()
      return true
    } catch (e) {
      setRemoteOk(false)
      setError(errorMessage(e))
      return false
    }
  }

  async function saveRecord(table: TableName, row: Record<string, unknown>): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const payload = { ...row }
      if (!payload.id) delete payload.id
      delete payload.created_at
      const { error: e } = await supabase!.from(table).upsert(payload)
      if (e) throw e
    })
    if (didRemote) return

    const key = TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    const id = String(row.id ?? `local-${Date.now()}`)
    const record = { ...row, id, created_at: new Date().toISOString() }
    const exists = list.some((item) => item.id === id)
    const nextList = exists
      ? list.map((item) => (item.id === id ? { ...item, ...record } : item))
      : [...list, record]
    commitLocal({ ...current, [key]: nextList } as unknown as DashboardData)
  }

  async function deleteRecord(table: TableName, id: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from(table).delete().eq('id', id)
      if (e) throw e
    })
    if (didRemote) return

    const key = TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    commitLocal({
      ...current,
      [key]: list.filter((item) => item.id !== id),
    } as unknown as DashboardData)
  }

  async function saveProfile(row: {
    full_name: string; role_title: string; avatar_url: string | null
  }): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from('profiles').upsert({
        id: SINGLETON_ID, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      profile: { id: 'local-profile', ...row, updated_at: new Date().toISOString() },
    })
  }

  async function saveSettings(row: { total_teachers: number; pending_fees: string }): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from('settings').upsert({
        id: SINGLETON_ID, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      settings: { id: 'local-settings', ...row, updated_at: new Date().toISOString() },
    })
  }

  async function retryConnection(): Promise<boolean> {
    setError(null)
    setRemoteOk(true)
    const ok = await refresh()
    if (!ok) setRemoteOk(false)
    return ok
  }

  return {
    isRemote: isConfigured && remoteOk,
    usingLocal: !isConfigured || !remoteOk,
    loading, error, data, refresh, retryConnection,
    saveRecord, deleteRecord, saveProfile, saveSettings,
  }
}

export type DashboardController = ReturnType<typeof useDashboardData>
