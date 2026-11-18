export type Student = {
  id: string
  user_id: string
  name: string
  grade: string
  attendance: number
  status: string
  avatar_url: string | null
  created_at: string
}

export type ScheduleItem = {
  id: string
  user_id: string
  day: string
  time: string
  subject: string
  teacher: string
  room: string
  color: string
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  name: string
  msg: string
  time: string
  unread: number
  is_group: boolean
  avatar_url: string | null
  created_at: string
}

export type EventItem = {
  id: string
  user_id: string
  type: string
  title: string
  time: string
  accent: string
  icon: string
  created_at: string
}

export type Profile = {
  id: string
  full_name: string
  role_title: string
  avatar_url: string | null
  updated_at: string
}

export type SettingsRow = {
  id?: string
  user_id?: string
  total_teachers: number
  pending_fees: string
  updated_at: string
}

export type DashboardData = {
  students: Student[]
  schedule: ScheduleItem[]
  messages: ChatMessage[]
  events: EventItem[]
  profile: Profile | null
  settings: SettingsRow | null
}

export const emptyData: DashboardData = {
  students: [],
  schedule: [],
  messages: [],
  events: [],
  profile: null,
  settings: null,
}
