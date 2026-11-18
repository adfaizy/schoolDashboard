import type { Field, FormValues } from '../components/DataModal'
import type { ModuleTable } from '../hooks/useDashboardData'
import type { DashboardData } from './types'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3, BookOpen, BedDouble, Building2, Bus, Calculator,
  ClipboardCheck, GraduationCap, Library, School, Users,
} from 'lucide-react'

export type ModuleDefinition = {
  id: string
  label: string
  tagline: string
  icon: LucideIcon
  /** Which table this module edits, or 'custom:attendance' / 'custom:reports' for special views. */
  table: ModuleTable | 'custom:attendance' | 'custom:reports'
  accent: string
  listTitle: (row: any, data: DashboardData) => string
  listSubtitle: (row: any, data: DashboardData) => string
  fields: (data: DashboardData) => Field[]
  initial: (row: any | undefined, data: DashboardData) => FormValues
  toRow: (values: FormValues, row: any | undefined, data: DashboardData) => Record<string, unknown>
}

function studentOptions(data: DashboardData) {
  return [{ value: '', label: 'Not issued' },
    ...data.students.map((s) => ({ value: s.id, label: s.name }))]
}

function studentRequiredOptions(data: DashboardData) {
  return data.students.map((s) => ({ value: s.id, label: s.name }))
}

function classOptions(data: DashboardData) {
  return [{ value: '', label: 'No class' },
    ...data.classes.map((c) => ({ value: c.id, label: `${c.grade}${c.section ? ' ' + c.section : ''}` }))]
}

function studentName(data: DashboardData, id: string | null | undefined) {
  return data.students.find((s) => s.id === id)?.name ?? '—'
}

function classLabel(data: DashboardData, id: string | null | undefined) {
  if (!id) return 'No class'
  const c = data.classes.find((x) => x.id === id)
  if (!c) return 'Unknown class'
  return `${c.grade}${c.section ? ' ' + c.section : ''}`
}

const parseSubjects = (text: unknown): string[] =>
  String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export const MODULES: ModuleDefinition[] = [
  {
    id: 'classes',
    label: 'Classes & Subjects',
    tagline: 'Grades, sections and subject lists',
    icon: School,
    table: 'classes',
    accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    listTitle: (row) => `${row.grade}${row.section ? ' — ' + row.section : ''}`,
    listSubtitle: (row) => (Array.isArray(row.subjects) ? row.subjects.join(', ') : '') || 'No subjects yet',
    fields: () => [
      { key: 'grade', label: 'Grade (e.g. Grade 10)', required: true, placeholder: 'Grade 10' },
      { key: 'section', label: 'Section (e.g. A)' },
      { key: 'subjects', label: 'Subjects', hint: 'Comma separated, e.g. Math, Physics, English' },
    ],
    initial: (row) => ({
      grade: row?.grade ?? '',
      section: row?.section ?? '',
      subjects: Array.isArray(row?.subjects) ? row.subjects.join(', ') : '',
    }),
    toRow: (values) => ({
      grade: String(values.grade ?? ''),
      section: String(values.section ?? ''),
      subjects: parseSubjects(values.subjects),
    }),
  },
  {
    id: 'staff',
    label: 'Teachers & Staff',
    tagline: 'Teaching and non-teaching staff',
    icon: Users,
    table: 'staff',
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    listTitle: (row) => row.name,
    listSubtitle: (row) => `${row.designation || 'Staff'} · ${row.staff_category === 'teaching' ? 'Teaching' : 'Non-teaching'}`,
    fields: () => [
      { key: 'name', label: 'Full name', required: true },
      { key: 'designation', label: 'Designation', placeholder: 'e.g. Math Teacher' },
      { key: 'staff_category', label: 'Category', type: 'select', options: [
        { value: 'teaching', label: 'Teaching' }, { value: 'non-teaching', label: 'Non-teaching' },
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
      ]},
    ],
    initial: (row) => ({
      name: row?.name ?? '',
      designation: row?.designation ?? '',
      staff_category: row?.staff_category ?? 'teaching',
      status: row?.status ?? 'active',
    }),
    toRow: (values) => ({
      name: String(values.name ?? ''),
      designation: String(values.designation ?? ''),
      staff_category: String(values.staff_category ?? 'teaching'),
      status: String(values.status ?? 'active'),
    }),
  },
  {
    id: 'exams',
    label: 'Exams & Results',
    tagline: 'Session marks and result cards',
    icon: GraduationCap,
    table: 'exam_marks',
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    listTitle: (row, data) => studentName(data, row.student_id),
    listSubtitle: (row) => `${row.subject} — ${row.term} · ${row.marks_obtained}/${row.total_marks}`,
    fields: (data) => [
      { key: 'student_id', label: 'Student', type: 'select', required: true, options: studentRequiredOptions(data) },
      { key: 'session', label: 'Session', required: true, placeholder: '2026-2027' },
      { key: 'term', label: 'Term', required: true, placeholder: 'Term 1' },
      { key: 'subject', label: 'Subject', required: true },
      { key: 'marks_obtained', label: 'Marks obtained', type: 'number', required: true },
      { key: 'total_marks', label: 'Out of', type: 'number', required: true },
    ],
    initial: (row) => ({
      student_id: row?.student_id ?? '',
      session: row?.session ?? '2026-2027',
      term: row?.term ?? 'Term 1',
      subject: row?.subject ?? '',
      marks_obtained: row?.marks_obtained ?? 0,
      total_marks: row?.total_marks ?? 100,
    }),
    toRow: (values) => ({
      student_id: values.student_id || null,
      session: String(values.session ?? ''),
      term: String(values.term ?? ''),
      subject: String(values.subject ?? ''),
      marks_obtained: Number(values.marks_obtained ?? 0),
      total_marks: Number(values.total_marks ?? 100),
    }),
  },
  {
    id: 'fees',
    label: 'Fees & Payments',
    tagline: 'Monthly fee collection per student',
    icon: Calculator,
    table: 'fees',
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    listTitle: (row, data) => studentName(data, row.student_id),
    listSubtitle: (row) => `${row.month_year} · $${Number(row.amount_paid).toLocaleString()} · ${row.status}`,
    fields: (data) => [
      { key: 'student_id', label: 'Student', type: 'select', required: true, options: studentRequiredOptions(data) },
      { key: 'month_year', label: 'Month / year', required: true, placeholder: 'Nov 2026' },
      { key: 'amount_paid', label: 'Amount paid', type: 'number', required: true },
      { key: 'payment_date', label: 'Payment date', placeholder: '2026-11-18' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' },
      ]},
    ],
    initial: (row) => ({
      student_id: row?.student_id ?? '',
      month_year: row?.month_year ?? '',
      amount_paid: row?.amount_paid ?? 0,
      payment_date: row?.payment_date ? String(row.payment_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: row?.status ?? 'paid',
    }),
    toRow: (values) => ({
      student_id: values.student_id || null,
      month_year: String(values.month_year ?? ''),
      amount_paid: Number(values.amount_paid ?? 0),
      payment_date: values.payment_date ? String(values.payment_date).slice(0, 10) : null,
      status: String(values.status ?? 'paid'),
    }),
  },
  {
    id: 'library',
    label: 'Library (Book Bank)',
    tagline: 'Books, issue and return',
    icon: Library,
    table: 'library_books',
    accent: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    listTitle: (row) => row.title,
    listSubtitle: (row, data) => `${row.author || 'Unknown author'} · ${row.status === 'issued' ? 'Issued to ' + studentName(data, row.issued_to) : 'Available'}`,
    fields: (data) => [
      { key: 'title', label: 'Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'available', label: 'Available' }, { value: 'issued', label: 'Issued' },
      ]},
      { key: 'issued_to', label: 'Issued to', type: 'select', options: studentOptions(data) },
    ],
    initial: (row) => ({
      title: row?.title ?? '',
      author: row?.author ?? '',
      isbn: row?.isbn ?? '',
      status: row?.status ?? 'available',
      issued_to: row?.issued_to ?? '',
    }),
    toRow: (values) => ({
      title: String(values.title ?? ''),
      author: String(values.author ?? ''),
      isbn: String(values.isbn ?? ''),
      status: String(values.status ?? 'available'),
      issued_to: values.issued_to ? String(values.issued_to) : null,
      issue_date: values.status === 'issued' ? new Date().toISOString().slice(0, 10) : null,
    }),
  },
  {
    id: 'transport',
    label: 'Transport',
    tagline: 'Routes, drivers and passengers',
    icon: Bus,
    table: 'transport_routes',
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    listTitle: (row) => row.route_name,
    listSubtitle: (row, data) => {
      const count = data.transportPassengers.filter((p) => p.route_id === row.id).length
      return `Driver: ${row.driver || '—'} · Vehicle ${row.vehicle_no || '—'} · ${count} student(s)`
    },
    fields: () => [
      { key: 'route_name', label: 'Route name', required: true, placeholder: 'e.g. East City Route' },
      { key: 'driver', label: 'Driver name' },
      { key: 'vehicle_no', label: 'Vehicle number' },
    ],
    initial: (row) => ({
      route_name: row?.route_name ?? '',
      driver: row?.driver ?? '',
      vehicle_no: row?.vehicle_no ?? '',
    }),
    toRow: (values) => ({
      route_name: String(values.route_name ?? ''),
      driver: String(values.driver ?? ''),
      vehicle_no: String(values.vehicle_no ?? ''),
    }),
  },
  {
    id: 'hostel',
    label: 'Hostel',
    tagline: 'Rooms, capacity and occupants',
    icon: BedDouble,
    table: 'hostel_rooms',
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    listTitle: (row) => `Room ${row.room_no}`,
    listSubtitle: (row, data) => {
      const count = data.hostelAssignments.filter((a) => a.room_id === row.id).length
      return `${count}/${row.capacity} occupants`
    },
    fields: () => [
      { key: 'room_no', label: 'Room number', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number', required: true },
    ],
    initial: (row) => ({
      room_no: row?.room_no ?? '',
      capacity: row?.capacity ?? 1,
    }),
    toRow: (values) => ({
      room_no: String(values.room_no ?? ''),
      capacity: Number(values.capacity ?? 1),
    }),
  },
]

export function moduleById(id: string | null | undefined) {
  return MODULES.find((m) => m.id === id) ?? null
}

export { BarChart3, ClipboardCheck, Building2, BookOpen }
