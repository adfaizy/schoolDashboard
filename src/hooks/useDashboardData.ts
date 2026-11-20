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

/** Natural keys so repeated saves update instead of failing on unique indexes. */
const ON_CONFLICT: Partial<Record<TableName | ModuleTable, string>> = {
  schedule_items: 'class_id,period_no',
  exam_marks: 'session,term,student_id,subject',
  fees: 'student_id,month_year',
  transport_passengers: 'route_id,student_id',
  hostel_assignments: 'room_id,student_id',
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

function upsertRow(list: Array<Record<string, any>>, row: Record<string, unknown>) {
  const id = String(row.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const record = { ...row, id, created_at: row.created_at ?? new Date().toISOString() }
  const exists = list.some((item) => item.id === id)
  return exists
    ? list.map((item) => (item.id === id ? { ...item, ...record } : item))
    : [...list, record]
}

export function useDashboardData(enabled = true) {
  const [data, setData] = useState<DashboardData>(() => loadLocal())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remoteOk, setRemoteOk] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!enabled || !isConfigured || !supabase) {
      setData(loadLocal())
      setRemoteOk(false)
      return false
    }
    setLoading(true)
    try {
      const [userRes] = await Promise.all([supabase.auth.getUser()])
      const uid = userRes?.data?.user?.id
      const [students, schedule, messages, events, profile, settings,
        classes, staff, attendance, examMarks, fees, books,
        routes, transportPassengers, hostelRooms, hostelAssignments] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('schedule_items').select('*').order('created_at', { ascending: true }),
        supabase.from('messages').select('*').order('created_at', { ascending: true }),
        supabase.from('events').select('*').order('created_at', { ascending: true }),
        uid ? supabase.from('profiles').select('*').eq('id', uid).maybeSingle() : Promise.resolve({ data: null, error: null }),
        uid ? supabase.from('settings').select('*').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null, error: null }),
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
  }, [enabled])

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
      // Add user_id for auth-based tables
      if (supabase && ['students','messages','events','schedule_items'].includes(table)) {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData?.user?.id
        if (uid) (payload as any).user_id = uid
      }
      const { error: e } = await supabase!.from(table).upsert(payload, {
        onConflict: ON_CONFLICT[table],
      })
      if (e) throw e
    })
    if (didRemote) return

    const key = TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    commitLocal({ ...current, [key]: upsertRow(list, row) } as unknown as DashboardData)
  }

  /** Delete a row plus every local child row that would otherwise dangle. */
  function removeLocally(current: DashboardData, table: TableName, id: string): DashboardData {
    if (table === 'students') {
      return {
        ...current,
        students: current.students.filter((row) => row.id !== id),
        attendance: current.attendance.filter((row) => !(row.entity_type === 'students' && row.record_id === id)),
        examMarks: current.examMarks.filter((row) => row.student_id !== id),
        fees: current.fees.filter((row) => row.student_id !== id),
        books: current.books.map((row) => (row.issued_to === id ? { ...row, issued_to: null, status: 'available', issue_date: null } : row)),
        transportPassengers: current.transportPassengers.filter((row) => row.student_id !== id),
        hostelAssignments: current.hostelAssignments.filter((row) => row.student_id !== id),
      }
    }
    const key = TABLE_TO_KEY[table]
    const list = current[key] as unknown as Array<Record<string, unknown>>
    return { ...current, [key]: list.filter((row) => row.id !== id) } as unknown as DashboardData
  }

  async function deleteRecord(table: TableName, id: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      if (table === 'students') {
        // attendance has no foreign key, so remove its rows explicitly.
        const { error: attendanceError } = await supabase!
          .from('attendance')
          .delete()
          .eq('record_id', id)
          .eq('entity_type', 'students')
        if (attendanceError) throw attendanceError
      }
      const { error: e } = await supabase!.from(table).delete().eq('id', id)
      if (e) throw e
    })
    if (didRemote) return
    commitLocal(removeLocally(dataRef.current, table, id))
  }

  function removeModuleLocally(current: DashboardData, table: ModuleTable, id: string): DashboardData {
    if (table === 'transport_routes') {
      return {
        ...current,
        routes: current.routes.filter((row) => row.id !== id),
        transportPassengers: current.transportPassengers.filter((row) => row.route_id !== id),
      }
    }
    if (table === 'hostel_rooms') {
      return {
        ...current,
        hostelRooms: current.hostelRooms.filter((row) => row.id !== id),
        hostelAssignments: current.hostelAssignments.filter((row) => row.room_id !== id),
      }
    }
    if (table === 'classes') {
      return {
        ...current,
        classes: current.classes.filter((row) => row.id !== id),
        schedule: current.schedule.filter((row) => row.class_id !== id),
        students: current.students.map((row) => (row.class_id === id ? { ...row, class_id: null } : row)),
      }
    }
    const key = MODULE_TABLE_TO_KEY[table]
    const list = current[key] as unknown as Array<Record<string, unknown>>
    return { ...current, [key]: list.filter((row) => row.id !== id) } as unknown as DashboardData
  }

  async function saveModule(table: ModuleTable, row: Record<string, unknown>): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const payload = { ...row }
      if (!payload.id) delete payload.id
      delete payload.created_at
      const { error: e } = await supabase!.from(table).upsert(payload, {
        onConflict: ON_CONFLICT[table],
      })
      if (e) throw e
    })
    if (didRemote) return

    const key = MODULE_TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    commitLocal({ ...current, [key]: upsertRow(list, row) } as unknown as DashboardData)
  }

  async function deleteModule(table: ModuleTable, id: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from(table).delete().eq('id', id)
      if (e) throw e
    })
    if (didRemote) return
    commitLocal(removeModuleLocally(dataRef.current, table, id))
  }

  /**
   * Batch upserts + deletes for screens that edit several related rows at once
   * (e.g. a full result card) so the app refreshes once instead of per subject.
   */
  async function applyModuleChanges(
    upserts: Array<{ table: ModuleTable; row: Record<string, unknown> }>,
    deletes: Array<{ table: ModuleTable; id: string }> = [],
  ): Promise<void> {
    const didRemote = await tryRemote(async () => {
      for (const change of deletes) {
        const { error: e } = await supabase!.from(change.table).delete().eq('id', change.id)
        if (e) throw e
      }
      for (const change of upserts) {
        const payload = { ...change.row }
        if (!payload.id) delete payload.id
        delete payload.created_at
        const { error: e } = await supabase!.from(change.table).upsert(payload, {
          onConflict: ON_CONFLICT[change.table],
        })
        if (e) throw e
      }
    })
    if (didRemote) return

    let current = dataRef.current
    for (const change of deletes) current = removeModuleLocally(current, change.table, change.id)
    for (const change of upserts) {
      const key = MODULE_TABLE_TO_KEY[change.table]
      const list = current[key] as unknown as Array<Record<string, unknown>>
      current = { ...current, [key]: upsertRow(list, change.row) } as unknown as DashboardData
    }
    commitLocal(current)
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
      const { data: userData } = await supabase!.auth.getUser()
      const uid = userData?.user?.id ?? SINGLETON_ID
      const { error: e } = await supabase!.from('profiles').upsert({
        id: uid, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      profile: { id: 'local-profile', ...row, updated_at: new Date().toISOString() },
    })
  }

  async function saveSettings(row: { school_name: string | null }): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { data: userData } = await supabase!.auth.getUser()
      const uid = userData?.user?.id ?? SINGLETON_ID
      const { error: e } = await supabase!.from('settings').upsert({
        user_id: uid, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      settings: {
        id: 'local-settings',
        total_teachers: dataRef.current.settings?.total_teachers ?? null,
        pending_fees: dataRef.current.settings?.pending_fees ?? null,
        ...row,
        updated_at: new Date().toISOString(),
      },
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
    saveRecord, deleteRecord, saveModule, deleteModule, applyModuleChanges, setAttendance,
    saveProfile, saveSettings,
  }
}

export type DashboardController = ReturnType<typeof useDashboardData>
