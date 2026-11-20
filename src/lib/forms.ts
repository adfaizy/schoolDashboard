import type { Field, FormValues } from '../components/DataModal'
import type { TableName } from '../hooks/useDashboardData'
import { classLabel, sortedClasses, todayKey } from './school'
import type { ChatMessage, DashboardData, EventItem, Student } from './types'
import { COLOR_OPTIONS, ICON_OPTIONS } from './styles'

export type ModalState =
  | { kind: 'student'; row?: Student }
  | { kind: 'message'; row?: ChatMessage }
  | { kind: 'reply'; row: ChatMessage }
  | { kind: 'event'; row?: EventItem }
  | { kind: 'profile' }
  | { kind: 'settings' }
  | null

export type DeleteTarget = { table: TableName; id: string; label: string }

const eventTypeOptions = ['Exam', 'Notice', 'Alert', 'Event', 'Meeting']

function options(list: string[]) {
  return list.map((value) => ({ value, label: value }))
}

export function modalConfig(
  modal: Exclude<ModalState, null>,
  data: DashboardData,
): { title: string; fields: Field[]; initial: FormValues } {
  switch (modal.kind) {
    case 'student': {
      const classOptions = sortedClasses(data.classes).map((row) => ({
        value: row.id,
        label: classLabel(row),
      }))
      return {
        title: modal.row ? 'Edit Student' : 'Add Student',
        fields: [
          { key: 'name', label: 'Full name', required: true, placeholder: 'e.g. Ali Hassan' },
          {
            key: 'class_id',
            label: 'Class',
            type: 'select',
            required: true,
            options: classOptions.length
              ? classOptions
              : [{ value: '', label: 'Add a class in Classes & Subjects first' }],
            hint: 'Class subjects and exam subjects follow this selection.',
          },
          { key: 'roll_no', label: 'Roll number', placeholder: 'e.g. 12' },
          { key: 'father_name', label: "Father's name" },
          { key: 'parent_contact', label: 'Parent contact', placeholder: 'e.g. 0300 1234567' },
          { key: 'admission_date', label: 'Admission date', placeholder: 'YYYY-MM-DD' },
        ],
        initial: {
          name: modal.row?.name ?? '',
          class_id: modal.row?.class_id ?? classOptions[0]?.value ?? '',
          roll_no: modal.row?.roll_no ?? '',
          father_name: modal.row?.father_name ?? '',
          parent_contact: modal.row?.parent_contact ?? '',
          admission_date: modal.row?.admission_date
            ? String(modal.row.admission_date).slice(0, 10)
            : todayKey(),
        },
      }
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
          full_name: data.profile?.full_name ?? '',
          role_title: data.profile?.role_title ?? '',
          avatar_url: data.profile?.avatar_url ?? '',
        },
      }

    case 'settings':
      return {
        title: 'School Details',
        fields: [
          {
            key: 'school_name',
            label: 'School name',
            placeholder: 'e.g. Punjab College Raiwind',
            hint: 'Shown on the home screen and reports.',
          },
        ],
        initial: {
          school_name: data.settings?.school_name ?? '',
        },
      }
  }
}
