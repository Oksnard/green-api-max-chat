import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '@/api/greenApi';
import { ChatScreen } from '@/screens/ChatScreen';
import { useChatsStore } from '@/stores/chatsStore';

vi.mock('@/services/poller', () => ({
  startPoller: vi.fn(() => vi.fn()),
}));
vi.mock('@/services/sender', () => ({
  sendText: vi.fn(() => Promise.resolve()),
  retry: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/greenApi')>();
  return { ...actual, checkAccount: vi.fn() };
});

import { checkAccount } from '@/api/greenApi';
import { startPoller } from '@/services/poller';
import { sendText } from '@/services/sender';

const CREDS: Credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '310022748042',
  apiToken: 'token',
};

const startPollerMock = vi.mocked(startPoller);
const sendTextMock = vi.mocked(sendText);
const checkAccountMock = vi.mocked(checkAccount);

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  vi.clearAllMocks();
  useChatsStore.setState({
    chats: [{ chatId: '181089250', phone: '79996396183', name: 'Ирина Соколова', createdAt: 1, unread: 0 }],
    messages: {
      '181089250': [
        { id: '1', direction: 'in', text: 'Привет!', timestamp: 1735689600, status: 'sent' },
      ],
    },
    activeChatId: '181089250',
  });
});

describe('ChatScreen', () => {
  it('запускает поллер при монтировании и останавливает при размонтировании', () => {
    const stop = vi.fn();
    startPollerMock.mockReturnValue(stop);

    const { unmount } = render(<ChatScreen credentials={CREDS} />);
    unmount();

    expect(startPollerMock).toHaveBeenCalledWith(CREDS, expect.anything());
    expect(stop).toHaveBeenCalled();
  });

  it('показывает ленту активного чата и его имя', () => {
    render(<ChatScreen credentials={CREDS} />);

    expect(screen.getAllByText('Привет!').length).toBe(2);
    expect(screen.getAllByText('Ирина Соколова').length).toBeGreaterThan(0);
  });

  it('отправляет набранный текст в активный чат', async () => {
    const user = userEvent.setup();
    render(<ChatScreen credentials={CREDS} />);

    await user.type(screen.getByLabelText('Текст сообщения'), 'Ответ{Enter}');

    expect(sendTextMock).toHaveBeenCalledWith(CREDS, '181089250', 'Ответ');
  });

  it('без активного чата показывает заглушку и не показывает поле ввода', () => {
    useChatsStore.setState({ chats: [], messages: {}, activeChatId: null });

    render(<ChatScreen credentials={CREDS} />);

    expect(screen.getByText(/Выберите чат слева/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Текст сообщения')).not.toBeInTheDocument();
  });

  it('создаёт чат по номеру через checkAccount', async () => {
    const user = userEvent.setup();
    checkAccountMock.mockResolvedValue({ exist: true, chatId: '555', fromCache: false });
    useChatsStore.setState({ chats: [], messages: {}, activeChatId: null });

    render(<ChatScreen credentials={CREDS} />);

    await user.click(screen.getByRole('button', { name: 'Новый чат' }));
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    await waitFor(() => {
      expect(useChatsStore.getState().chats[0]?.chatId).toBe('555');
    });
    expect(checkAccountMock).toHaveBeenCalledWith(CREDS, '79991234567');
  });

  it('объясняет, что номера нет в MAX', async () => {
    const user = userEvent.setup();
    checkAccountMock.mockResolvedValue({ exist: false, chatId: '', fromCache: false });

    render(<ChatScreen credentials={CREDS} />);

    await user.click(screen.getByRole('button', { name: 'Новый чат' }));
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('не зарегистрирован в MAX');
  });

  it('не пускает в checkAccount номер неподдерживаемого формата', async () => {
    const user = userEvent.setup();
    render(<ChatScreen credentials={CREDS} />);

    await user.click(screen.getByRole('button', { name: 'Новый чат' }));
    await user.type(screen.getByLabelText('Номер телефона получателя'), '12345');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('+7');
    expect(checkAccountMock).not.toHaveBeenCalled();
  });

  it('переключает активный чат по клику в сайдбаре', async () => {
    const user = userEvent.setup();
    useChatsStore.setState({
      chats: [
        { chatId: '181089250', name: 'Ирина Соколова', createdAt: 1, unread: 0 },
        { chatId: '555', name: 'Алексей', createdAt: 2, unread: 0 },
      ],
      messages: {},
      activeChatId: '181089250',
    });

    render(<ChatScreen credentials={CREDS} />);
    await user.click(screen.getByText('Алексей'));

    expect(useChatsStore.getState().activeChatId).toBe('555');
  });
});
