import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GreenApiError, type Credentials } from '@/api/greenApi';
import { retry, sendText } from '@/services/sender';
import { useChatsStore } from '@/stores/chatsStore';

vi.mock('@/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/greenApi')>();
  return { ...actual, sendMessage: vi.fn() };
});

import { sendMessage } from '@/api/greenApi';

const CREDS: Credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '310022748042',
  apiToken: 'token',
};

const sendMessageMock = vi.mocked(sendMessage);

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  vi.clearAllMocks();
  useChatsStore.setState({
    chats: [{ chatId: '181089250', createdAt: 1, unread: 0 }],
    messages: {},
    activeChatId: '181089250',
  });
});

describe('sendText', () => {
  it('доводит сообщение до статуса sent и подменяет id на idMessage', async () => {
    sendMessageMock.mockResolvedValue({ idMessage: '1763115112345' });

    await sendText(CREDS, '181089250', 'Привет');

    const message = useChatsStore.getState().messages['181089250']?.[0];
    expect(message?.id).toBe('1763115112345');
    expect(message?.status).toBe('sent');
    expect(sendMessageMock).toHaveBeenCalledWith(CREDS, '181089250', 'Привет');
  });

  it('оставляет сообщение в ленте со статусом failed, если отправка не удалась', async () => {
    sendMessageMock.mockRejectedValue(new GreenApiError('Инстанс заблокирован', { status: 403 }));

    await expect(sendText(CREDS, '181089250', 'Привет')).rejects.toThrow('Инстанс заблокирован');

    const thread = useChatsStore.getState().messages['181089250'] ?? [];
    expect(thread).toHaveLength(1);
    expect(thread[0]?.text).toBe('Привет');
    expect(thread[0]?.status).toBe('failed');
  });

  it('текст попадает в ленту до ответа сервера', async () => {
    let resolveSend: (value: { idMessage: string }) => void = () => {};
    sendMessageMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );

    const pending = sendText(CREDS, '181089250', 'Привет');

    expect(useChatsStore.getState().messages['181089250']?.[0]?.status).toBe('sending');

    resolveSend({ idMessage: '1' });
    await pending;
  });
});

describe('retry', () => {
  it('переиспользует существующее сообщение, а не создаёт второе', async () => {
    sendMessageMock.mockRejectedValueOnce(new GreenApiError('Сеть'));
    await sendText(CREDS, '181089250', 'Привет').catch(() => undefined);

    const failedId = useChatsStore.getState().messages['181089250']?.[0]?.id ?? '';

    sendMessageMock.mockResolvedValueOnce({ idMessage: '1763115112345' });
    await retry(CREDS, '181089250', failedId);

    const thread = useChatsStore.getState().messages['181089250'] ?? [];
    expect(thread).toHaveLength(1);
    expect(thread[0]?.status).toBe('sent');
  });

  it('ничего не делает для неизвестного id', async () => {
    await retry(CREDS, '181089250', 'нет-такого');

    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
