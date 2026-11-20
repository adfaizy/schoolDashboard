import type { Field, FormValues } from '../components/DataModal'
import type { ModuleTable } from '../hooks/useDashboardData'
import { money, studentName, studentOptions } from './school'
import type { DashboardData } from './types'
import type { LucideIcon } from 'lucide-react'
import {
  BedDouble, Bus, Calculator, Library, Users,
} from 'lucide-react'

export type ModuleDefinition = {
  id: string
  label: string
  tagline: string
  icon: LucideIcon
  table: ModuleTable
  accent: string
  listTitle: (row: any, data: DashboardData) => string
  listSubtitle: (row: any, data: DashboardData) => string
  fields: (data: DashboardData) => Field[]
  initial: (row: any | undefined, data: DashboardData) => FormValues
  toRow: (values: FormValues, row: any | undefined, data: DashboardData) => Record<string, unknown>
  /** Return a message to block deleting a row that other modules still use. */
  guardDelete?: (row: any, data: DashboardData) => string | null
}

function classLabelOf(data: DashboardData, id: string | null | undefined): string {
  const klass = data.classes.find((row) => row.id === id)
  if (!klass) return 'Unassigned'
  return `${klass.grade}${klass.section ? ` ${klass.section}` : ''}`
}

function currentMonth(): string {
  return new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'staff',
    label: 'Teachers & Staff',
    tagline: 'Teaching and non-teaching staff',
    icon: Users,
    table: 'staff',
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    listTitle: (row) => row.name,
    listSubtitle: (row, data) => {
      const periods = data.schedule.filter((item) => item.teacher === row.name).length
      const category = row.staff_category === 'teaching' ? 'Teaching' : 'Non-teaching'
      return `${row.designation || 'Staff'} · ${category}${periods ? ` · ${periods} period${periods === 1 ? '' : 's'}` : ''}`
    },
    fields: () => [
      { key: 'name', label: 'Full name', required: true },
      { key: 'designation', label: 'Designation / role', placeholder: 'e.g. Math Teacher' },
      {
        key: 'staff_category', label: 'Category', type: 'select', hint: 'Only teaching staff appear in timetable and result pickers.', options: [
          { value: 'teaching', label: 'Teaching' }, { value: 'non-teaching', label: 'Non-teaching' },
        ],
      },
      {
        key: 'status', label: 'Status', type: 'select', options: [
          { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
    initial: (row) => ({
      name: row?.name ?? '',
      designation: row?.designation ?? '',
      staff_category: row?.staff_category ?? 'teaching',
      status: row?.status ?? 'active',
    }),
    toRow: (values) => ({
      name: String(values.name ?? '').trim(),
      designation: String(values.designation ?? '').trim(),
      staff_category: String(values.staff_category ?? 'teaching'),
      status: String(values.status ?? 'active'),
    }),
    guardDelete: (row, data) => {
      const assigned = data.schedule.filter((item) => item.teacher === row.name).length
      if (assigned) {
        return `${row.name} is assigned to ${assigned} timetable period${assigned === 1 ? '' : 's'}. Reassign those periods before deleting the teacher.`
      }
      return null
    },
  },
  {
    id: 'fees',
    label: 'Fees & Payments',
    tagline: 'Monthly fee collection per student',
    icon: Calculator,
    table: 'fees',
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    listTitle: (row, data) => studentName(data, row.student_id),
    listSubtitle: (row, data) => {
      const klass = data.students.find((student) => student.id === row.student_id)
      return `${row.month_year} · ${money(Number(row.amount_paid))} · ${String(row.status ?? '').toUpperCase()}${klass ? ` · ${classLabelOf(data, klass.class_id)}` : ''}`
    },
    fields: (data) => [
      { key: 'student_id', label: 'Student', type: 'select', required: true, options: studentOptions(data) },
      { key: 'month_year', label: 'Month / year', required: true, placeholder: 'Nov 2026' },
      { key: 'amount_paid', label: 'Amount (Rs)', type: 'number', required: true },
      { key: 'payment_date', label: 'Payment date', placeholder: 'YYYY-MM-DD' },
      {
        key: 'status', label: 'Status', type: 'select', options: [
          { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' },
        ],
      },
    ],
    initial: (row, data) => ({
      student_id: row?.student_id ?? studentOptions(data)[0]?.value ?? '',
      month_year: row?.month_year ?? currentMonth(),
      amount_paid: row?.amount_paid ?? 0,
      payment_date: row?.payment_date ? String(row.payment_date).slice(0, 10) : currentDate(),
      status: row?.status ?? 'paid',
    }),
    toRow: (values) => ({
      student_id: values.student_id || null,
      month_year: String(values.month_year ?? '').trim(),
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
    listSubtitle: (row, data) => {
      if (!row.issued_to) return `${row.author || 'Unknown author'} · Available`
      const student = data.students.find((item) => item.id === row.issued_to)
      const klass = student ? classLabelOf(data, student.class_id) : ''
      return `${row.author || 'Unknown author'} · Issued to ${studentName(data, row.issued_to)}${klass ? ` (${klass})` : ''}`
    },
    fields: (data) => [
      { key: 'title', label: 'Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' },
      {
        key: 'issued_to', label: 'Issued to', type: 'select', options: studentOptions(data, 'Not issued'),
        hint: 'Status and issue date are set automatically from this link.',
      },
    ],
    initial: (row) => ({
      title: row?.title ?? '',
      author: row?.author ?? '',
      isbn: row?.isbn ?? '',
      issued_to: row?.issued_to ?? '',
    }),
    toRow: (values, row) => {
      const issuedTo = values.issued_to ? String(values.issued_to) : null
      return {
        title: String(values.title ?? '').trim(),
        author: String(values.author ?? '').trim(),
        isbn: String(values.isbn ?? '').trim(),
        status: issuedTo ? 'issued' : 'available',
        issued_to: issuedTo,
        issue_date: issuedTo ? (row?.issued_to === issuedTo && row?.issue_date ? String(row.issue_date).slice(0, 10) : currentDate()) : null,
      }
    },
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
      const count = data.transportPassengers.filter((passenger) => passenger.route_id === row.id).length
      return `Driver: ${row.driver || '—'} · Vehicle ${row.vehicle_no || '—'} · ${count} student${count === 1 ? '' : 's'}`
    },
    fields: () => [
      { key: 'route_name', label: 'Route name', required: true, placeholder: 'e.g. Raiwind Road Route' },
      { key: 'driver', label: 'Driver name' },
      { key: 'vehicle_no', label: 'Vehicle number' },
    ],
    initial: (row) => ({
      route_name: row?.route_name ?? '',
      driver: row?.driver ?? '',
      vehicle_no: row?.vehicle_no ?? '',
    }),
    toRow: (values) => ({
      route_name: String(values.route_name ?? '').trim(),
      driver: String(values.driver ?? '').trim(),
      vehicle_no: String(values.vehicle_no ?? '').trim(),
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
      const count = data.hostelAssignments.filter((assignment) => assignment.room_id === row.id).length
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
      room_no: String(values.room_no ?? '').trim(),
      capacity: Math.max(1, Number(values.capacity ?? 1)),
    }),
  },
]

export function moduleById(id: string | null | undefined) {
  return MODULES.find((module) => module.id === id) ?? null
}
