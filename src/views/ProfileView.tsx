import { Bell, Camera, ChevronRight, Database, Download, LogOut, Phone, RefreshCw, RotateCcw, Settings, User } from 'lucide-react'
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { DEFAULT_AVATAR } from '../lib/styles'
import { isConfigured } from '../lib/supabase'
import { avatarSrc, type ViewProps } from './shared'

export function ProfileView({ controller, onEdit, onNotify, onSignOut, onConnect, update }: ViewProps & {
  onConnect: () => void
}) {
  const profile = controller.data.profile
  const name = profile?.full_name ?? 'School Principal'
  const role = profile?.role_title ?? 'Not set yet'
  const schoolName = controller.data.settings?.school_name?.trim()

  async function takePhoto() {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 70,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        allowEditing: true,
        width: 400,
        height: 400,
        correctOrientation: true,
      })
      if (!photo.dataUrl) return
      await controller.saveProfile({ full_name: name, role_title: role, avatar_url: photo.dataUrl })
      onNotify('Profile photo updated', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message && !/cancel/i.test(message)) onNotify(`Camera: ${message}`, 'error')
    }
  }

  async function retry() {
    const ok = await controller.retryConnection()
    onNotify(ok ? 'Supabase reconnected' : 'Still offline — using device storage', ok ? 'success' : 'error')
  }

  const menu = [
    { icon: <User size={18} />, label: 'Personal Details', action: () => onEdit({ kind: 'profile' }) },
    { icon: <Bell size={18} />, label: 'Notifications', action: () => onEdit({ kind: 'event' }) },
    { icon: <Settings size={18} />, label: 'School Details', action: () => onEdit({ kind: 'settings' }) },
    {
      icon: <Phone size={18} />,
      label: 'Support & Help',
      action: () => onNotify('Contact your school IT administrator for help.', 'success'),
    },
    ...(isConfigured && controller.usingLocal
      ? [{ icon: <RefreshCw size={18} />, label: 'Retry Supabase sync', action: retry }]
      : []),
    ...(update.pending
      ? [{ icon: <RotateCcw size={18} />, label: 'Restart to apply update', action: () => void update.restart() }]
      : []),
    {
      icon: <Download size={18} />,
      label: update.busy ? 'Checking for updates...' : 'Check for updates',
      action: () => void update.check(true),
    },
    {
      icon: <Database size={18} />,
      label: isConfigured ? 'Supabase connection' : 'Connect Supabase',
      action: onConnect,
    },
  ]

  return (
    <div className="fade-in-up">
      <div className="px-6 pt-16 pb-8 flex flex-col items-center">
        <div className="relative mb-4">
          <img src={avatarSrc(profile?.avatar_url ?? DEFAULT_AVATAR, name)} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl object-cover" />
          <button
            onClick={takePhoto}
            className="absolute bottom-0 right-0 w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center text-slate-950 border-4 border-slate-950 hover:scale-105 active:scale-95 transition-transform"
            aria-label="Take profile photo"
          >
            <Camera size={15} />
          </button>
        </div>
        <p className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider mb-2">Tap camera to take photo</p>
        <h2 className="text-xl font-bold text-slate-100">{name}</h2>
        <p className="text-sm text-cyan-400 font-medium mt-1">{role}</p>
        {schoolName && <p className="text-[11px] text-slate-400 mt-1">{schoolName}</p>}
        <p className="text-[11px] text-slate-500 mt-2">
          {controller.usingLocal ? 'Stored on this device' : 'Synced with Supabase'}
        </p>
      </div>

      <div className="px-6 flex flex-col gap-3">
        {menu.map((item) => (
          <button key={item.label} onClick={item.action} className="w-full bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors">
            <div className="text-slate-400">{item.icon}</div>
            <span className="flex-1 text-left text-sm font-medium text-slate-200">{item.label}</span>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        ))}
      </div>

      <div className="px-6 mt-4">
        <button
          onClick={onSignOut}
          className="w-full py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center gap-2 text-sm font-bold text-rose-600 hover:bg-rose-500/20 active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          Logout / Switch account
        </button>
      </div>

      <div className="px-6 mt-4 pb-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">App updates</p>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Installed version</span>
            <span className="font-mono text-slate-300">{update.version ?? 'bundled'}</span>
          </div>
          {update.pending && (
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>Ready to apply</span>
              <span className="font-mono text-cyan-400">{update.pending}</span>
            </div>
          )}
          {update.message && <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{update.message}</p>}
          <p className="text-[10px] text-slate-600 mt-3 truncate" title={update.source}>Updates from {update.source}</p>
        </div>
      </div>
    </div>
  )
}
