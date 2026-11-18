import { useCallback, useEffect, useRef, useState } from 'react'
import { isConfigured, supabase } from '../lib/supabase'
import { loadLocal, saveLocal } from '../lib/localData'
import type { DashboardData } from '../lib/types'

export type TableName = 'students' | 'schedule_items' | 'messages' | 'events'
export type ModuleTable =
  | 'classes' | 'staff' | 'exam_marks' | 'fees' | 'library_books'
  | 'transport_routes' | 'transport_passengers' | 'hostel_rooms' | 'hostel_assignments'
type ListKey = 'students' | 'schedule' | 'messages' | 'events'
type ModuleListKey =
  | 'classes' | 'staff' | 'examMarks' | 'fees' | 'books'
  | 'routes' | 'transportPassengers' | 'hostelRooms' | 'hostelAssignments'

const TABLE_TO_KEY: Record<TableName, ListKey> = {
  students: 'students',
  schedule_items: 'schedule',
  messages: 'messages',
  events: 'events',
}

const MODULE_TABLE_TO_KEY: Record<ModuleTable, ModuleListKey> = {
  classes: 'classes',
  staff: 'staff',
  exam_marks: 'examMarks',
  fees: 'fees',
  library_books: 'books',
  transport_routes: 'routes',
  transport_passengers: 'transportPassengers',
  hostel_rooms: 'hostelRooms',
  hostel_assignments: 'hostelAssignments',
}

const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

function errorMessage(error: unknown): string {
  // Supabase/PostgREST errors are plain objects, not Error instances, so inspect their fields.
  let raw = ''
  let code = ''
  if (error instanceof Error) {
    raw = error.message
  } else if (error && typeof error === 'object') {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    raw = [e.message, e.details, e.hint].filter(Boolean).map(String).join(' — ')
    code = String(e.code ?? '')
  } else {
    raw = String(error ?? '')
  }

  const text = `${code} ${raw}`.toLowerCase()
  if (text.includes('pgrst205') || text.includes('could not find the table') || text.includes('42p01')) {
    return 'Supabase tables are missing — run schema-noauth.sql and schema-modules.sql in SQL Editor, then reopen the app. Saving on device for now.'
  }
  if (text.includes('pgrst301') || text.includes('row level security') || text.includes('permission denied') || text.includes('42501')) {
    return 'Supabase permissions are blocking access. Re-run the schema SQL in the SQL Editor. Data is saved on this device for now.'
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('timeout') || text.includes('offline')) {
    return 'Cannot reach Supabase right now. Data is saved on this device and will sync when you are online.'
  }
  if (!raw) return 'Could not reach Supabase. Data was saved on this device instead.'
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
      const [students, schedule, messages, events, profile, settings,
        classes, staff, attendance, examMarks, fees, books,
        routes, transportPassengers, hostelRooms, hostelAssignments] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('schedule_items').select('*').order('created_at', { ascending: true }),
        supabase.from('messages').select('*').order('created_at', { ascending: true }),
        supabase.from('events').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('id', SINGLETON_ID).maybeSingle(),
        supabase.from('settings').select('*').eq('id', SINGLETON_ID).maybeSingle(),
        supabase.from('classes').select('*').order('grade', { ascending: true }),
        supabase.from('staff').select('*').order('created_at', { ascending: true }),
        supabase.from('attendance').select('*'),
        supabase.from('exam_marks').select('*').order('created_at', { ascending: true }),
        supabase.from('fees').select('*').order('payment_date', { ascending: false }),
        supabase.from('library_books').select('*').order('created_at', { ascending: true }),
        supabase.from('transport_routes').select('*').order('created_at', { ascending: true }),
        supabase.from('transport_passengers').select('*'),
        supabase.from('hostel_rooms').select('*').order('room_no', { ascending: true }),
        supabase.from('hostel_assignments').select('*'),
      ])
      const failed = [
        students, schedule, messages, events, profile, settings,
        classes, staff, attendance, examMarks, fees, books, routes, transportPassengers, hostelRooms, hostelAssignments,
      ].find((r) => r.error)
      if (failed?.error) throw failed.error

      const next: DashboardData = {
        students: (students.data ?? []) as DashboardData['students'],
        schedule: (schedule.data ?? []) as DashboardData['schedule'],
        messages: (messages.data ?? []) as DashboardData['messages'],
        events: (events.data ?? []) as DashboardData['events'],
        profile: (profile.data ?? null) as DashboardData['profile'],
        settings: (settings.data ?? null) as DashboardData['settings'],
        classes: (classes.data ?? []) as DashboardData['classes'],
        staff: (staff.data ?? []) as DashboardData['staff'],
        attendance: (attendance.data ?? []) as DashboardData['attendance'],
        examMarks: (examMarks.data ?? []) as DashboardData['examMarks'],
        fees: (fees.data ?? []) as DashboardData['fees'],
        books: (books.data ?? []) as DashboardData['books'],
        routes: (routes.data ?? []) as DashboardData['routes'],
        transportPassengers: (transportPassengers.data ?? []) as DashboardData['transportPassengers'],
        hostelRooms: (hostelRooms.data ?? []) as DashboardData['hostelRooms'],
        hostelAssignments: (hostelAssignments.data ?? []) as DashboardData['hostelAssignments'],
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

  async function saveModule(table: ModuleTable, row: Record<string, unknown>): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const payload = { ...row }
      if (!payload.id) delete payload.id
      delete payload.created_at
      const { error: e } = await supabase!.from(table).upsert(payload)
      if (e) throw e
    })
    if (didRemote) return

    const key = MODULE_TABLE_TO_KEY[table]
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

  async function deleteModule(table: ModuleTable, id: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from(table).delete().eq('id', id)
      if (e) throw e
    })
    if (didRemote) return

    const key = MODULE_TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    commitLocal({
      ...current,
      [key]: list.filter((item) => item.id !== id),
    } as unknown as DashboardData)
  }

  async function setAttendance(date_str: string, entity_type: string, record_id: string, status: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!
        .from('attendance')
        .upsert({ date_str, entity_type, record_id, status }, { onConflict: 'date_str,entity_type,record_id' })
      if (e) throw e
    })
    if (didRemote) return

    const current = dataRef.current
    const attendance = current.attendance
    const matches = (r: (typeof attendance)[number]) =>
      r.date_str === date_str && r.entity_type === entity_type && r.record_id === record_id
    const next = attendance.some(matches)
      ? attendance.map((r) => (matches(r) ? { ...r, status } : r))
      : [...attendance, { date_str, entity_type, record_id, status }]
    commitLocal({ ...current, attendance: next })
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
    saveRecord, deleteRecord, saveModule, deleteModule, setAttendance,
    saveProfile, saveSettings,
  }
}

export type DashboardController = ReturnType<typeof useDashboardData>
