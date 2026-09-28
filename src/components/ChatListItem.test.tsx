import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatListItem } from '@/components/ChatListItem';

const CHAT = { chatId: '181089250', phone: '79996396183', name: 'Ирина Соколова', createdAt: 1, unread: 0 };

// Список чатов форматирует время относительно сегодняшнего дня (сегодня → «14:00»,
// вчера → «Вчера», раньше → «03.06»). Фиксированной константы тут мало: тест
// сломался бы на следующий день. Берём сегодняшние 14:00 по локальному времени.
const TODAY_AT_14 = Math.floor(new Date().setHours(14, 0, 0, 0) / 1000);

describe('ChatListItem', () => {
  it('показывает имя, последнее сообщение и время', () => {
    render(
      <ChatListItem
        chat={CHAT}
        lastMessage={{ id: '1', direction: 'in', text: 'Да, всё получилось', timestamp: TODAY_AT_14, status: 'sent' }}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Ирина Соколова')).toBeInTheDocument();
    expect(screen.getByText('Да, всё получилось')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('подписывает исходящее префиксом «Вы:»', () => {
    render(
      <ChatListItem
        chat={CHAT}
        lastMessage={{ id: '1', direction: 'out', text: 'Отлично', timestamp: TODAY_AT_14, status: 'sent' }}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Вы: Отлично')).toBeInTheDocument();
  });

  it('без сообщений показывает номер телефона', () => {
    render(<ChatListItem chat={{ ...CHAT, name: undefined }} lastMessage={undefined} active={false} onSelect={vi.fn()} />);

    expect(screen.getByText('+79996396183')).toBeInTheDocument();
  });

  it('показывает счётчик непрочитанных', () => {
    render(
      <ChatListItem
        chat={{ ...CHAT, unread: 3 }}
        lastMessage={{ id: '1', direction: 'in', text: 'Привет', timestamp: TODAY_AT_14, status: 'sent' }}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('сообщает о выборе чата', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatListItem chat={CHAT} lastMessage={undefined} active={false} onSelect={onSelect} />);

    await user.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith('181089250');
  });

  it('помечает активный чат для скринридера', () => {
    render(<ChatListItem chat={CHAT} lastMessage={undefined} active onSelect={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
  });
});
