import { emptyData, type DashboardData } from './types'

// Bumped so devices drop the old bundled sample data.
const KEY = 'schooldashboard.data.v2'

function clone(data: DashboardData): DashboardData {
  return JSON.parse(JSON.stringify(data)) as DashboardData
}

export function loadLocal(): DashboardData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardData>
      return { ...clone(emptyData), ...parsed }
    }
  } catch {
    // Fall through to an empty state if storage is unavailable or corrupt.
  }
  const initial = clone(emptyData)
  saveLocal(initial)
  return initial
}

export function saveLocal(data: DashboardData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — keep working in memory.
  }
}
