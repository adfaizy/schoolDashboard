import { emptyData, type DashboardData } from './types'

// Bumped for auth: school data is cached per signed-in account only.
const BASE_KEY = 'schooldashboard.data.v4'

function keyFor(userId?: string | null): string {
  return userId ? `${BASE_KEY}.${userId}` : BASE_KEY
}

function clone(data: DashboardData): DashboardData {
  return JSON.parse(JSON.stringify(data)) as DashboardData
}

export function loadLocal(userId?: string | null): DashboardData {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardData>
      return { ...clone(emptyData), ...parsed }
    }
  } catch {
    // Fall through to an empty state if storage is unavailable or corrupt.
  }
  return clone(emptyData)
}

export function saveLocal(data: DashboardData, userId?: string | null): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(data))
  } catch {
    // Storage full or unavailable — keep working in memory.
  }
}

export function clearLocal(userId?: string | null): void {
  try {
    if (userId) localStorage.removeItem(keyFor(userId))
    // Also drop the legacy shared cache from before per-user accounts.
    localStorage.removeItem('schooldashboard.data.v3')
    localStorage.removeItem(BASE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
