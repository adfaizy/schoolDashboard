import { ArrowRightLeft, Check, Pencil, Trash2, X } from 'lucide-react'
import type { UpdateController } from '../hooks/useAppUpdate'
import type { DashboardController } from '../hooks/useDashboardData'
import type { DeleteTarget, ModalState } from '../lib/forms'
export type TransferTarget = {
  kind: 'student' | 'teacher' | 'class' | 'subject'
  id: string
  name: string
  currentClassId?: string | null
  subject?: string
}

export type TransferOption = { value: string; label: string }

export type ViewProps = {
  controller: DashboardController
  onEdit: (modal: ModalState) => void
  onDelete: (target: DeleteTarget) => void
  onTransfer: (target: TransferTarget) => void
  onNotify: (message: string, kind: 'success' | 'error') => void
  update: UpdateController
  /** Jump into a Manage module, used by quick actions and empty states. */
  onOpenModule: (moduleId: string) => void
}

export function RowActions({ onEdit, onDelete, onTransfer, transferLabel = 'Move' }: {
  onEdit: () => void
  onDelete: () => void
  onTransfer?: () => void
  transferLabel?: string
}) {
  const base = 'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors'
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {onTransfer && (
        <button
          onClick={(e) => { e.stopPropagation(); onTransfer() }}
          className={`${base} text-slate-500 hover:text-fuchsia-300 hover:bg-slate-800`}
          aria-label={transferLabel}
          title={transferLabel}
        >
          <ArrowRightLeft size={13} />
          <span className="text-[8px] font-bold leading-none">Move</span>
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className={`${base} text-slate-500 hover:text-cyan-400 hover:bg-slate-800`}
        aria-label="Edit"
      >
        <Pencil size={13} />
        <span className="text-[8px] font-bold leading-none">Edit</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className={`${base} text-slate-500 hover:text-rose-400 hover:bg-slate-800`}
        aria-label="Delete"
      >
        <Trash2 size={13} />
        <span className="text-[8px] font-bold leading-none">Delete</span>
      </button>
    </div>
  )
}

export function avatarSrc(url: string | null | undefined, name: string): string {
  if (url) return url
  const initials = name.split(' ').map((word) => word[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#2563EB"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#ffffff">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function EmptyState({ message, onAdd }: { message: string; onAdd?: () => void }) {
  return (
    <div className="px-6 py-12 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
        <Pencil size={20} />
      </div>
      <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">{message}</p>
      {onAdd && (
        <button onClick={onAdd} className="mt-4 text-xs font-bold text-cyan-400">
          + Add your first record
        </button>
      )}
    </div>
  )
}

export function TransferDialog({ title, description, options, value, onChange, onClose, onConfirm, busy, confirmLabel = 'Transfer', subjectOptions, subjectValue, onSubjectChange, subjectLabel = 'Subject' }: {
  title: string
  description: string
  options: TransferOption[]
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  busy?: boolean
  confirmLabel?: string
  subjectOptions?: TransferOption[]
  subjectValue?: string
  onSubjectChange?: (value: string) => void
  subjectLabel?: string
}) {
  return (
    <div className="absolute inset-0 z-[76] flex items-center justify-center bg-[#e4e4e7]/85 backdrop-blur-sm p-6 fade-in-up">
      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-900" aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <label className="block mt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination class</span>
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-200"
          >
            <option value="">Select destination class…</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {options.length === 0 && (
          <p className="text-[10px] text-amber-400 mt-1.5">Add another class first, then transfer this record.</p>
        )}
        {subjectOptions && onSubjectChange && (
          <label className="block mt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{subjectLabel}</span>
            <select
              value={subjectValue ?? ''}
              onChange={(event) => onSubjectChange(event.target.value)}
              className="mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-200"
            >
              <option value="">Keep current subject</option>
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!value || busy}
            className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check size={15} /> {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 active:scale-95 transition-all"
    >
      <span className="text-base leading-none">+</span>
      {label && <span>{label}</span>}
    </button>
  )
}
