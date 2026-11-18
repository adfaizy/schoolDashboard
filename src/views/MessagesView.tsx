import { Users } from 'lucide-react'
import { AddButton, EmptyState, RowActions, avatarSrc, type ViewProps } from './shared'

export function MessagesView({ controller, onEdit, onDelete }: ViewProps) {
  const chats = controller.data.messages

  return (
    <div className="fade-in-up">
      <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100 tracking-wide">Messages</h1>
        <AddButton onClick={() => onEdit({ kind: 'message' })} label="New" />
      </header>

      {chats.length === 0 ? (
        <EmptyState message="No conversations yet. Start a new one to see it here." onAdd={() => onEdit({ kind: 'message' })} />
      ) : (
        <div className="px-6 flex flex-col gap-2 mt-2">
          {chats.map((chat) => (
            <div key={chat.id} className="bg-slate-900/40 p-3.5 rounded-2xl flex items-center gap-3 border border-transparent hover:border-slate-800">
              {chat.is_group ? (
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Users size={20} />
                </div>
              ) : (
                <img src={avatarSrc(chat.avatar_url, chat.name)} alt={chat.name} className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{chat.name}</h4>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">{chat.time}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{chat.msg || 'No messages yet'}</p>
              </div>
              {chat.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0">
                  {chat.unread}
                </div>
              )}
              <RowActions
                onEdit={() => onEdit({ kind: 'message', row: chat })}
                onDelete={() => onDelete({ table: 'messages', id: chat.id, label: chat.name })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
