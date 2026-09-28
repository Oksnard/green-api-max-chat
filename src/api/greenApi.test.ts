import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GreenApiError,
  deriveApiUrl,
  getSettings,
  getStateInstance,
  setSettings,
  checkAccount,
  sendMessage,
  receiveNotification,
  deleteNotification,
  type Credentials,
} from '@/api/greenApi';

const CREDS: Credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '310022748042',
  apiToken: 'tok+en/with?specials',
};

type FakeResponse = { ok?: boolean; status?: number; body?: string };

function mockFetch(response: FakeResponse) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: async () => response.body ?? '',
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deriveApiUrl', () => {
  it('берёт первые четыре цифры idInstance', () => {
    expect(deriveApiUrl('310022748042')).toBe('https://3100.api.green-api.com');
  });
});

describe('построение запроса', () => {
  it('кодирует apiToken в пути и сегмент waInstance', async () => {
    const fetchMock = mockFetch({ body: '{"stateInstance":"authorized"}' });

    await getStateInstance(CREDS);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(
      'https://3100.api.green-api.com/waInstance310022748042/getStateInstance/tok%2Ben%2Fwith%3Fspecials',
    );
    expect(init.method).toBe('GET');
  });

  it('отправляет тело POST как JSON', async () => {
    const fetchMock = mockFetch({ body: '{"saveSettings":true}' });

    await setSettings(CREDS, { incomingWebhook: 'yes' });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"incomingWebhook":"yes"}');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });
});

describe('разбор ответов', () => {
  it('возвращает состояние инстанса', async () => {
    mockFetch({ body: '{"stateInstance":"authorized"}' });

    await expect(getStateInstance(CREDS)).resolves.toEqual({ stateInstance: 'authorized' });
  });

  it('возвращает настройки инстанса', async () => {
    mockFetch({
      body: JSON.stringify({
        wid: '79996396183@c.us',
        webhookUrl: '',
        incomingWebhook: 'yes',
        outgoingWebhook: 'yes',
        stateWebhook: 'yes',
        markIncomingMessagesReaded: 'no',
        delaySendMessagesMilliseconds: 1000,
      }),
    });

    const settings = await getSettings(CREDS);

    expect(settings.wid).toBe('79996396183@c.us');
    expect(settings.incomingWebhook).toBe('yes');
  });

  it('падает, если настройки не пришли', async () => {
    mockFetch({ body: '' });

    await expect(getSettings(CREDS)).rejects.toThrow(GreenApiError);
  });
});

describe('ошибки', () => {
  it('на 429 с пустым телом даёт понятное сообщение и статус', async () => {
    mockFetch({ ok: false, status: 429, body: '' });

    const error = await getStateInstance(CREDS).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GreenApiError);
    expect((error as GreenApiError).status).toBe(429);
    expect((error as GreenApiError).message).toContain('Слишком много запросов');
  });

  it('на 400 с полем reason берёт reason как сообщение', async () => {
    mockFetch({ ok: false, status: 400, body: '{"reason":"bad phone number"}' });

    const error = await getStateInstance(CREDS).catch((e: unknown) => e);

    expect((error as GreenApiError).message).toBe('bad phone number');
    expect((error as GreenApiError).reason).toBe('bad phone number');
    expect((error as GreenApiError).status).toBe(400);
  });

  it('на неразбираемый ответ падает, а не возвращает мусор', async () => {
    mockFetch({ body: '<html>502 Bad Gateway</html>' });

    await expect(getStateInstance(CREDS)).rejects.toThrow(GreenApiError);
  });

  it('пробрасывает AbortSignal в fetch', async () => {
    const fetchMock = mockFetch({ body: '{"stateInstance":"authorized"}' });
    const controller = new AbortController();

    await getStateInstance(CREDS, controller.signal);

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});

describe('checkAccount', () => {
  it('отправляет номер числом и возвращает chatId', async () => {
    const fetchMock = mockFetch({
      body: '{"exist":true,"chatId":"181089250","fromCache":false}',
    });

    const account = await checkAccount(CREDS, '79996396183');

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain('/waInstance310022748042/checkAccount/');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"phoneNumber":79996396183}');
    expect(account.chatId).toBe('181089250');
  });

  it('сообщает, что номера нет в MAX', async () => {
    mockFetch({ body: '{"exist":false,"chatId":"","fromCache":false}' });

    const account = await checkAccount(CREDS, '79996396183');

    expect(account.exist).toBe(false);
  });

  it('на HTTP 200 с полем status превращает ответ в ошибку', async () => {
    mockFetch({
      body: '{"status":false,"reason":"User get contact info limit reached"}',
    });

    const error = await checkAccount(CREDS, '79996396183').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GreenApiError);
    expect((error as GreenApiError).reason).toBe('User get contact info limit reached');
  });

  it('падает, если сервер ответил пустым телом', async () => {
    mockFetch({ body: '' });

    await expect(checkAccount(CREDS, '79996396183')).rejects.toThrow(GreenApiError);
  });
});

describe('sendMessage', () => {
  it('кладёт chatId и текст в тело и возвращает idMessage', async () => {
    const fetchMock = mockFetch({ body: '{"idMessage":"1763115112345"}' });

    const sent = await sendMessage(CREDS, '181089250', 'Привет из веб-чата');

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.body).toBe('{"chatId":"181089250","message":"Привет из веб-чата"}');
    expect(sent.idMessage).toBe('1763115112345');
  });

  it('пробрасывает ошибку лимита длины сообщения', async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: "{\"reason\":\"'message' length must be less than or equal to 4000 characters long\"}",
    });

    const error = await sendMessage(CREDS, '181089250', 'x'.repeat(4001)).catch((e: unknown) => e);

    expect((error as GreenApiError).message).toContain('4000 characters');
  });

  it('падает, если idMessage не пришёл', async () => {
    mockFetch({ body: '{}' });

    await expect(sendMessage(CREDS, '181089250', 'текст')).rejects.toThrow(GreenApiError);
  });
});

const RECEIPT_BODY = JSON.stringify({
  receiptId: 1234,
  body: {
    typeWebhook: 'incomingMessageReceived',
    timestamp: 1735689600,
    idMessage: 'ABC123',
    senderData: { chatId: '181089250', chatName: 'Ирина Соколова' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет!' } },
  },
});

describe('receiveNotification', () => {
  it('на пустой очереди возвращает null, а не падает', async () => {
    mockFetch({ body: '' });

    await expect(receiveNotification(CREDS, 25)).resolves.toBeNull();
  });

  it('передаёт receiveTimeout в query и возвращает квитанцию', async () => {
    const fetchMock = mockFetch({ body: RECEIPT_BODY });

    const receipt = await receiveNotification(CREDS, 25);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain('receiveTimeout=25');
    expect(init.method).toBe('GET');
    expect(receipt?.receiptId).toBe(1234);
    expect(receipt?.body.idMessage).toBe('ABC123');
  });
});

describe('deleteNotification', () => {
  it('использует метод DELETE и кладёт receiptId в путь', async () => {
    const fetchMock = mockFetch({ body: '{"result":true,"reason":""}' });

    const result = await deleteNotification(CREDS, 1234);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('DELETE');
    expect(String(url)).toBe(
      'https://3100.api.green-api.com/waInstance310022748042/deleteNotification/tok%2Ben%2Fwith%3Fspecials/1234',
    );
    expect(result?.result).toBe(true);
  });
});
