import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export type ToastState = { message: string; kind: 'success' | 'error' } | null

export function Toast({ toast, onDismiss }: {
  toast: ToastState
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onDismiss, 3500)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  const isError = toast.kind === 'error'

  return (
    <div className="absolute top-3 left-4 right-4 z-[80] fade-in-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${
        isError
          ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
          : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
      }`}>
        {isError ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
        <p className="flex-1 text-xs font-medium leading-snug">{toast.message}</p>
        <button onClick={onDismiss} className="p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
