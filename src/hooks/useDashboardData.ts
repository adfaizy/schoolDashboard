import { useCallback, useEffect, useRef, useState } from 'react'
import { isConfigured, supabase } from '../lib/supabase'
import { clearLocal, loadLocal, saveLocal } from '../lib/localData'
import { emptyData, type DashboardData } from '../lib/types'

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
  schedule_items: 'user_id,class_id,period_no',
  classes: 'user_id,grade,section',
  exam_marks: 'session,term,student_id,subject',
  fees: 'student_id,month_year',
  transport_passengers: 'route_id,student_id',
  hostel_assignments: 'room_id,student_id',
}

function errorMessage(error: unknown): string {
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
    return 'Supabase tables are missing — run supabase/schema-auth-multi.sql in SQL Editor, then reopen the app.'
  }
  if (text.includes('pgrst301') || text.includes('row level security') || text.includes('permission denied') || text.includes('42501')) {
    return 'Supabase permissions are blocking access. Re-run the auth schema SQL in the SQL Editor.'
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('timeout') || text.includes('offline')) {
    return 'Cannot reach Supabase right now. Changes are kept on this device for this account only.'
  }
  if (!raw) return 'Could not reach Supabase. Changes were kept on this device only.'
  return raw
}

function upsertRow(list: Array<Record<string, any>>, row: Record<string, unknown>) {
  const id = String(row.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const record = { ...row, id, created_at: row.created_at ?? new Date().toISOString() }
  const exists = list.some((item) => item.id === id)
  return exists
    ? list.map((item) => (item.id === id ? { ...item, ...record } : item))
    : [...list, record]
}

/**
 * ownerId is the account whose school data is being viewed/edited.
 * A normal user always passes their own auth uid. An admin passes the uid of
 * the school they selected in the Schools screen.
 */
export function useDashboardData(enabled = true, ownerId: string | null = null, isAdmin = false) {
  const [data, setData] = useState<DashboardData>(() => ({ ...emptyData }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remoteOk, setRemoteOk] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!enabled || !ownerId || !isConfigured || !supabase) {
      setData({ ...emptyData })
      setRemoteOk(false)
      return false
    }
    setLoading(true)
    try {
      const db = supabase!
      const [students, schedule, messages, events, profile, settings,
        classes, staff, attendance, examMarks, fees, books,
        routes, transportPassengers, hostelRooms, hostelAssignments] = await Promise.all([
        db.from('students').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('schedule_items').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('messages').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('events').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('profiles').select('*').eq('id', ownerId).maybeSingle(),
        db.from('settings').select('*').eq('user_id', ownerId).maybeSingle(),
        db.from('classes').select('*').eq('user_id', ownerId).order('grade', { ascending: true }),
        db.from('staff').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('attendance').select('*').eq('user_id', ownerId),
        db.from('exam_marks').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('fees').select('*').eq('user_id', ownerId).order('payment_date', { ascending: false }),
        db.from('library_books').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('transport_routes').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        db.from('transport_passengers').select('*').eq('user_id', ownerId),
        db.from('hostel_rooms').select('*').eq('user_id', ownerId).order('room_no', { ascending: true }),
        db.from('hostel_assignments').select('*').eq('user_id', ownerId),
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
      saveLocal(next, ownerId)
      setRemoteOk(true)
      setError(null)
      return true
    } catch (e) {
      setData(loadLocal(ownerId))
      setRemoteOk(false)
      setError(errorMessage(e))
      return false
    } finally {
      setLoading(false)
    }
  }, [enabled, ownerId, isAdmin])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function commitLocal(next: DashboardData) {
    dataRef.current = next
    setData(next)
    if (ownerId) saveLocal(next, ownerId)
  }

  async function tryRemote(write: () => Promise<void>): Promise<boolean> {
    if (!isConfigured || !supabase || !remoteOk || !ownerId) return false
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

  /** Stamp every row with the account that owns this school. */
  function owned<T extends Record<string, unknown>>(row: T): T {
    return ownerId ? ({ ...row, user_id: ownerId } as T) : row
  }

  async function saveRecord(table: TableName, row: Record<string, unknown>): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const payload = owned({ ...row })
      if (!payload.id) delete payload.id
      delete payload.created_at
      const { error: e } = await supabase!.from(table).upsert(payload, {
        onConflict: ON_CONFLICT[table],
      })
      if (e) throw e
    })
    if (didRemote) return

    const key = TABLE_TO_KEY[table]
    const current = dataRef.current
    const list = current[key] as unknown as Array<Record<string, unknown>>
    commitLocal({ ...current, [key]: upsertRow(list, owned(row)) } as unknown as DashboardData)
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
        // attendance has no FK cascade, so remove its rows explicitly.
        const { error: attendanceError } = await supabase!
          .from('attendance')
          .delete()
          .eq('record_id', id)
          .eq('entity_type', 'students')
          .eq('user_id', ownerId)
        if (attendanceError) throw attendanceError
      }
      const { error: e } = await supabase!.from(table).delete().eq('id', id).eq('user_id', ownerId)
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
      const payload = owned({ ...row })
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
    commitLocal({ ...current, [key]: upsertRow(list, owned(row)) } as unknown as DashboardData)
  }

  async function deleteModule(table: ModuleTable, id: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from(table).delete().eq('id', id).eq('user_id', ownerId)
      if (e) throw e
    })
    if (didRemote) return
    commitLocal(removeModuleLocally(dataRef.current, table, id))
  }

  async function applyModuleChanges(
    upserts: Array<{ table: ModuleTable; row: Record<string, unknown> }>,
    deletes: Array<{ table: ModuleTable; id: string }> = [],
  ): Promise<void> {
    const didRemote = await tryRemote(async () => {
      for (const change of deletes) {
        const { error: e } = await supabase!.from(change.table).delete().eq('id', change.id).eq('user_id', ownerId)
        if (e) throw e
      }
      for (const change of upserts) {
        const payload = owned({ ...change.row })
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
      current = { ...current, [key]: upsertRow(list, owned(change.row)) } as unknown as DashboardData
    }
    commitLocal(current)
  }

  async function setAttendance(date_str: string, entity_type: string, record_id: string, status: string): Promise<void> {
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!
        .from('attendance')
        .upsert(owned({ date_str, entity_type, record_id, status }), { onConflict: 'date_str,entity_type,record_id' })
      if (e) throw e
    })
    if (didRemote) return

    const current = dataRef.current
    const attendance = current.attendance
    const matches = (r: (typeof attendance)[number]) =>
      r.date_str === date_str && r.entity_type === entity_type && r.record_id === record_id
    const next = attendance.some(matches)
      ? attendance.map((r) => (matches(r) ? { ...r, status } : r))
      : [...attendance, owned({ date_str, entity_type, record_id, status })]
    commitLocal({ ...current, attendance: next })
  }

  async function saveProfile(row: {
    full_name: string; role_title: string; avatar_url: string | null
  }): Promise<void> {
    if (!ownerId) return
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from('profiles').upsert({
        id: ownerId, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      profile: { id: ownerId, ...row, updated_at: new Date().toISOString() },
    })
  }

  async function saveSettings(row: { school_name: string | null }): Promise<void> {
    if (!ownerId) return
    const didRemote = await tryRemote(async () => {
      const { error: e } = await supabase!.from('settings').upsert({
        user_id: ownerId, ...row, updated_at: new Date().toISOString(),
      })
      if (e) throw e
    })
    if (didRemote) return
    commitLocal({
      ...dataRef.current,
      settings: {
        user_id: ownerId,
        total_teachers: dataRef.current.settings?.total_teachers ?? null,
        pending_fees: dataRef.current.settings?.pending_fees ?? null,
        ...row,
        updated_at: new Date().toISOString(),
      } as DashboardData['settings'],
    })
  }

  async function retryConnection(): Promise<boolean> {
    setError(null)
    setRemoteOk(true)
    const ok = await refresh()
    if (!ok) setRemoteOk(false)
    return ok
  }

  function forgetLocal(targetId: string | null = ownerId) {
    clearLocal(targetId)
  }

  return {
    isRemote: isConfigured && remoteOk,
    usingLocal: !isConfigured || !remoteOk,
    loading, error, data, refresh, retryConnection, forgetLocal,
    saveRecord, deleteRecord, saveModule, deleteModule, applyModuleChanges, setAttendance,
    saveProfile, saveSettings,
  }
}

export type DashboardController = ReturnType<typeof useDashboardData>
