import { emptyData, type DashboardData } from './types'

// Bumped for auth: school data is cached per signed-in account only.
const BASE_KEY = 'schooldashboard.data.v4'
const LEGACY_KEYS = [
  'schooldashboard.data.v1',
  'schooldashboard.data.v2',
  'schooldashboard.data.v3',
  BASE_KEY, // unscoped cache from before per-account storage
]

function keyFor(userId?: string | null): string {
  return userId ? `${BASE_KEY}.${userId}` : BASE_KEY
}

function clone(data: DashboardData): DashboardData {
  return JSON.parse(JSON.stringify(data)) as DashboardData
}

/** Remove caches created before login/per-account storage. Safe to call on every launch. */
export function clearLegacyCaches(): void {
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
    Object.keys(localStorage)
      .filter((key) => /^schooldashboard\.data\.v[0-3]\./.test(key))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

function ownedRows<T extends Record<string, any>>(rows: unknown, userId: string): T[] {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row && row.user_id === userId) as T[]
}

export function loadLocal(userId?: string | null): DashboardData {
  // Never show a shared/demo cache when no account is signed in.
  if (!userId) return clone(emptyData)
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardData>
      const merged = { ...clone(emptyData), ...parsed }
      // Drop any old row that is not explicitly owned by this account.
      return {
        students: ownedRows(merged.students, userId),
        schedule: ownedRows(merged.schedule, userId),
        messages: ownedRows(merged.messages, userId),
        events: ownedRows(merged.events, userId),
        profile: merged.profile?.id === userId ? merged.profile : null,
        settings: merged.settings?.user_id === userId ? merged.settings : null,
        classes: ownedRows(merged.classes, userId),
        staff: ownedRows(merged.staff, userId),
        attendance: ownedRows(merged.attendance, userId),
        examMarks: ownedRows(merged.examMarks, userId),
        fees: ownedRows(merged.fees, userId),
        books: ownedRows(merged.books, userId),
        routes: ownedRows(merged.routes, userId),
        transportPassengers: ownedRows(merged.transportPassengers, userId),
        hostelRooms: ownedRows(merged.hostelRooms, userId),
        hostelAssignments: ownedRows(merged.hostelAssignments, userId),
      }
    }
  } catch {
    // Fall through to an empty state if storage is unavailable or corrupt.
  }
  return clone(emptyData)
}

export function saveLocal(data: DashboardData, userId?: string | null): void {
  if (!userId) return
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(data))
  } catch {
    // Storage full or unavailable — keep working in memory.
  }
}

export function clearLocal(userId?: string | null): void {
  try {
    if (userId) localStorage.removeItem(keyFor(userId))
    clearLegacyCaches()
  } catch {
    // Ignore storage errors.
  }
}
