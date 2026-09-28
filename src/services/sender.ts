import { sendMessage, type Credentials } from '@/api/greenApi';
import { useChatsStore } from '@/stores/chatsStore';

async function deliver(
  credentials: Credentials,
  chatId: string,
  messageId: string,
  text: string,
): Promise<void> {
  useChatsStore.getState().setMessageStatus(chatId, messageId, 'sending');

  try {
    const { idMessage } = await sendMessage(credentials, chatId, text);
    useChatsStore.getState().confirmSent(chatId, messageId, idMessage);
  } catch (error) {
    useChatsStore.getState().setMessageStatus(chatId, messageId, 'failed');
    throw error;
  }
}

/** Кладёт сообщение в ленту и отправляет его. Ошибку пробрасывает — UI показывает её пользователю. */
export async function sendText(credentials: Credentials, chatId: string, text: string): Promise<void> {
  const messageId = useChatsStore.getState().appendOutgoing(chatId, text);
  await deliver(credentials, chatId, messageId, text);
}

/** Повторная попытка для сообщения со статусом failed. */
export async function retry(
  credentials: Credentials,
  chatId: string,
  messageId: string,
): Promise<void> {
  const message = (useChatsStore.getState().messages[chatId] ?? []).find(
    (item) => item.id === messageId,
  );

  if (!message) return;

  await deliver(credentials, chatId, messageId, message.text);
}
