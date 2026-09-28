import { useCallback, useEffect, useState } from 'react';
import { checkAccount, type Credentials } from '@/api/greenApi';
import { ChatHeader } from '@/components/ChatHeader';
import { Composer } from '@/components/Composer';
import { EmptyState } from '@/components/EmptyState';
import { MessageList } from '@/components/MessageList';
import { NewChatDialog } from '@/components/NewChatDialog';
import { Sidebar } from '@/components/Sidebar';
import { normalizePhone } from '@/domain/types';
import { retry, sendText } from '@/services/sender';
import { startPoller } from '@/services/poller';
import { useAuthStore } from '@/stores/authStore';
import { useChatsStore } from '@/stores/chatsStore';

type Props = {
  credentials: Credentials;
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Не удалось выполнить запрос к GREEN-API';
}

export function ChatScreen({ credentials }: Props) {
  const chats = useChatsStore((state) => state.chats);
  const messages = useChatsStore((state) => state.messages);
  const activeChatId = useChatsStore((state) => state.activeChatId);
  const setActive = useChatsStore((state) => state.setActive);
  const clearCredentials = useAuthStore((state) => state.clear);

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const stop = startPoller(credentials, {
      onIncoming: (incoming) => {
        setConnectionError(null);
        useChatsStore.getState().addIncoming(incoming);
      },
      onError: (error) => setConnectionError(describeError(error)),
    });

    return stop;
  }, [credentials]);

  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? null;
  const thread = activeChatId ? (messages[activeChatId] ?? []) : [];

  const handleSend = useCallback(
    (text: string) => {
      if (!activeChatId) return;
      void sendText(credentials, activeChatId, text).catch((error: unknown) => {
        setConnectionError(describeError(error));
      });
    },
    [credentials, activeChatId],
  );

  const handleRetry = useCallback(
    (messageId: string) => {
      if (!activeChatId) return;
      void retry(credentials, activeChatId, messageId).catch((error: unknown) => {
        setConnectionError(describeError(error));
      });
    },
    [credentials, activeChatId],
  );

  async function handleCreateChat(phone: string) {
    const normalized = normalizePhone(phone);

    if (!normalized) {
      setCreateError('Введите номер в формате +7 999 123-45-67 или +375 29 123-45-67');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const account = await checkAccount(credentials, normalized);

      if (!account.exist) {
        setCreateError('Этот номер не зарегистрирован в MAX');
        return;
      }

      useChatsStore.getState().addChat({ chatId: account.chatId, phone: normalized });
      setDialogOpen(false);
    } catch (error) {
      setCreateError(describeError(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full bg-app">
      <aside
        className={`w-full flex-none border-r border-line md:w-[300px] ${
          activeChat ? 'hidden md:block' : 'block'
        }`}
      >
        <Sidebar
          chats={chats}
          messages={messages}
          activeChatId={activeChatId}
          onSelect={setActive}
          onNewChat={() => {
            setCreateError(null);
            setDialogOpen(true);
          }}
          onLogout={clearCredentials}
        />
      </aside>

      <main className={`min-w-0 flex-1 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChat ? (
          <>
            <ChatHeader chat={activeChat} onBack={() => setActive(null)} />
            {connectionError && (
              <p role="status" className="flex-none bg-surface-2 px-4 py-1.5 text-[11.5px] text-danger">
                {connectionError} Переподключаемся…
              </p>
            )}
            <MessageList messages={thread} onRetry={handleRetry} />
            <Composer onSend={handleSend} />
          </>
        ) : (
          <EmptyState
            onNewChat={() => {
              setCreateError(null);
              setDialogOpen(true);
            }}
          />
        )}
      </main>

      {dialogOpen && (
        <NewChatDialog
          busy={creating}
          error={createError}
          onSubmit={handleCreateChat}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
