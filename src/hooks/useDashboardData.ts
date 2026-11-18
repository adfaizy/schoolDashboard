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

/** Single shared row for the profile/settings tables when Supabase is connected. */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Something went wrong.'
  if (raw.includes('PGRST205') || raw.toLowerCase().includes('could not find the table')) {
    return 'Supabase tables are missing. Run schema-noauth.sql in your Supabase SQL Editor, then reopen the app.'
  }
  if (raw.includes('PGRST301') || raw.toLowerCase().includes('row level security')) {
    return 'Supabase permissions are blocking access. Re-run schema-noauth.sql in your SQL Editor.'
  }
  return raw
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(() => (isConfigured ? {
    students: [], schedule: [], messages: [], events: [], profile: null, settings: null,
  } : loadLocal()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef(data)

  dataRef.current = data

  const refresh = useCallback(async () => {
    if (!isConfigured || !supabase) {
      setData(loadLocal())
      return
    }
    setLoading(true)
    setError(null)
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

      setData({
        students: (students.data ?? []) as DashboardData['students'],
        schedule: (schedule.data ?? []) as DashboardData['schedule'],
        messages: (messages.data ?? []) as DashboardData['messages'],
        events: (events.data ?? []) as DashboardData['events'],
        profile: (profile.data ?? null) as DashboardData['profile'],
        settings: (settings.data ?? null) as DashboardData['settings'],
      })
    } catch (e) {
      setError(errorMessage(e))
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

  async function saveRecord(table: TableName, row: Record<string, unknown>): Promise<void> {
    if (isConfigured && supabase) {
      const payload = { ...row }
      if (!payload.id) delete payload.id
      delete payload.created_at
      const { error: e } = await supabase.from(table).upsert(payload)
      if (e) throw e
      await refresh()
      return
    }

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
    if (isConfigured && supabase) {
      const { error: e } = await supabase.from(table).delete().eq('id', id)
      if (e) throw e
      await refresh()
      return
    }

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
    if (isConfigured && supabase) {
      const { error: e } = await supabase.from('profiles').upsert({
        id: SINGLETON_ID,
        ...row,
        updated_at: new Date().toISOString(),
      })
      if (e) throw e
      await refresh()
      return
    }
    commitLocal({
      ...dataRef.current,
      profile: { id: 'local-profile', ...row, updated_at: new Date().toISOString() },
    })
  }

  async function saveSettings(row: { total_teachers: number; pending_fees: string }): Promise<void> {
    if (isConfigured && supabase) {
      const { error: e } = await supabase.from('settings').upsert({
        id: SINGLETON_ID,
        ...row,
        updated_at: new Date().toISOString(),
      })
      if (e) throw e
      await refresh()
      return
    }
    commitLocal({
      ...dataRef.current,
      settings: { id: 'local-settings', ...row, updated_at: new Date().toISOString() },
    })
  }

  return {
    isRemote: isConfigured,
    loading, error, data, refresh,
    saveRecord, deleteRecord, saveProfile, saveSettings,
  }
}

export type DashboardController = ReturnType<typeof useDashboardData>
