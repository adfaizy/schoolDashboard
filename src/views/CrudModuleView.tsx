import { useState } from 'react'
import { ArrowLeft, Check, Plus, Trash2, Users } from 'lucide-react'
import { DataModal, type FormValues } from '../components/DataModal'
import { RowActions, type ViewProps } from './shared'
import type { ModuleDefinition } from '../lib/modules'

function InlineConfirm({ label, onConfirm, onCancel, busy }: {
  label: string; onConfirm: () => void; onCancel: () => void; busy?: boolean
}) {
  return (
    <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 fade-in-up">
      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
        <h3 className="text-base font-bold text-slate-100">Delete this record?</h3>
        <p className="text-xs text-slate-400 mt-2"><span className="font-semibold text-slate-300">{label}</span> will be removed.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 py-3 rounded-xl bg-rose-500 text-sm font-bold text-white disabled:opacity-60">
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CrudModuleView({ module, controller, onNotify, onBack }: ViewProps & {
  module: ModuleDefinition
  onBack: () => void
}) {
  const { data } = controller
  const rows = (data as any)[listKey(module.table)] as Array<Record<string, any>> ?? []
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)
  const [busy, setBusy] = useState(false)
  const [assignTo, setAssignTo] = useState<any | null>(null)
  const [studentToAdd, setStudentToAdd] = useState('')

  const isRoute = module.table === 'transport_routes'
  const isRoom = module.table === 'hostel_rooms'
  const showAssign = isRoute || isRoom
  const assigned: Array<Record<string, any>> = assignTo
    ? (isRoute
        ? data.transportPassengers.filter((p) => p.route_id === assignTo.id)
        : data.hostelAssignments.filter((p) => p.room_id === assignTo.id))
    : []
  const unassignedStudents = data.students.filter((s) => !assigned.some((a) => a.student_id === s.id))
  const assignedCount = assigned.length
  const capacityFull = isRoom && assignTo ? assignedCount >= Number(assignTo.capacity ?? 1) : false

  async function save(values: FormValues) {
    setBusy(true)
    try {
      const row = editing ?? undefined
      const toRow = module.toRow(values, row, data)
      const payload = row ? { ...toRow, id: row.id } : toRow
      await controller.saveModule(module.table as any, payload)
      onNotify(editing ? 'Saved' : 'Added', 'success')
      setEditing(null)
      setCreating(false)
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Could not save', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await controller.deleteModule(module.table as any, deleting.id)
      onNotify('Deleted', 'success')
      setDeleting(null)
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Could not delete', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function assignStudent() {
    if (!assignTo || !studentToAdd) return
    setBusy(true)
    try {
      const table = isRoute ? 'transport_passengers' : 'hostel_assignments'
      const parentId = isRoute ? 'route_id' : 'room_id'
      await controller.saveModule(table, { [parentId]: assignTo.id, student_id: studentToAdd })
      onNotify('Student assigned', 'success')
      setStudentToAdd('')
    } finally {
      setBusy(false)
    }
  }

  async function removeAssignment(id: string) {
    const table = isRoute ? 'transport_passengers' : 'hostel_assignments'
    await controller.deleteModule(table, id)
    onNotify('Removed', 'success')
  }

  const fields = module.fields(data)
  const initial = editing ? module.initial(editing, data) : module.initial(undefined, data)

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-100 flex-1 tracking-wide">{module.label}</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold"
        >
          <Plus size={14} /> Add
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl border ${module.accent} flex items-center justify-center mb-4`}>
            <module.icon size={22} />
          </div>
          <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">Nothing here yet. Tap <span className="text-cyan-400 font-semibold">+ Add</span> to create your first record.</p>
        </div>
      ) : (
        <div className="px-6 flex flex-col gap-2 mt-2">
          {rows.map((row) => (
            <div
              key={row.id}
              onClick={() => setEditing(row)}
              className="w-full text-left bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3 hover:border-cyan-500/40 cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{module.listTitle(row, data)}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{module.listSubtitle(row, data)}</p>
              </div>
              {showAssign && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAssignTo(assignTo?.id === row.id ? null : row) }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800"
                  aria-label="Assign students"
                >
                  <Users size={14} />
                </button>
              )}
              <RowActions
                onEdit={() => setEditing(row)}
                onDelete={() => setDeleting(row)}
              />
            </div>
          ))}
        </div>
      )}

      {showAssign && assignTo && (
        <div className="px-6 mt-5 mb-6">
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Students on {isRoute ? assignTo.route_name : `room ${assignTo.room_no}`}
                <span className="text-slate-500 normal-case font-medium"> ({assignedCount}{isRoom ? `/${assignTo.capacity}` : ''})</span>
              </h3>
              {isRoom && <span className={`text-[10px] font-bold uppercase ${capacityFull ? 'text-rose-400' : 'text-slate-500'}`}>{capacityFull ? 'Full' : 'Available'}</span>}
            </div>
            {assigned.length === 0 && <p className="text-xs text-slate-500 mb-3">No students assigned yet.</p>}
            <div className="flex flex-col gap-1.5 mb-3">
              {assigned.map((a) => {
                const s = data.students.find((x) => x.id === a.student_id)
                return (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-slate-200 bg-slate-950/50 rounded-xl px-3 py-2">
                    <span className="flex-1">{s?.name ?? 'Unknown student'}</span>
                    <button onClick={() => removeAssignment(a.id)} className="text-slate-500 hover:text-rose-400" aria-label="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <select
                value={studentToAdd}
                onChange={(e) => setStudentToAdd(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Select student…</option>
                {unassignedStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                onClick={assignStudent}
                disabled={!studentToAdd || capacityFull}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
              >
                <Check size={13} /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <DataModal
          title={editing ? `Edit ${module.label}` : `Add ${module.label}`}
          fields={fields}
          initial={initial}
          saving={busy}
          onSave={save}
          onClose={() => { setEditing(null); setCreating(false) }}
        />
      )}
      {deleting && (
        <InlineConfirm
          label={module.listTitle(deleting, data)}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function listKey(table: string): string {
  switch (table) {
    case 'classes': return 'classes'
    case 'staff': return 'staff'
    case 'exam_marks': return 'examMarks'
    case 'fees': return 'fees'
    case 'library_books': return 'books'
    case 'transport_routes': return 'routes'
    case 'hostel_rooms': return 'hostelRooms'
    default: return table
  }
}
