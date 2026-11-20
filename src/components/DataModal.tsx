import { useState, type FormEvent } from 'react'
import { Loader2, X } from 'lucide-react'

export type Field = {
  key: string
  label: string
  type?: 'text' | 'number' | 'select' | 'checkbox'
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  hint?: string
}

export type FormValues = Record<string, string | number | boolean | null>

export function DataModal({
  title, fields, initial, saving, onSave, onClose,
}: {
  title: string
  fields: Field[]
  initial?: FormValues
  saving?: boolean
  onSave: (values: FormValues) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<FormValues>(() => {
    const seed: FormValues = {}
    fields.forEach((field) => {
      seed[field.key] = initial?.[field.key] ?? (field.type === 'checkbox' ? false : '')
    })
    return seed
  })

  function set(key: string, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const output: FormValues = {}
    fields.forEach((field) => {
      const raw = values[field.key]
      if (field.type === 'checkbox') {
        output[field.key] = Boolean(raw)
      } else if (field.type === 'number') {
        output[field.key] = raw === '' || raw === null ? 0 : Number(raw)
      } else {
        const text = String(raw ?? '').trim()
        output[field.key] = text === '' ? null : text
      }
    })
    onSave(output)
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-end bg-[#cbd5e1]/80 backdrop-blur-sm fade-in-up">
      <div className="w-full max-h-[88%] overflow-y-auto scrollbar-hide bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-slate-900" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {fields.map((field) => {
            const value = values[field.key]
            if (field.type === 'checkbox') {
              return (
                <label key={field.key} className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => set(field.key, e.target.checked)}
                    className="w-5 h-5 rounded accent-cyan-500 bg-slate-800"
                  />
                  {field.label}
                </label>
              )
            }
            return (
              <div key={field.key}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={String(value ?? '')}
                    required={field.required}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(value ?? '')}
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                )}
                {field.hint && <p className="text-[10px] text-slate-500 mt-1.5">{field.hint}</p>}
              </div>
            )
          })}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save to Supabase'}
          </button>
        </form>
      </div>
    </div>
  )
}
