import { Avatar } from '@/components/Avatar';
import type { Chat, Message } from '@/domain/types';
import { formatListTime } from '@/lib/format';

type Props = {
  chat: Chat;
  lastMessage: Message | undefined;
  active: boolean;
  onSelect: (chatId: string) => void;
};

function title(chat: Chat): string {
  if (chat.name) return chat.name;
  if (chat.phone) return `+${chat.phone}`;
  return `Чат ${chat.chatId}`;
}

export function ChatListItem({ chat, lastMessage, active, onSelect }: Props) {
  const label = title(chat);
  const preview = lastMessage
    ? `${lastMessage.direction === 'out' ? 'Вы: ' : ''}${lastMessage.text}`
    : (chat.phone ?? 'Нет сообщений');

  return (
    <button
      type="button"
      onClick={() => onSelect(chat.chatId)}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors ${
        active ? 'bg-line/60' : 'hover:bg-line/40'
      }`}
    >
      <Avatar label={label} seed={chat.chatId} size={40} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-2">{preview}</span>
      </span>

      <span className="flex flex-none flex-col items-end gap-1">
        {lastMessage && (
          <time className="text-[11px] text-ink-3">{formatListTime(lastMessage.timestamp)}</time>
        )}
        {chat.unread > 0 && (
          <span className="accent-gradient flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white">
            {chat.unread}
          </span>
        )}
      </span>
    </button>
  );
}
