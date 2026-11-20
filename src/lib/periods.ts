export type PeriodDef = {
  no: number
  label: string
  start: string
  end: string
}

/** The school's daily bell schedule. Shared by the grid and every module. */
export const PERIODS: PeriodDef[] = [
  { no: 1, label: 'P-1', start: '8:45 AM', end: '9:30 AM' },
  { no: 2, label: 'P-2', start: '9:30 AM', end: '10:00 AM' },
  { no: 3, label: 'P-3', start: '10:00 AM', end: '10:30 AM' },
  { no: 4, label: 'P-4', start: '10:30 AM', end: '11:00 AM' },
  { no: 5, label: 'P-5', start: '11:00 AM', end: '11:30 AM' },
  { no: 6, label: 'P-6', start: '12:00 PM', end: '12:30 PM' },
  { no: 7, label: 'P-7', start: '12:30 PM', end: '1:00 PM' },
  { no: 8, label: 'P-8', start: '1:00 PM', end: '1:30 PM' },
]

export const BREAK_AFTER = 5

export const BREAK = { label: 'Break', start: '11:30 AM', end: '12:00 PM' }

export function periodTime(period: PeriodDef): string {
  return `${period.start} – ${period.end}`
}

export function periodByNo(no: number): PeriodDef | undefined {
  return PERIODS.find((period) => period.no === no)
}
