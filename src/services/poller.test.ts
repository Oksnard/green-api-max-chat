import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GreenApiError, type Credentials } from '@/api/greenApi';
import type { NotificationReceipt } from '@/api/types';
import { startPoller, toIncomingMessage } from '@/services/poller';

vi.mock('@/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/greenApi')>();
  return {
    ...actual,
    receiveNotification: vi.fn(),
    deleteNotification: vi.fn(),
  };
});

import { deleteNotification, receiveNotification } from '@/api/greenApi';

const CREDS: Credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '310022748042',
  apiToken: 'token',
};

const receiveMock = vi.mocked(receiveNotification);
const deleteMock = vi.mocked(deleteNotification);

function receipt(receiptId: number, text = 'Привет!'): NotificationReceipt {
  return {
    receiptId,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1735689600,
      idMessage: `MSG-${receiptId}`,
      senderData: { chatId: '181089250', chatName: 'Ирина Соколова' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
    },
  };
}

/** Ждём, пока условие станет истинным, но не дольше таймаута. */
async function waitFor(condition: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

/**
 * Ответ «очередь пуста» — обязательно через макрозадачу.
 * Промис, который резолвится немедленно, заставляет цикл опроса крутиться на
 * микрозадачах: очередь микрозадач не пустеет никогда, управление не доходит
 * до таймеров, и waitFor выше зависает вместо того, чтобы дождаться условия.
 */
function emptyQueue(): Promise<NotificationReceipt | null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), 1));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Пустая очередь — поведение по умолчанию: тесты, которым нужны квитанции,
  // кладут их через mockResolvedValueOnce, а дальше цикл видит пустую очередь.
  receiveMock.mockImplementation(emptyQueue);
  deleteMock.mockResolvedValue({ result: true, reason: '' });
});

describe('toIncomingMessage', () => {
  it('разбирает текстовое входящее', () => {
    expect(toIncomingMessage(receipt(1))).toEqual({
      chatId: '181089250',
      idMessage: 'MSG-1',
      text: 'Привет!',
      timestamp: 1735689600,
      chatName: 'Ирина Соколова',
      phone: undefined,
    });
  });

  it('пропускает уведомление не того типа', () => {
    const other = receipt(2);
    other.body.typeWebhook = 'outgoingMessageStatus';

    expect(toIncomingMessage(other)).toBeNull();
  });

  it('пропускает нетекстовое сообщение', () => {
    const media = receipt(3);
    media.body.messageData = { typeMessage: 'imageMessage' };

    expect(toIncomingMessage(media)).toBeNull();
  });

  it('пропускает уведомление без chatId', () => {
    const broken = receipt(4);
    broken.body.senderData = undefined;

    expect(toIncomingMessage(broken)).toBeNull();
  });
});

describe('startPoller', () => {
  it('доносит входящее до обработчика и подтверждает квитанцию', async () => {
    receiveMock
      .mockResolvedValueOnce(receipt(1234))
      .mockResolvedValueOnce(receipt(1235));

    const onIncoming = vi.fn();
    const stop = startPoller(CREDS, { onIncoming });

    await waitFor(() => onIncoming.mock.calls.length === 2);
    stop();

    expect(onIncoming).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledWith(CREDS, 1234);
    expect(deleteMock).toHaveBeenCalledWith(CREDS, 1235);
  });

  it('подтверждает квитанцию, даже если обработка упала', async () => {
    receiveMock.mockResolvedValueOnce(receipt(4321));

    const onIncoming = vi.fn(() => {
      throw new Error('поллер не должен на этом падать');
    });
    const onError = vi.fn();
    const stop = startPoller(CREDS, { onIncoming, onError });

    await waitFor(() => deleteMock.mock.calls.length > 0);
    stop();

    expect(deleteMock).toHaveBeenCalledWith(CREDS, 4321);
    expect(onError).toHaveBeenCalled();
  });

  it('игнорирует уведомления, которые не являются входящим текстом, но подтверждает их', async () => {
    const statusReceipt = receipt(777);
    statusReceipt.body.typeWebhook = 'outgoingMessageStatus';
    receiveMock.mockResolvedValueOnce(statusReceipt);

    const onIncoming = vi.fn();
    const stop = startPoller(CREDS, { onIncoming });

    await waitFor(() => deleteMock.mock.calls.length > 0);
    stop();

    expect(onIncoming).not.toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledWith(CREDS, 777);
  });

  it('останавливается по вызову stop и не продолжает опрос', async () => {
    const stop = startPoller(CREDS, { onIncoming: vi.fn() });
    await waitFor(() => receiveMock.mock.calls.length > 1);
    stop();

    const callsAfterStop = receiveMock.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receiveMock.mock.calls.length).toBe(callsAfterStop);
  });

  it('не запускает второй цикл: повторный старт останавливает первый', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    receiveMock.mockImplementation((_credentials, _timeout, signal) => {
      signals.push(signal);
      return emptyQueue();
    });

    const stopFirst = startPoller(CREDS, { onIncoming: vi.fn() });
    await waitFor(() => signals.length > 0);

    const stopSecond = startPoller(CREDS, { onIncoming: vi.fn() });
    await waitFor(() => signals.length > 1);

    expect(signals[0]?.aborted).toBe(true);

    stopSecond();
    void stopFirst;
  });

  it('переживает ошибку сети и продолжает опрос', async () => {
    receiveMock.mockRejectedValueOnce(new GreenApiError('Слишком много запросов', { status: 429 }));

    const onError = vi.fn();
    const stop = startPoller(CREDS, { onIncoming: vi.fn(), onError });

    await waitFor(() => onError.mock.calls.length > 0);
    stop();

    expect((onError.mock.calls[0]?.[0] as GreenApiError).status).toBe(429);
  });
});
