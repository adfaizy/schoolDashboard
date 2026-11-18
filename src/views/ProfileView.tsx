import { Bell, ChevronRight, Database, Phone, Settings, User } from 'lucide-react'
import { DEFAULT_AVATAR } from '../lib/styles'
import { isConfigured } from '../lib/supabase'
import { avatarSrc, type ViewProps } from './shared'

export function ProfileView({ controller, onEdit, onNotify, onConnect }: ViewProps & {
  onConnect: () => void
}) {
  const profile = controller.data.profile
  const name = profile?.full_name ?? 'Principal Sarah'
  const role = profile?.role_title ?? 'Head of Administration'

  const menu = [
    { icon: <User size={18} />, label: 'Personal Details', action: () => onEdit({ kind: 'profile' }) },
    { icon: <Bell size={18} />, label: 'Notifications', action: () => onEdit({ kind: 'event' }) },
    { icon: <Settings size={18} />, label: 'App Settings', action: () => onEdit({ kind: 'settings' }) },
    {
      icon: <Phone size={18} />,
      label: 'Support & Help',
      action: () => onNotify('Contact your school IT administrator for help.', 'success'),
    },
    {
      icon: <Database size={18} />,
      label: isConfigured ? 'Supabase connected — change' : 'Connect Supabase',
      action: onConnect,
    },
  ]

  return (
    <div className="fade-in-up">
      <div className="px-6 pt-16 pb-8 flex flex-col items-center">
        <div className="relative mb-4">
          <img src={avatarSrc(profile?.avatar_url ?? DEFAULT_AVATAR, name)} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl object-cover" />
          <button
            onClick={() => onEdit({ kind: 'profile' })}
            className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-slate-950 border-4 border-slate-950 hover:scale-105 transition-transform"
            aria-label="Edit profile"
          >
            <Settings size={14} />
          </button>
        </div>
        <h2 className="text-xl font-bold text-slate-100">{name}</h2>
        <p className="text-sm text-cyan-400 font-medium mt-1">{role}</p>
        <p className="text-[11px] text-slate-500 mt-2">
          {isConfigured ? 'Synced with Supabase' : 'Stored on this device'}
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
    </div>
  )
}
