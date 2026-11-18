import type { DashboardData } from './types'

const KEY = 'schooldashboard.data.v1'

const sample: DashboardData = {
  students: [
    { id: 'local-s1', user_id: '', name: 'Alex Carter', grade: 'Grade 10-A', attendance: 98, status: 'Excellent', avatar_url: 'https://i.pravatar.cc/150?img=11', created_at: '2026-01-01T00:00:01Z' },
    { id: 'local-s2', user_id: '', name: 'Bella Thorne', grade: 'Grade 9-B', attendance: 85, status: 'Warning', avatar_url: 'https://i.pravatar.cc/150?img=5', created_at: '2026-01-01T00:00:02Z' },
    { id: 'local-s3', user_id: '', name: 'Cameron Diaz', grade: 'Grade 11-Sci', attendance: 100, status: 'Perfect', avatar_url: 'https://i.pravatar.cc/150?img=8', created_at: '2026-01-01T00:00:03Z' },
    { id: 'local-s4', user_id: '', name: 'Derek Hale', grade: 'Grade 10-C', attendance: 92, status: 'Good', avatar_url: 'https://i.pravatar.cc/150?img=12', created_at: '2026-01-01T00:00:04Z' },
    { id: 'local-s5', user_id: '', name: 'Elena Gilbert', grade: 'Grade 12-Arts', attendance: 76, status: 'Critical', avatar_url: 'https://i.pravatar.cc/150?img=9', created_at: '2026-01-01T00:00:05Z' },
  ],
  schedule: [
    { id: 'local-c1', user_id: '', day: 'Today', time: '09:00 AM', subject: 'Advanced Physics', teacher: 'Mr. Rutherford', room: 'Lab 4', color: 'purple', created_at: '2026-01-01T00:00:01Z' },
    { id: 'local-c2', user_id: '', day: 'Today', time: '10:30 AM', subject: 'Mathematics', teacher: 'Mrs. Euler', room: 'Room 102', color: 'cyan', created_at: '2026-01-01T00:00:02Z' },
    { id: 'local-c3', user_id: '', day: 'Today', time: '12:00 PM', subject: 'Lunch Break', teacher: '-', room: 'Cafeteria', color: 'slate', created_at: '2026-01-01T00:00:03Z' },
    { id: 'local-c4', user_id: '', day: 'Today', time: '01:00 PM', subject: 'World History', teacher: 'Dr. Indiana', room: 'Room 205', color: 'amber', created_at: '2026-01-01T00:00:04Z' },
  ],
  messages: [
    { id: 'local-m1', user_id: '', name: 'Staff Group', msg: "Don't forget the assembly tomorrow.", time: '10:24 AM', unread: 3, is_group: true, avatar_url: null, created_at: '2026-01-01T00:00:01Z' },
    { id: 'local-m2', user_id: '', name: 'Mr. Rutherford', msg: 'The lab equipment is ready for the next class.', time: 'Yesterday', unread: 0, is_group: false, avatar_url: 'https://i.pravatar.cc/150?img=33', created_at: '2026-01-01T00:00:02Z' },
    { id: 'local-m3', user_id: '', name: 'Parents Assoc.', msg: 'Can we schedule a meeting next week?', time: 'Mon', unread: 1, is_group: true, avatar_url: null, created_at: '2026-01-01T00:00:03Z' },
    { id: 'local-m4', user_id: '', name: 'IT Support', msg: 'The projector in Room 102 is fixed.', time: 'Last Week', unread: 0, is_group: false, avatar_url: 'https://i.pravatar.cc/150?img=15', created_at: '2026-01-01T00:00:04Z' },
  ],
  events: [
    { id: 'local-e1', user_id: '', type: 'Exam', title: 'Mid-Term Mathematics', time: 'Tomorrow, 09:00 AM', accent: 'purple', icon: 'FileText', created_at: '2026-01-01T00:00:01Z' },
    { id: 'local-e2', user_id: '', type: 'Notice', title: 'Staff Meeting (All Depts)', time: 'Today, 02:30 PM', accent: 'cyan', icon: 'Users', created_at: '2026-01-01T00:00:02Z' },
    { id: 'local-e3', user_id: '', type: 'Alert', title: 'Maintenance in Block B', time: 'Oct 24, All Day', accent: 'amber', icon: 'AlertCircle', created_at: '2026-01-01T00:00:03Z' },
  ],
  profile: {
    id: 'local-profile',
    full_name: 'Principal Sarah',
    role_title: 'Head of Administration',
    avatar_url: 'https://i.pravatar.cc/150?img=47',
    updated_at: '2026-01-01T00:00:00Z',
  },
  settings: {
    user_id: '',
    total_teachers: 84,
    pending_fees: '$12.5k',
    updated_at: '2026-01-01T00:00:00Z',
  },
}

function clone(data: DashboardData): DashboardData {
  return JSON.parse(JSON.stringify(data)) as DashboardData
}

export function loadLocal(): DashboardData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardData
      return { ...clone(sample), ...parsed }
    }
  } catch {
    // Fall through to sample data if storage is unavailable or corrupt.
  }
  const initial = clone(sample)
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
