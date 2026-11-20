import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BookOpen, Grid3X3, Home, MessageSquare, User, Users, LogOut, ShieldCheck, ArrowLeft } from 'lucide-react'
import { DataModal, type FormValues } from './components/DataModal'
import { SetupScreen } from './components/SetupScreen'
import { AuthScreen } from './components/AuthScreen'
import { Toast, type ToastState } from './components/Toast'
import { modalConfig, type DeleteTarget, type ModalState } from './lib/forms'
import { isConfigured, supabase } from './lib/supabase'
import { useAppUpdate } from './hooks/useAppUpdate'
import { useDashboardData, type DashboardController } from './hooks/useDashboardData'
import { TimetableView } from './views/TimetableView'
import { HomeView } from './views/HomeView'
import { ManageView } from './views/ManageView'
import { ModuleScreen } from './views/ModuleScreen'
import { MessagesView } from './views/MessagesView'
import { ProfileView } from './views/ProfileView'
import { StudentsView } from './views/StudentsView'
import { AdminView } from './views/AdminView'

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
  controller, onConnect, onSignOut, isAdmin, adminEmail, viewing, onViewSchool, onExitSchoolView,
}: {
  controller: DashboardController
  onConnect: () => void
  onSignOut: () => void
  isAdmin: boolean
  adminEmail?: string
  viewing: { id: string; name: string } | null
  onViewSchool: (userId: string, name: string) => void
  onExitSchoolView: () => void
}) {
  const [activeTab, setActiveTab] = useState(isAdmin && !viewing ? 'admin' : 'home')
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showToast = useCallback((message: string, kind: 'success' | 'error') => {
    setToast({ message, kind })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])
  const update = useAppUpdate(showToast)

  useEffect(() => {
    if (isAdmin && !viewing) setActiveTab('admin')
    else if (activeTab === 'admin') setActiveTab('home')
  }, [isAdmin, viewing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (controller.error) showToast(controller.error, 'error')
  }, [controller.error, showToast])

  const config = modal ? modalConfig(modal, controller.data) : null

  function asImageUrl(value: FormValues[string] | undefined): string | null {
    if (value === null || value === undefined || value === '') return null
    return String(value)
  }

  async function handleSave(values: FormValues) {
    if (!modal) return
    setSaving(true)
    try {
      switch (modal.kind) {
        case 'student': {
          const klass = controller.data.classes.find((row) => row.id === String(values.class_id ?? ''))
          await controller.saveRecord('students', {
            ...(modal.row ? { id: modal.row.id } : {}),
            name: String(values.name ?? '').trim(),
            class_id: values.class_id ? String(values.class_id) : null,
            grade: klass ? `${klass.grade}${klass.section ? ` ${klass.section}` : ''}` : (modal.row?.grade ?? ''),
            roll_no: values.roll_no ? String(values.roll_no) : null,
            father_name: values.father_name ? String(values.father_name) : null,
            parent_contact: values.parent_contact ? String(values.parent_contact) : null,
            admission_date: values.admission_date ? String(values.admission_date).slice(0, 10) : null,
            attendance: modal.row?.attendance ?? 0,
            status: modal.row?.status ?? 'No records',
            avatar_url: modal.row?.avatar_url ?? null,
          })
          break
        }
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
        case 'reply':
          await controller.saveRecord('messages', {
            id: modal.row.id,
            name: modal.row.name,
            msg: String(values.msg ?? ''),
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            unread: 0,
            is_group: modal.row.is_group,
            avatar_url: modal.row.avatar_url,
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
            school_name: values.school_name ? String(values.school_name).trim() : null,
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

  const shared = { controller, onEdit: setModal, onDelete: setDeleteTarget, onNotify: showToast, update }

  function selectTab(tab: string) {
    setActiveTab(tab)
    setModuleId(null)
  }

  function openModule(id: string) {
    setModuleId(id)
    setActiveTab('manage')
  }

  const viewProps = { ...shared, onOpenModule: openModule }

  return (
    <>
      {controller.loading && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400/80 animate-pulse z-[90]" />}
      <Toast toast={toast} onDismiss={dismissToast} />

      {isAdmin && viewing && (
        <div className="absolute top-0 left-0 right-0 z-[60] flex items-center justify-between gap-2 bg-cyan-500/15 border-b border-cyan-500/30 px-4 py-2">
          <div className="min-w-0 text-[10px] text-cyan-200 truncate">
            Viewing <span className="font-bold">{viewing.name}</span>
          </div>
          <button onClick={onExitSchoolView} className="flex items-center gap-1 text-[10px] font-semibold text-cyan-300 shrink-0">
            <ArrowLeft size={12} /> Schools
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto pb-24 scrollbar-hide ${isAdmin && viewing ? 'pt-8' : ''}`} style={{ scrollbarWidth: 'none' }}>
        {activeTab === 'admin' && isAdmin && (
          <AdminView adminEmail={adminEmail} onOpenSchool={onViewSchool} />
        )}
        {activeTab === 'home' && <HomeView {...viewProps} onTabChange={selectTab} />}
        {activeTab === 'students' && <StudentsView {...viewProps} />}
        {activeTab === 'academics' && <TimetableView {...viewProps} />}
        {activeTab === 'messages' && <MessagesView {...viewProps} />}
        {activeTab === 'manage' && (
          moduleId
            ? <ModuleScreen moduleId={moduleId} shared={viewProps} onBack={() => setModuleId(null)} />
            : <ManageView {...viewProps} onOpen={setModuleId} />
        )}
        {activeTab === 'profile' && <ProfileView {...viewProps} onConnect={onConnect} />}
      </div>

      <nav className="absolute bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900/80 pb-6 pt-3 px-6 z-50">
        <div className="flex items-center justify-between mb-2 px-1">
          {isAdmin ? (
            <button onClick={() => { setActiveTab('admin'); setModuleId(null) }} className="text-[10px] text-cyan-400 flex items-center gap-1 hover:text-cyan-300">
              <ShieldCheck size={12} /> Schools
            </button>
          ) : <span />}
          <button onClick={onSignOut} className="text-[10px] text-slate-500 flex items-center gap-1 hover:text-slate-300">
            <LogOut size={12} /> Sign out
          </button>
        </div>
        <ul className="flex justify-between items-center">
          {[
            { id: 'home', icon: <Home size={22} />, label: 'Home' },
            { id: 'students', icon: <Users size={22} />, label: 'Students' },
            { id: 'academics', icon: <BookOpen size={22} />, label: 'Timetable' },
            { id: 'manage', icon: <Grid3X3 size={22} />, label: 'Manage' },
            { id: 'messages', icon: <MessageSquare size={22} />, label: 'Messages' },
            { id: 'profile', icon: <User size={22} />, label: 'Profile' },
          ].map((item) => {
            const isActive = activeTab === item.id
            return (
              <li key={item.id}>
                <button onClick={() => selectTab(item.id)} className="flex flex-col items-center gap-1.5 relative p-2">
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
  const [showSetup, setShowSetup] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [role, setRole] = useState<'school' | 'admin'>('school')
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setSessionReady(true)
      return
    }
    let mounted = true
    async function applySession(sessionUser: { id: string; email?: string } | null) {
      if (!mounted) return
      setUser(sessionUser)
      setViewing(null)
      if (!sessionUser) {
        setRole('school')
        setSessionReady(true)
        return
      }
      try {
        const { data } = await supabase!
          .from('profiles')
          .select('role')
          .eq('id', sessionUser.id)
          .maybeSingle()
        if (mounted) setRole((data as { role?: 'school' | 'admin' } | null)?.role === 'admin' ? 'admin' : 'school')
      } catch {
        if (mounted) setRole('school')
      } finally {
        if (mounted) setSessionReady(true)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      void applySession(u ? { id: u.id, email: u.email } : null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      void applySession(u ? { id: u.id, email: u.email } : null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    controller.forgetLocal()
    if (viewing) controller.forgetLocal(viewing.id)
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const ownerId = viewing?.id ?? user?.id ?? null
  const controller = useDashboardData(Boolean(user), ownerId, role === 'admin')

  if (!isConfigured) {
    return (
      <Shell>
        <SetupScreen onCancel={() => setShowSetup(false)} />
      </Shell>
    )
  }
  if (!sessionReady) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
      </Shell>
    )
  }
  if (!user) {
    return (
      <Shell>
        {showSetup ? <SetupScreen onCancel={() => setShowSetup(false)} /> : <AuthScreen onShowSetup={() => setShowSetup(true)} />}
      </Shell>
    )
  }

  return (
    <Shell>
      {showSetup ? (
        <SetupScreen onCancel={() => setShowSetup(false)} />
      ) : (
        <Dashboard
          controller={controller}
          onConnect={() => setShowSetup(true)}
          onSignOut={handleSignOut}
          isAdmin={role === 'admin'}
          adminEmail={user.email}
          viewing={viewing}
          onViewSchool={(id, name) => { controller.forgetLocal(id); setViewing({ id, name }) }}
          onExitSchoolView={() => setViewing(null)}
        />
      )}
    </Shell>
  )
}
