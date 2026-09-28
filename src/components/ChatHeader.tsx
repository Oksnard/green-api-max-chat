import { Avatar } from '@/components/Avatar';
import type { Chat } from '@/domain/types';

type Props = {
  chat: Chat;
  onBack: () => void;
};

function title(chat: Chat): string {
  if (chat.name) return chat.name;
  if (chat.phone) return `+${chat.phone}`;
  return `Чат ${chat.chatId}`;
}

export function ChatHeader({ chat, onBack }: Props) {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-line bg-surface px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="К списку чатов"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-2 hover:bg-line md:hidden"
      >
        ‹
      </button>

      <Avatar label={title(chat)} seed={chat.chatId} size={34} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{title(chat)}</p>
        <p className="truncate text-[11px] text-online">чат MAX</p>
      </div>
    </div>
  );
}
