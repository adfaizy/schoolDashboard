import {
  AlertCircle, Bell, BookOpen, CalendarDays, CheckCircle2, Clock,
  CreditCard, FileText, GraduationCap, Home, MessageSquare, Phone,
  Plus, Search, Settings, User, Users, type LucideIcon,
} from 'lucide-react'

export const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=47'

/** Static class strings so Tailwind keeps them in the production build. */
export const COLORS: Record<string, {
  text: string; bg: string; border: string; accent: string; solid: string
}> = {
  cyan: {
    text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
    accent: 'border-cyan-500', solid: 'bg-cyan-500',
  },
  purple: {
    text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30',
    accent: 'border-purple-500', solid: 'bg-purple-500',
  },
  emerald: {
    text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    accent: 'border-emerald-500', solid: 'bg-emerald-500',
  },
  rose: {
    text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30',
    accent: 'border-rose-500', solid: 'bg-rose-500',
  },
  amber: {
    text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    accent: 'border-amber-500', solid: 'bg-amber-500',
  },
  slate: {
    text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30',
    accent: 'border-slate-500', solid: 'bg-slate-500',
  },
}

export const COLOR_OPTIONS = Object.keys(COLORS).map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export function colorFor(key?: string | null) {
  return COLORS[key ?? ''] ?? COLORS.cyan
}

export const ICONS: Record<string, LucideIcon> = {
  AlertCircle, Bell, BookOpen, CalendarDays, CheckCircle2, Clock,
  CreditCard, FileText, GraduationCap, Home, MessageSquare, Phone,
  Plus, Search, Settings, User, Users,
}

export const ICON_OPTIONS = [
  'FileText', 'Users', 'AlertCircle', 'CalendarDays', 'Bell', 'CheckCircle2', 'GraduationCap',
].map((value) => ({ value, label: value }))

export function Icon({ name, size = 18, className = '' }: {
  name?: string | null; size?: number; className?: string
}) {
  const Component = ICONS[name ?? ''] ?? FileText
  return <Component size={size} className={className} />
}

export function attendanceColor(attendance: number): string {
  if (attendance >= 100) return 'text-emerald-400'
  if (attendance >= 90) return 'text-cyan-400'
  if (attendance >= 80) return 'text-amber-400'
  return 'text-rose-400'
}
