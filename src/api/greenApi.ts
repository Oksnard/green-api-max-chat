import type {
  CheckAccountFailure,
  CheckAccountSuccess,
  DeleteNotificationResponse,
  GetSettingsResponse,
  GetStateInstanceResponse,
  NotificationReceipt,
  SendMessageResponse,
  SetSettingsResponse,
} from '@/api/types';

export type Credentials = {
  apiUrl: string;
  idInstance: string;
  apiToken: string;
};

export class GreenApiError extends Error {
  readonly status?: number;
  readonly reason?: string;

  constructor(message: string, options: { status?: number; reason?: string } = {}) {
    super(message);
    this.name = 'GreenApiError';
    this.status = options.status;
    this.reason = options.reason;
  }
}

/** Хост выводится из idInstance: 310022748042 → https://3100.api.green-api.com */
export function deriveApiUrl(idInstance: string): string {
  return `https://${idInstance.slice(0, 4)}.api.green-api.com`;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

const STATUS_HINTS: Record<number, string> = {
  400: 'GREEN-API отклонил запрос',
  401: 'Неверный apiTokenInstance',
  403: 'Инстанс заблокирован или аккаунт приостановлен',
  429: 'Слишком много запросов к GREEN-API — снижаем темп',
  500: 'Внутренняя ошибка GREEN-API',
};

function readReason(raw: string): string | undefined {
  if (raw.trim() === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'reason' in parsed) {
      const { reason } = parsed as { reason?: unknown };
      if (typeof reason === 'string' && reason.trim() !== '') return reason;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function describeHttpError(status: number, raw: string): string {
  return readReason(raw) ?? STATUS_HINTS[status] ?? `GREEN-API ответил кодом ${status}`;
}

type CallOptions = {
  httpMethod: 'GET' | 'POST' | 'DELETE';
  method: string;
  /** Дополнительный сегмент пути, например «/1234567» у deleteNotification. */
  path?: string;
  query?: Record<string, string | number>;
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * Единая точка обращения к GREEN-API.
 * Возвращает null, если сервер ответил 200 с пустым телом (пустая очередь receiveNotification).
 */
async function call<T>(credentials: Credentials, options: CallOptions): Promise<T | null> {
  const url = new URL(
    `/waInstance${credentials.idInstance}/${options.method}/${encodeURIComponent(credentials.apiToken)}${options.path ?? ''}`,
    credentials.apiUrl,
  );

  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const hasBody = options.body !== undefined;

  const response = await fetch(url, {
    method: options.httpMethod,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new GreenApiError(describeHttpError(response.status, raw), {
      status: response.status,
      reason: readReason(raw),
    });
  }

  if (raw.trim() === '') return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new GreenApiError('GREEN-API вернул ответ, который не удалось разобрать', {
      status: response.status,
    });
  }
}

export async function getStateInstance(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<GetStateInstanceResponse> {
  const data = await call<GetStateInstanceResponse>(credentials, {
    httpMethod: 'GET',
    method: 'getStateInstance',
    signal,
  });

  if (!data?.stateInstance) {
    throw new GreenApiError('GREEN-API не вернул состояние инстанса');
  }

  return data;
}

export async function getSettings(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<GetSettingsResponse> {
  const data = await call<GetSettingsResponse>(credentials, {
    httpMethod: 'GET',
    method: 'getSettings',
    signal,
  });

  if (!data) {
    throw new GreenApiError('GREEN-API не вернул настройки инстанса');
  }

  return data;
}

/**
 * GREEN-API сохраняет только одно поле за запрос: при нескольких полях
 * отвечает {"saveSettings":true}, но ничего не меняет (спека §6.3).
 */
export async function setSettings(
  credentials: Credentials,
  field: Record<string, string>,
  signal?: AbortSignal,
): Promise<SetSettingsResponse | null> {
  return call<SetSettingsResponse>(credentials, {
    httpMethod: 'POST',
    method: 'setSettings',
    body: field,
    signal,
  });
}

export async function checkAccount(
  credentials: Credentials,
  phoneNumber: string,
  signal?: AbortSignal,
): Promise<CheckAccountSuccess> {
  const data = await call<CheckAccountSuccess | CheckAccountFailure>(credentials, {
    httpMethod: 'POST',
    method: 'checkAccount',
    body: { phoneNumber: Number(phoneNumber) },
    signal,
  });

  if (!data) {
    throw new GreenApiError('GREEN-API не ответил на проверку номера');
  }

  if ('status' in data && data.status === false) {
    throw new GreenApiError(data.reason, { reason: data.reason });
  }

  return data as CheckAccountSuccess;
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  const data = await call<SendMessageResponse>(credentials, {
    httpMethod: 'POST',
    method: 'sendMessage',
    body: { chatId, message },
    signal,
  });

  if (!data?.idMessage) {
    throw new GreenApiError('Сообщение ушло, но GREEN-API не вернул idMessage');
  }

  return data;
}

/**
 * Long-poll: сервер держит соединение receiveTimeout секунд и отдаёт либо уведомление,
 * либо 200 с пустым телом. Разрешённый диапазон receiveTimeout — 5…60 секунд.
 */
export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout: number,
  signal?: AbortSignal,
): Promise<NotificationReceipt | null> {
  return call<NotificationReceipt>(credentials, {
    httpMethod: 'GET',
    method: 'receiveNotification',
    query: { receiveTimeout },
    signal,
  });
}

/** Подтверждение обработки. Только DELETE — POST для этого метода даёт 400. */
export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<DeleteNotificationResponse | null> {
  return call<DeleteNotificationResponse>(credentials, {
    httpMethod: 'DELETE',
    method: 'deleteNotification',
    path: `/${receiptId}`,
    signal,
  });
}
