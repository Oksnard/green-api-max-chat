import { beforeEach, describe, expect, it } from 'vitest';
import type { IncomingMessage } from '@/domain/types';
import { useChatsStore } from '@/stores/chatsStore';

function incoming(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    chatId: '181089250',
    idMessage: 'MSG-1',
    text: 'Привет!',
    timestamp: 1735689600,
    chatName: 'Ирина Соколова',
    ...overrides,
  };
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  useChatsStore.setState({ chats: [], messages: {}, activeChatId: null });
});

describe('addChat', () => {
  it('добавляет чат и делает его активным', () => {
    useChatsStore.getState().addChat({ chatId: '181089250', phone: '79996396183' });

    const state = useChatsStore.getState();
    expect(state.chats).toHaveLength(1);
    expect(state.chats[0]?.chatId).toBe('181089250');
    expect(state.activeChatId).toBe('181089250');
  });

  it('не дублирует чат при повторном добавлении', () => {
    const { addChat } = useChatsStore.getState();
    addChat({ chatId: '181089250', phone: '79996396183' });
    addChat({ chatId: '181089250', phone: '79996396183' });

    expect(useChatsStore.getState().chats).toHaveLength(1);
  });
});

describe('addIncoming', () => {
  it('складывает сообщение в ленту своего чата', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });

    useChatsStore.getState().addIncoming(incoming());

    const messages = useChatsStore.getState().messages['181089250'] ?? [];
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe('Привет!');
    expect(messages[0]?.direction).toBe('in');
    expect(messages[0]?.status).toBe('sent');
  });

  it('в неактивный чат увеличивает счётчик непрочитанных', () => {
    useChatsStore.setState({
      chats: [
        { chatId: '111', createdAt: 1, unread: 0 },
        { chatId: '222', createdAt: 2, unread: 0 },
      ],
      messages: {},
      activeChatId: '111',
    });

    useChatsStore.getState().addIncoming(incoming({ chatId: '222', idMessage: 'X' }));

    const chat = useChatsStore.getState().chats.find((c) => c.chatId === '222');
    expect(chat?.unread).toBe(1);
  });

  it('в активный чат не увеличивает счётчик непрочитанных', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });

    useChatsStore.getState().addIncoming(incoming());

    expect(useChatsStore.getState().chats[0]?.unread).toBe(0);
  });

  it('игнорирует повторный idMessage', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });

    useChatsStore.getState().addIncoming(incoming());
    useChatsStore.getState().addIncoming(incoming());

    expect(useChatsStore.getState().messages['181089250']).toHaveLength(1);
  });

  it('создаёт чат из незнакомого входящего и берёт имя из chatName', () => {
    useChatsStore.getState().addIncoming(incoming({ chatId: '999', chatName: 'Максим' }));

    const state = useChatsStore.getState();
    expect(state.chats[0]?.chatId).toBe('999');
    expect(state.chats[0]?.name).toBe('Максим');
    expect(state.chats[0]?.unread).toBe(1);
  });

  it('не перетирает уже известное имя чата', () => {
    useChatsStore.getState().addChat({ chatId: '999', name: 'Максим' });

    useChatsStore.getState().addIncoming(incoming({ chatId: '999', chatName: 'Другое имя' }));

    expect(useChatsStore.getState().chats[0]?.name).toBe('Максим');
  });

  it('поднимает чат с новым сообщением в начало списка', () => {
    useChatsStore.setState({
      chats: [
        { chatId: '111', createdAt: 1, unread: 0 },
        { chatId: '222', createdAt: 2, unread: 0 },
      ],
      messages: {},
      activeChatId: '111',
    });

    useChatsStore.getState().addIncoming(incoming({ chatId: '222', idMessage: 'X' }));

    expect(useChatsStore.getState().chats.map((c) => c.chatId)).toEqual(['222', '111']);
  });
});

describe('setActive', () => {
  it('сбрасывает счётчик непрочитанных выбранного чата', () => {
    useChatsStore.setState({
      chats: [{ chatId: '222', createdAt: 2, unread: 5 }],
      messages: {},
      activeChatId: null,
    });

    useChatsStore.getState().setActive('222');

    expect(useChatsStore.getState().chats[0]?.unread).toBe(0);
    expect(useChatsStore.getState().activeChatId).toBe('222');
  });
});

describe('исходящие', () => {
  it('appendOutgoing добавляет сообщение со статусом sending и возвращает local-id', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });

    const localId = useChatsStore.getState().appendOutgoing('181089250', 'Моё сообщение');

    const messages = useChatsStore.getState().messages['181089250'] ?? [];
    expect(localId).toMatch(/^local-/);
    expect(messages[0]).toMatchObject({
      id: localId,
      direction: 'out',
      text: 'Моё сообщение',
      status: 'sending',
    });
  });

  it('setMessageStatus переводит сообщение в failed', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });
    const localId = useChatsStore.getState().appendOutgoing('181089250', 'Текст');

    useChatsStore.getState().setMessageStatus('181089250', localId, 'failed');

    expect(useChatsStore.getState().messages['181089250']?.[0]?.status).toBe('failed');
  });

  it('confirmSent заменяет local-id на idMessage и ставит sent', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });
    const localId = useChatsStore.getState().appendOutgoing('181089250', 'Текст');

    useChatsStore.getState().confirmSent('181089250', localId, '1763115112345');

    const message = useChatsStore.getState().messages['181089250']?.[0];
    expect(message?.id).toBe('1763115112345');
    expect(message?.status).toBe('sent');
  });

  it('setMessageStatus не трогает сообщения других чатов', () => {
    useChatsStore.setState({
      chats: [
        { chatId: '111', createdAt: 1, unread: 0 },
        { chatId: '222', createdAt: 2, unread: 0 },
      ],
      messages: {
        '111': [{ id: 'local-1', direction: 'out', text: 'A', timestamp: 1, status: 'sending' }],
        '222': [{ id: 'local-1', direction: 'out', text: 'B', timestamp: 1, status: 'sending' }],
      },
      activeChatId: '111',
    });

    useChatsStore.getState().setMessageStatus('222', 'local-1', 'failed');

    expect(useChatsStore.getState().messages['111']?.[0]?.status).toBe('sending');
    expect(useChatsStore.getState().messages['222']?.[0]?.status).toBe('failed');
  });
});

describe('persist', () => {
  it('сохраняет чаты и сообщения под ключом gamc.chats, а activeChatId — нет', () => {
    useChatsStore.getState().addChat({ chatId: '181089250' });
    useChatsStore.getState().appendOutgoing('181089250', 'Текст');

    const stored = JSON.parse(localStorage.getItem('gamc.chats') ?? '{}') as {
      state?: Record<string, unknown>;
    };

    expect(Object.keys(stored.state ?? {}).sort()).toEqual(['chats', 'messages']);
  });
});
