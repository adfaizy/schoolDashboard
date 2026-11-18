export type Student = {
  id: string
  user_id: string
  name: string
  grade: string
  attendance: number
  status: string
  avatar_url: string | null
  created_at: string
  class_id?: string | null
  roll_no?: string | null
  father_name?: string | null
  parent_contact?: string | null
  admission_date?: string | null
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
  class_id?: string | null
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
  total_teachers: number | null
  pending_fees: string | null
  school_name?: string | null
  status?: string | null
  updated_at: string
}

export type DashboardData = {
  students: Student[]
  schedule: ScheduleItem[]
  messages: ChatMessage[]
  events: EventItem[]
  profile: Profile | null
  settings: SettingsRow | null
  classes: SchoolClass[]
  staff: StaffRow[]
  attendance: AttendanceRow[]
  examMarks: ExamMark[]
  fees: FeeRow[]
  books: LibraryBook[]
  routes: TransportRoute[]
  transportPassengers: TransportPassenger[]
  hostelRooms: HostelRoom[]
  hostelAssignments: HostelAssignment[]
}

export const emptyData: DashboardData = {
  students: [],
  schedule: [],
  messages: [],
  events: [],
  profile: null,
  settings: null,
  classes: [],
  staff: [],
  attendance: [],
  examMarks: [],
  fees: [],
  books: [],
  routes: [],
  transportPassengers: [],
  hostelRooms: [],
  hostelAssignments: [],
}

export type SchoolClass = {
  id: string
  grade: string
  section: string
  subjects: string[]
  created_at: string
}

export type StaffRow = {
  id: string
  name: string
  designation: string
  staff_category: 'teaching' | 'non-teaching' | string
  status: string
  avatar_url: string | null
  created_at: string
}

export type AttendanceRow = {
  date_str: string
  entity_type: 'students' | 'staff' | string
  record_id: string
  status: 'present' | 'absent' | 'late' | 'leave' | string
  updated_at?: string
}

export type ExamMark = {
  id: string
  session: string
  term: string
  student_id: string
  subject: string
  marks_obtained: number
  total_marks: number
  created_at: string
}

export type FeeRow = {
  id: string
  student_id: string
  month_year: string
  amount_paid: number
  payment_date: string | null
  status: string
  created_at: string
}

export type LibraryBook = {
  id: string
  title: string
  author: string
  isbn: string
  status: 'available' | 'issued' | string
  issued_to: string | null
  issue_date: string | null
  created_at: string
}

export type TransportRoute = {
  id: string
  route_name: string
  driver: string
  vehicle_no: string
  created_at: string
}

export type TransportPassenger = {
  id: string
  route_id: string
  student_id: string
}

export type HostelRoom = {
  id: string
  room_no: string
  capacity: number
  created_at: string
}

export type HostelAssignment = {
  id: string
  room_id: string
  student_id: string
}
