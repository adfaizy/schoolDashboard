import { Pencil, Trash2 } from 'lucide-react'
import type { UpdateController } from '../hooks/useAppUpdate'
import type { DashboardController } from '../hooks/useDashboardData'
import type { DeleteTarget, ModalState } from '../lib/forms'

export type ViewProps = {
  controller: DashboardController
  onEdit: (modal: ModalState) => void
  onDelete: (target: DeleteTarget) => void
  onNotify: (message: string, kind: 'success' | 'error') => void
  update: UpdateController
  /** Jump into a Manage module, used by quick actions and empty states. */
  onOpenModule: (moduleId: string) => void
}

export function RowActions({ onEdit, onDelete }: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        aria-label="Edit"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        aria-label="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export function avatarSrc(url: string | null | undefined, name: string): string {
  if (url) return url
  const initials = name.split(' ').map((word) => word[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1e293b"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#22d3ee">${initials}</text></svg>`
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
