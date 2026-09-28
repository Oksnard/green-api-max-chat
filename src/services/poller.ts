import {
  deleteNotification,
  isAbortError,
  receiveNotification,
  type Credentials,
} from '@/api/greenApi';
import type { NotificationReceipt } from '@/api/types';
import type { IncomingMessage } from '@/domain/types';

export type PollerHandlers = {
  onIncoming: (message: IncomingMessage) => void;
  onError?: (error: unknown) => void;
};

/** Рабочий режим: держим соединение 25 секунд — тратит меньше запросов, чем минимум в 5. */
const IDLE_TIMEOUT_SECONDS = 25;
/** Разбор накопившейся очереди: короткие запросы, чтобы быстро её вычерпать. */
const DRAIN_TIMEOUT_SECONDS = 5;
const MAX_BACKOFF_MS = 30_000;

/** Единственный активный цикл. Повторный запуск гасит предыдущий. */
let activeController: AbortController | null = null;

export function startPoller(credentials: Credentials, handlers: PollerHandlers): () => void {
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;

  void loop(credentials, handlers, controller.signal).finally(() => {
    if (activeController === controller) activeController = null;
  });

  return () => controller.abort();
}

/** Разбирает уведомление. Возвращает null для всего, что не является входящим текстом. */
export function toIncomingMessage(receipt: NotificationReceipt): IncomingMessage | null {
  const { body } = receipt;

  if (body?.typeWebhook !== 'incomingMessageReceived') return null;
  if (body.messageData?.typeMessage !== 'textMessage') return null;

  const text = body.messageData.textMessageData?.textMessage;
  const chatId = body.senderData?.chatId;

  if (typeof text !== 'string' || !chatId) return null;

  const phone = body.senderData?.senderPhoneNumber;

  return {
    chatId,
    idMessage: body.idMessage,
    text,
    timestamp: body.timestamp,
    chatName: body.senderData?.chatName,
    phone: phone === undefined ? undefined : String(phone),
  };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}

async function acknowledge(
  credentials: Credentials,
  receipt: NotificationReceipt,
  handlers: PollerHandlers,
): Promise<void> {
  try {
    const incoming = toIncomingMessage(receipt);
    if (incoming) handlers.onIncoming(incoming);
  } catch (error) {
    handlers.onError?.(error);
  } finally {
    // Подтверждаем всегда: без ACK уведомление вернётся в очередь и продублируется.
    try {
      await deleteNotification(credentials, receipt.receiptId);
    } catch (error) {
      handlers.onError?.(error);
    }
  }
}

/** Вычерпывает очередь, накопившуюся пока вкладка была закрыта. */
async function drain(
  credentials: Credentials,
  handlers: PollerHandlers,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    let receipt: NotificationReceipt | null;

    try {
      receipt = await receiveNotification(credentials, DRAIN_TIMEOUT_SECONDS, signal);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return;
      handlers.onError?.(error);
      return;
    }

    if (!receipt) return;
    await acknowledge(credentials, receipt, handlers);
  }
}

async function loop(
  credentials: Credentials,
  handlers: PollerHandlers,
  signal: AbortSignal,
): Promise<void> {
  await drain(credentials, handlers, signal);

  let failures = 0;

  while (!signal.aborted) {
    try {
      const receipt = await receiveNotification(credentials, IDLE_TIMEOUT_SECONDS, signal);
      if (signal.aborted) return;

      if (receipt) await acknowledge(credentials, receipt, handlers);
      failures = 0;
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return;

      handlers.onError?.(error);
      failures += 1;
      await sleep(Math.min(1000 * 2 ** failures, MAX_BACKOFF_MS), signal);
    }
  }
}
