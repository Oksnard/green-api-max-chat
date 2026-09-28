import { ChatListItem } from '@/components/ChatListItem';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { Chat, Message } from '@/domain/types';

type Props = {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
};

function lastMessageOf(messages: Record<string, Message[]>, chatId: string): Message | undefined {
  const thread = messages[chatId];
  return thread?.[thread.length - 1];
}

export function Sidebar({
  chats,
  messages,
  activeChatId,
  onSelect,
  onNewChat,
  onLogout,
}: Props) {
  return (
    <div className="flex h-full flex-col bg-surface-2">
      <div className="flex flex-none items-center gap-1 px-3 py-2.5">
        <h1 className="flex-1 text-[15px] font-semibold text-ink">Чаты</h1>
        <ThemeToggle />
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Новый чат"
          className="accent-gradient flex h-9 w-9 flex-none items-center justify-center rounded-full text-lg leading-none text-white"
        >
          +
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти из GREEN-API"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-line hover:text-ink"
        >
          ⎋
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">
            Пока нет чатов. Нажмите «+», чтобы создать первый.
          </p>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.chatId}
              chat={chat}
              lastMessage={lastMessageOf(messages, chat.chatId)}
              active={chat.chatId === activeChatId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
