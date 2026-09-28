import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/Sidebar';
import type { Chat, Message } from '@/domain/types';

const CHATS: Chat[] = [
  { chatId: '181089250', phone: '79996396183', name: 'Ирина Соколова', createdAt: 1, unread: 2 },
  { chatId: '777', phone: '79990000000', createdAt: 2, unread: 0 },
];

const MESSAGES: Record<string, Message[]> = {
  '181089250': [
    { id: '1', direction: 'in', text: 'Привет!', timestamp: 1735689600, status: 'sent' },
    { id: '2', direction: 'out', text: 'Отлично', timestamp: 1735689700, status: 'sent' },
  ],
};

function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const props = {
    chats: CHATS,
    messages: MESSAGES,
    activeChatId: null as string | null,
    onSelect: vi.fn(),
    onNewChat: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe('Sidebar', () => {
  it('перечисляет чаты', () => {
    renderSidebar();

    expect(screen.getByText('Ирина Соколова')).toBeInTheDocument();
    expect(screen.getByText('+79990000000')).toBeInTheDocument();
  });

  it('показывает последнее сообщение чата, а не первое', () => {
    renderSidebar();

    expect(screen.getByText('Вы: Отлично')).toBeInTheDocument();
  });

  it('сообщает о выборе чата', async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    await user.click(screen.getByText('Ирина Соколова'));

    expect(props.onSelect).toHaveBeenCalledWith('181089250');
  });

  it('сообщает о желании создать новый чат', async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Новый чат' }));

    expect(props.onNewChat).toHaveBeenCalled();
  });

  it('сообщает о выходе', async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    expect(props.onLogout).toHaveBeenCalled();
  });

  it('без чатов показывает подсказку', () => {
    renderSidebar({ chats: [], messages: {} });

    expect(screen.getByText(/Пока нет чатов/)).toBeInTheDocument();
  });
});
