import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BookOpen, Home, MessageSquare, User, Users } from 'lucide-react'
import { DataModal, type FormValues } from './components/DataModal'
import { SetupScreen } from './components/SetupScreen'
import { Toast, type ToastState } from './components/Toast'
import { modalConfig, type DeleteTarget, type ModalState } from './lib/forms'
import { useDashboardData, type DashboardController } from './hooks/useDashboardData'
import { AcademicsView } from './views/AcademicsView'
import { HomeView } from './views/HomeView'
import { MessagesView } from './views/MessagesView'
import { ProfileView } from './views/ProfileView'
import { StudentsView } from './views/StudentsView'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center sm:p-6 font-sans selection:bg-cyan-500/30">
      <div className="w-full h-screen sm:h-[850px] max-w-[400px] bg-slate-950 relative overflow-hidden sm:rounded-[2.5rem] sm:border-[8px] border-slate-900 shadow-2xl flex flex-col">
        {children}
      </div>
    </div>
  )
}

function Dashboard({
  controller, onConnect,
}: {
  controller: DashboardController
  onConnect: () => void
}) {
  const [activeTab, setActiveTab] = useState('home')
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showToast = useCallback((message: string, kind: 'success' | 'error') => {
    setToast({ message, kind })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (controller.error) showToast(controller.error, 'error')
  }, [controller.error, showToast])

  const config = modal ? modalConfig(modal, controller.data.profile, controller.data.settings) : null

  function asImageUrl(value: FormValues[string] | undefined): string | null {
    if (value === null || value === undefined || value === '') return null
    return String(value)
  }

  async function handleSave(values: FormValues) {
    if (!modal) return
    setSaving(true)
    try {
      switch (modal.kind) {
        case 'student':
          await controller.saveRecord('students', {
            ...(modal.row ? { id: modal.row.id } : {}),
            name: String(values.name ?? ''),
            grade: String(values.grade ?? ''),
            attendance: Number(values.attendance ?? 0),
            status: String(values.status ?? 'Good'),
            avatar_url: asImageUrl(values.avatar_url),
          })
          break
        case 'schedule':
          await controller.saveRecord('schedule_items', {
            ...(modal.row ? { id: modal.row.id } : {}),
            day: String(values.day ?? 'Today'),
            time: String(values.time ?? ''),
            subject: String(values.subject ?? ''),
            teacher: String(values.teacher ?? ''),
            room: String(values.room ?? ''),
            color: String(values.color ?? 'cyan'),
          })
          break
        case 'message':
          await controller.saveRecord('messages', {
            ...(modal.row ? { id: modal.row.id } : {}),
            name: String(values.name ?? ''),
            msg: String(values.msg ?? ''),
            time: String(values.time ?? ''),
            unread: Number(values.unread ?? 0),
            is_group: Boolean(values.is_group),
            avatar_url: asImageUrl(values.avatar_url),
          })
          break
        case 'event':
          await controller.saveRecord('events', {
            ...(modal.row ? { id: modal.row.id } : {}),
            type: String(values.type ?? 'Notice'),
            title: String(values.title ?? ''),
            time: String(values.time ?? ''),
            accent: String(values.accent ?? 'cyan'),
            icon: String(values.icon ?? 'FileText'),
          })
          break
        case 'profile':
          await controller.saveProfile({
            full_name: String(values.full_name ?? ''),
            role_title: String(values.role_title ?? ''),
            avatar_url: asImageUrl(values.avatar_url),
          })
          break
        case 'settings':
          await controller.saveSettings({
            total_teachers: Number(values.total_teachers ?? 0),
            pending_fees: String(values.pending_fees ?? ''),
          })
          break
      }
      showToast('Saved', 'success')
      setModal(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save data', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await controller.deleteRecord(deleteTarget.table, deleteTarget.id)
      showToast('Deleted', 'success')
      setDeleteTarget(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete data', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const shared = { controller, onEdit: setModal, onDelete: setDeleteTarget, onNotify: showToast }

  return (
    <>
      {controller.loading && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400/80 animate-pulse z-[90]" />}
      <Toast toast={toast} onDismiss={dismissToast} />

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {activeTab === 'home' && <HomeView {...shared} onTabChange={setActiveTab} />}
        {activeTab === 'students' && <StudentsView {...shared} />}
        {activeTab === 'academics' && <AcademicsView {...shared} />}
        {activeTab === 'messages' && <MessagesView {...shared} />}
        {activeTab === 'profile' && <ProfileView {...shared} onConnect={onConnect} />}
      </div>

      <nav className="absolute bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900/80 pb-6 pt-3 px-6 z-50">
        <ul className="flex justify-between items-center">
          {[
            { id: 'home', icon: <Home size={22} />, label: 'Home' },
            { id: 'students', icon: <Users size={22} />, label: 'Students' },
            { id: 'academics', icon: <BookOpen size={22} />, label: 'Academics' },
            { id: 'messages', icon: <MessageSquare size={22} />, label: 'Messages' },
            { id: 'profile', icon: <User size={22} />, label: 'Profile' },
          ].map((item) => {
            const isActive = activeTab === item.id
            return (
              <li key={item.id}>
                <button onClick={() => setActiveTab(item.id)} className="flex flex-col items-center gap-1.5 relative p-2">
                  <div className={`${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'} transition-colors relative`}>
                    {item.icon}
                    {isActive && (
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    )}
                  </div>
                  <span className={`text-[9px] font-medium ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {config && (
        <DataModal
          title={config.title}
          fields={config.fields}
          initial={config.initial}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 fade-in-up">
          <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
            <h3 className="text-base font-bold text-slate-100">Delete this record?</h3>
            <p className="text-xs text-slate-400 mt-2">
              <span className="font-semibold text-slate-300">{deleteTarget.label}</span> will be removed.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-rose-500 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  const controller = useDashboardData()
  const [showSetup, setShowSetup] = useState(false)

  return (
    <Shell>
      {showSetup ? (
        <SetupScreen onCancel={() => setShowSetup(false)} />
      ) : (
        <Dashboard controller={controller} onConnect={() => setShowSetup(true)} />
      )}
    </Shell>
  )
}
