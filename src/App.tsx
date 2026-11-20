import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BookOpen, Grid3X3, Home, MessageSquare, User, Users, LogOut, ShieldCheck, ArrowLeft } from 'lucide-react'
import { DataModal, type FormValues } from './components/DataModal'
import { SetupScreen } from './components/SetupScreen'
import { AuthScreen } from './components/AuthScreen'
import { Toast, type ToastState } from './components/Toast'
import { modalConfig, type DeleteTarget, type ModalState } from './lib/forms'
import { isConfigured, supabase } from './lib/supabase'
import { clearAllCaches, clearLegacyCaches } from './lib/localData'
import { classLabel, sortedClasses } from './lib/school'
import { useAppUpdate } from './hooks/useAppUpdate'
import { initLiveUpdate } from './lib/updates'
import { useDashboardData, type DashboardController } from './hooks/useDashboardData'
import { TimetableView } from './views/TimetableView'
import { HomeView } from './views/HomeView'
import { ManageView } from './views/ManageView'
import { ModuleScreen } from './views/ModuleScreen'
import { MessagesView } from './views/MessagesView'
import { ProfileView } from './views/ProfileView'
import { StudentsView } from './views/StudentsView'
import { AdminView } from './views/AdminView'
import { TransferDialog, type TransferTarget } from './views/shared'

function joinSubjects(...lists: Array<string[] | string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const list of lists) {
    const values = Array.isArray(list) ? list : [list]
    for (const value of values) {
      const subject = String(value ?? '').trim()
      const key = subject.toLowerCase()
      if (!subject || seen.has(key)) continue
      seen.add(key)
      result.push(subject)
    }
  }
  return result
}

function periodKey(item: { period_no?: number | null; time?: string | null }): string {
  return item.period_no != null ? `p${item.period_no}` : `t${item.time ?? ''}`
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f1f3f7] flex items-center justify-center sm:p-6 font-sans selection:bg-cyan-500/30">
      <div className="w-full h-screen sm:h-[850px] max-w-[400px] bg-slate-950 relative overflow-hidden sm:rounded-[2.5rem] sm:border-[8px] border-slate-800 shadow-2xl flex flex-col">
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
  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null)
  const [transferClassId, setTransferClassId] = useState('')
  const [transferSubject, setTransferSubject] = useState('')
  const [transferring, setTransferring] = useState(false)
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

  async function confirmTransfer() {
    if (!transferTarget || !transferClassId || transferring) return
    const data = controller.data
    const klass = data.classes.find((row) => row.id === transferClassId)
    if (!klass) return
    setTransferring(true)
    try {
      if (transferTarget.kind === 'student') {
        const student = data.students.find((row) => row.id === transferTarget.id)
        if (!student) throw new Error('Student not found.')
        await controller.saveRecord('students', {
          ...student,
          class_id: klass.id,
          grade: classLabel(klass),
        })
        showToast(`${student.name} moved to ${classLabel(klass)}`, 'success')
      } else if (transferTarget.kind === 'teacher') {
        const teacher = data.staff.find((row) => row.id === transferTarget.id)
        if (!teacher) throw new Error('Teacher not found.')
        const assignments = data.schedule.filter(
          (row) => row.teacher === teacher.name && row.class_id !== klass.id,
        )
        if (assignments.length === 0) {
          showToast(`${teacher.name} has no timetable periods assigned to another class.`, 'error')
          return
        }
        const movingIds = new Set(assignments.map((row) => row.id))
        const taken = new Set(
          data.schedule
            .filter((row) => row.class_id === klass.id && !movingIds.has(row.id))
            .map(periodKey),
        )
        const clash = assignments.find((row) => taken.has(periodKey(row)))
        if (clash) {
          showToast(`${classLabel(klass)} already has ${clash.period_no ? `period ${clash.period_no}` : clash.time}. Clear that slot first.`, 'error')
          return
        }
        const chosenSubject = transferSubject || assignments[0].subject
        await controller.applyModuleChanges(assignments.map((row) => ({
          table: 'schedule_items' as const,
          row: {
            ...row,
            teacher: teacher.name,
            subject: chosenSubject || row.subject,
            class_id: klass.id,
          },
        })))
        showToast(`${teacher.name}'s ${assignments.length} period${assignments.length === 1 ? '' : 's'} moved to ${classLabel(klass)}`, 'success')
      } else if (transferTarget.kind === 'class') {
        const source = data.classes.find((row) => row.id === transferTarget.id)
        if (!source || source.id === klass.id) throw new Error('Class not found.')
        const students = data.students.filter((row) => row.class_id === source.id)
        const periods = data.schedule.filter((row) => row.class_id === source.id)
        const taken = new Set(
          data.schedule.filter((row) => row.class_id === klass.id).map(periodKey),
        )
        const clash = periods.find((row) => taken.has(periodKey(row)))
        if (clash) {
          showToast(`${classLabel(klass)} already has ${clash.period_no ? `period ${clash.period_no}` : clash.time}. Clear that slot first.`, 'error')
          return
        }
        await controller.applyModuleChanges([
          ...students.map((row) => ({
            table: 'students' as const,
            row: { ...row, class_id: klass.id, grade: classLabel(klass) },
          })),
          ...periods.map((row) => ({
            table: 'schedule_items' as const,
            row: { ...row, class_id: klass.id },
          })),
          {
            table: 'classes' as const,
            row: { ...klass, subjects: joinSubjects(klass.subjects, source.subjects) },
          },
        ], [{ table: 'classes', id: source.id }])
        showToast(`${classLabel(source)} merged into ${classLabel(klass)}. ${students.length} student${students.length === 1 ? '' : 's'} moved.`, 'success')
      } else {
        const source = data.classes.find((row) => row.id === transferTarget.id)
        const subject = String(transferTarget.subject ?? '').trim()
        if (!source || !subject) throw new Error('Subject not found.')
        if (joinSubjects(klass.subjects).some((value) => value.toLowerCase() === subject.toLowerCase())) {
          showToast(`${classLabel(klass)} already studies ${subject}. Choose another class.`, 'error')
          return
        }
        const periods = data.schedule.filter(
          (row) => row.class_id === source.id && row.subject === subject,
        )
        const taken = new Set(
          data.schedule.filter((row) => row.class_id === klass.id).map(periodKey),
        )
        const clash = periods.find((row) => taken.has(periodKey(row)))
        if (clash) {
          showToast(`${classLabel(klass)} already has ${clash.period_no ? `period ${clash.period_no}` : clash.time}. Clear that slot first.`, 'error')
          return
        }
        await controller.applyModuleChanges([
          {
            table: 'classes' as const,
            row: {
              ...source,
              subjects: joinSubjects(source.subjects).filter((value) => value.toLowerCase() !== subject.toLowerCase()),
            },
          },
          {
            table: 'classes' as const,
            row: { ...klass, subjects: joinSubjects(klass.subjects, [subject]) },
          },
          ...periods.map((row) => ({
            table: 'schedule_items' as const,
            row: { ...row, class_id: klass.id, subject },
          })),
        ])
        showToast(`${subject} moved from ${classLabel(source)} to ${classLabel(klass)}.`, 'success')
      }
      setTransferTarget(null)
      setTransferClassId('')
      setTransferSubject('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not transfer record', 'error')
    } finally {
      setTransferring(false)
    }
  }

  const classOptions = sortedClasses(controller.data.classes)
    .filter((row) => row.id !== transferTarget?.currentClassId)
    .map((row) => ({ value: row.id, label: classLabel(row) }))

  const destination = controller.data.classes.find((row) => row.id === transferClassId)
  const teacherSubjects = transferTarget?.kind === 'teacher'
    ? joinSubjects(...controller.data.schedule
      .filter((row) => row.teacher === transferTarget.name)
      .map((row) => row.subject))
    : []
  const subjectOptions = transferTarget?.kind === 'teacher'
    ? joinSubjects(destination?.subjects ?? [], teacherSubjects).map((value) => ({ value, label: value }))
    : undefined

  function transferDescription(target: TransferTarget): string {
    if (target.kind === 'student') {
      return `${target.name} will be enrolled in the selected class. Grade and linked reports follow the new class.`
    }
    if (target.kind === 'teacher') {
      return `${target.name}'s timetable periods will move to the selected class with the chosen subject.`
    }
    if (target.kind === 'class') {
      return `All students and timetable periods in ${target.name} will move here. ${target.name} will then be deleted.`
    }
    return `${target.name} will be taught in the selected class instead. Past exam marks stay with students.`
  }

  const shared = {
    controller,
    onEdit: setModal,
    onDelete: setDeleteTarget,
    onTransfer: (target: TransferTarget) => {
      setTransferClassId('')
      setTransferSubject(target.kind === 'teacher'
        ? joinSubjects(...controller.data.schedule
          .filter((row) => row.teacher === target.name)
          .map((row) => row.subject))[0] ?? ''
        : '')
      setTransferTarget(target)
    },
    onNotify: showToast,
    onSignOut,
    update,
  }

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

      <nav className="absolute bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 pb-6 pt-3 px-6 z-50">
        <div className="flex items-center gap-2 mb-2 px-1">
          {isAdmin ? (
            <button onClick={() => { setActiveTab('admin'); setModuleId(null) }} className="shrink-0 px-2.5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-bold text-cyan-300 flex items-center gap-1 hover:bg-cyan-500/20">
              <ShieldCheck size={13} /> Schools
            </button>
          ) : <span className="text-[10px] font-semibold text-slate-500 pr-1">Signed in</span>}
          <button
            onClick={onSignOut}
            className="flex-1 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-[11px] font-bold text-rose-300 flex items-center justify-center gap-1.5 hover:bg-rose-500/20 active:scale-95 transition-all"
          >
            <LogOut size={14} /> Logout
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
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
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
        <div className="absolute inset-0 z-[75] flex items-center justify-center bg-[#e4e4e7]/85 backdrop-blur-sm p-6 fade-in-up">
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

      {transferTarget && (
        <TransferDialog
          title={
            transferTarget.kind === 'student' ? 'Transfer student'
              : transferTarget.kind === 'teacher' ? 'Transfer teacher'
                : transferTarget.kind === 'class' ? 'Transfer class' : 'Transfer subject'
          }
          description={transferDescription(transferTarget)}
          options={classOptions}
          value={transferClassId}
          onChange={setTransferClassId}
          onClose={() => { setTransferTarget(null); setTransferClassId(''); setTransferSubject('') }}
          onConfirm={() => void confirmTransfer()}
          busy={transferring}
          confirmLabel="Move"
          subjectOptions={subjectOptions}
          subjectValue={transferSubject}
          onSubjectChange={setTransferSubject}
          subjectLabel="Teacher's subject"
        />
      )}
    </>
  )
}

export default function App() {
  // Confirm the running bundle immediately, before login/session loading.
  // The LiveUpdate rollback timer starts when an update is staged, so waiting
  // for the dashboard to mount makes a healthy update look like a crash.
  useEffect(() => {
    void initLiveUpdate()
  }, [])

  const [showSetup, setShowSetup] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [role, setRole] = useState<'school' | 'admin'>('school')
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    // Old no-login versions stored shared demo data locally. Remove it on launch.
    clearLegacyCaches()
    if (!isConfigured || !supabase) {
      setSessionReady(true)
      return
    }
    let mounted = true
    let forceLogin = false
    try {
      // One-time reset after all old accounts were removed: clear every local
      // cache and start on the login screen regardless of a stale session.
      const resetKey = 'schooldashboard.auth.reset.20261120'
      forceLogin = !localStorage.getItem(resetKey)
      if (forceLogin) {
        clearAllCaches()
        localStorage.setItem(resetKey, '1')
      }
    } catch {
      // Storage unavailable — continue with the existing session.
    }
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
      const u = forceLogin ? null : data.session?.user
      void applySession(u ? { id: u.id, email: u.email } : null)
    })
    if (forceLogin) {
      void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
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
