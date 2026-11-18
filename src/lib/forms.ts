import type { Field, FormValues } from '../components/DataModal'
import type { TableName } from '../hooks/useDashboardData'
import type { ChatMessage, EventItem, Profile, ScheduleItem, SettingsRow, Student } from './types'
import { COLOR_OPTIONS, ICON_OPTIONS } from './styles'

export type ModalState =
  | { kind: 'student'; row?: Student }
  | { kind: 'schedule'; row?: ScheduleItem }
  | { kind: 'message'; row?: ChatMessage }
  | { kind: 'reply'; row: ChatMessage }
  | { kind: 'event'; row?: EventItem }
  | { kind: 'profile' }
  | { kind: 'settings' }
  | null

export type DeleteTarget = { table: TableName; id: string; label: string }

const statusOptions = ['Excellent', 'Perfect', 'Good', 'Warning', 'Critical']
const dayOptions = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const eventTypeOptions = ['Exam', 'Notice', 'Alert', 'Event', 'Meeting']

function options(list: string[]) {
  return list.map((value) => ({ value, label: value }))
}

export function modalConfig(
  modal: Exclude<ModalState, null>,
  profile: Profile | null,
  settings: SettingsRow | null,
): { title: string; fields: Field[]; initial: FormValues } {
  switch (modal.kind) {
    case 'student':
      return {
        title: modal.row ? 'Edit Student' : 'Add Student',
        fields: [
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Alex Carter' },
          { key: 'grade', label: 'Grade / Class', required: true, placeholder: 'e.g. Grade 10-A' },
          { key: 'attendance', label: 'Attendance (%)', type: 'number', required: true },
          { key: 'status', label: 'Status', type: 'select', options: options(statusOptions) },
          { key: 'avatar_url', label: 'Avatar URL (optional)', hint: 'Paste an image URL, or leave blank for the default avatar.' },
        ],
        initial: {
          name: modal.row?.name ?? '',
          grade: modal.row?.grade ?? '',
          attendance: modal.row?.attendance ?? 0,
          status: modal.row?.status ?? 'Good',
          avatar_url: modal.row?.avatar_url ?? '',
        },
      }

    case 'schedule':
      return {
        title: modal.row ? 'Edit Class' : 'Add Class',
        fields: [
          { key: 'day', label: 'Day', type: 'select', options: options(dayOptions) },
          { key: 'time', label: 'Time', required: true, placeholder: '09:00 AM' },
          { key: 'subject', label: 'Subject', required: true },
          { key: 'teacher', label: 'Teacher' },
          { key: 'room', label: 'Room' },
          { key: 'color', label: 'Accent color', type: 'select', options: COLOR_OPTIONS },
        ],
        initial: {
          day: modal.row?.day ?? 'Today',
          time: modal.row?.time ?? '',
          subject: modal.row?.subject ?? '',
          teacher: modal.row?.teacher ?? '',
          room: modal.row?.room ?? '',
          color: modal.row?.color ?? 'cyan',
        },
      }

    case 'message':
      return {
        title: modal.row ? 'Edit Conversation' : 'New Conversation',
        fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'msg', label: 'Last message' },
          { key: 'time', label: 'Time label', placeholder: '10:24 AM' },
          { key: 'unread', label: 'Unread count', type: 'number' },
          { key: 'is_group', label: 'This is a group conversation', type: 'checkbox' },
          { key: 'avatar_url', label: 'Avatar URL (optional)' },
        ],
        initial: {
          name: modal.row?.name ?? '',
          msg: modal.row?.msg ?? '',
          time: modal.row?.time ?? '',
          unread: modal.row?.unread ?? 0,
          is_group: modal.row?.is_group ?? false,
          avatar_url: modal.row?.avatar_url ?? '',
        },
      }

    case 'reply':
      return {
        title: `Reply to ${modal.row.name}`,
        fields: [
          { key: 'msg', label: 'Message', required: true, placeholder: 'Type your reply...' },
        ],
        initial: { msg: '' },
      }

    case 'event':
      return {
        title: modal.row ? 'Edit Event' : 'Add Event',
        fields: [
          { key: 'type', label: 'Type', type: 'select', options: options(eventTypeOptions) },
          { key: 'title', label: 'Title', required: true },
          { key: 'time', label: 'When', placeholder: 'Tomorrow, 09:00 AM' },
          { key: 'accent', label: 'Accent color', type: 'select', options: COLOR_OPTIONS },
          { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
        ],
        initial: {
          type: modal.row?.type ?? 'Notice',
          title: modal.row?.title ?? '',
          time: modal.row?.time ?? '',
          accent: modal.row?.accent ?? 'cyan',
          icon: modal.row?.icon ?? 'FileText',
        },
      }

    case 'profile':
      return {
        title: 'Edit Profile',
        fields: [
          { key: 'full_name', label: 'Full name', required: true },
          { key: 'role_title', label: 'Role / title' },
          { key: 'avatar_url', label: 'Avatar URL (optional)' },
        ],
        initial: {
          full_name: profile?.full_name ?? '',
          role_title: profile?.role_title ?? '',
          avatar_url: profile?.avatar_url ?? '',
        },
      }

    case 'settings':
      return {
        title: 'Edit Overview Numbers',
        fields: [
          { key: 'total_teachers', label: 'Total teachers', type: 'number' },
          { key: 'pending_fees', label: 'Pending fees', placeholder: 'e.g. $12.5k' },
        ],
        initial: {
          total_teachers: settings?.total_teachers ?? 0,
          pending_fees: settings?.pending_fees ?? '',
        },
      }
  }
}
