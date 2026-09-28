/** Личный чат в MAX адресуется положительным chatId, групповой — отрицательным (спека §6.5). */
export type ChatId = string;

export type Chat = {
  chatId: ChatId;
  /** Как ввёл пользователь. Нет у чата, созданного из входящего сообщения. */
  phone?: string;
  /** Из senderData.chatName, появляется после первого входящего. */
  name?: string;
  /** Секунды Unix, как timestamp в API. */
  createdAt: number;
  unread: number;
};

export type MessageStatus = 'sending' | 'sent' | 'failed';

export type Message = {
  /** idMessage из API; до ответа сервера — local-<uuid>. */
  id: string;
  direction: 'in' | 'out';
  text: string;
  /** Секунды Unix, как в API. */
  timestamp: number;
  status: MessageStatus;
};

/** Уведомление incomingMessageReceived, разобранное до нужных полей (спека §6.4). */
export type IncomingMessage = {
  chatId: ChatId;
  idMessage: string;
  text: string;
  timestamp: number;
  chatName?: string;
  phone?: string;
};

/**
 * Приводит ввод пользователя к формату для checkAccount.
 * MAX работает только с кодом 7 (РФ) и 375 (РБ), 11 или 12 цифр.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `7${digits}` : digits;
  return /^(7\d{10}|375\d{9})$/.test(normalized) ? normalized : null;
}

export function isGroupChat(chatId: ChatId): boolean {
  return chatId.startsWith('-');
}
