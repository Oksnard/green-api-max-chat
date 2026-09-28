import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Chat, IncomingMessage, Message, MessageStatus } from '@/domain/types';

export type ChatsState = {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;

  addChat: (input: { chatId: string; phone?: string; name?: string }) => void;
  setActive: (chatId: string | null) => void;
  appendOutgoing: (chatId: string, text: string) => string;
  setMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  confirmSent: (chatId: string, localId: string, idMessage: string) => void;
  addIncoming: (incoming: IncomingMessage) => void;
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Чат с новым сообщением всегда встаёт первым — список отсортирован по времени последней активности. */
function moveToFront(chats: Chat[], chat: Chat): Chat[] {
  return [chat, ...chats.filter((item) => item.chatId !== chat.chatId)];
}

export const useChatsStore = create<ChatsState>()(
  persist<ChatsState, [], [], Pick<ChatsState, 'chats' | 'messages'>>(
    (set, get) => ({
      chats: [],
      messages: {},
      activeChatId: null,

      addChat: ({ chatId, phone, name }) => {
        const { chats } = get();
        const existing = chats.find((chat) => chat.chatId === chatId);

        if (existing) {
          set({ activeChatId: chatId });
          return;
        }

        const chat: Chat = { chatId, phone, name, createdAt: nowSeconds(), unread: 0 };
        set({ chats: [chat, ...chats], activeChatId: chatId });
      },

      setActive: (chatId) =>
        set((state) => ({
          activeChatId: chatId,
          chats: state.chats.map((chat) =>
            chat.chatId === chatId ? { ...chat, unread: 0 } : chat,
          ),
        })),

      appendOutgoing: (chatId, text) => {
        const localId = `local-${crypto.randomUUID()}`;
        const { chats, messages } = get();
        const thread = messages[chatId] ?? [];
        const message: Message = {
          id: localId,
          direction: 'out',
          text,
          timestamp: nowSeconds(),
          status: 'sending',
        };
        const chat = chats.find((item) => item.chatId === chatId);

        set({
          chats: chat ? moveToFront(chats, chat) : chats,
          messages: { ...messages, [chatId]: [...thread, message] },
        });

        return localId;
      },

      setMessageStatus: (chatId, messageId, status) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] ?? []).map((message) =>
              message.id === messageId ? { ...message, status } : message,
            ),
          },
        })),

      confirmSent: (chatId, localId, idMessage) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] ?? []).map((message) =>
              message.id === localId ? { ...message, id: idMessage, status: 'sent' } : message,
            ),
          },
        })),

      addIncoming: (incoming) => {
        const { chats, messages, activeChatId } = get();
        const thread = messages[incoming.chatId] ?? [];

        // Уведомление могло прийти повторно, если ACK не дошёл до сервера.
        if (thread.some((message) => message.id === incoming.idMessage)) return;

        const isActive = activeChatId === incoming.chatId;
        const current = chats.find((chat) => chat.chatId === incoming.chatId);

        const chat: Chat = current
          ? {
              ...current,
              name: current.name ?? incoming.chatName,
              phone: current.phone ?? incoming.phone,
              unread: isActive ? current.unread : current.unread + 1,
            }
          : {
              chatId: incoming.chatId,
              phone: incoming.phone,
              name: incoming.chatName,
              createdAt: incoming.timestamp,
              unread: isActive ? 0 : 1,
            };

        const message: Message = {
          id: incoming.idMessage,
          direction: 'in',
          text: incoming.text,
          timestamp: incoming.timestamp,
          status: 'sent',
        };

        set({
          chats: moveToFront(chats, chat),
          messages: { ...messages, [incoming.chatId]: [...thread, message] },
        });
      },
    }),
    {
      name: 'gamc.chats',
      storage: createJSONStorage(() => localStorage),
      // activeChatId намеренно не сохраняется: чат выбирается заново в каждой вкладке.
      partialize: (state) => ({ chats: state.chats, messages: state.messages }),
    },
  ),
);
