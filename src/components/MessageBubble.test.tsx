import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message } from '@/domain/types';

// Пузырь показывает только время суток, дата не важна — но она должна быть
// локальной, иначе 14:00 превратится в 03:00 в московской зоне.
const LOCAL_14_00 = Math.floor(new Date(2025, 5, 15, 14, 0, 0).getTime() / 1000);

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: '1',
    direction: 'out',
    text: 'Отлично, значит интеграция работает',
    timestamp: LOCAL_14_00,
    status: 'sent',
    ...overrides,
  };
}

describe('MessageBubble', () => {
  it('показывает текст и время', () => {
    render(<MessageBubble message={message()} />);

    expect(screen.getByText('Отлично, значит интеграция работает')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('входящее не показывает галочек', () => {
    render(<MessageBubble message={message({ direction: 'in', status: 'sent' })} />);

    expect(screen.queryByLabelText('Отправлено')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Отправляется')).not.toBeInTheDocument();
  });

  it('исходящее в пути показывает индикатор отправки', () => {
    render(<MessageBubble message={message({ status: 'sending' })} />);

    expect(screen.getByLabelText('Отправляется')).toBeInTheDocument();
  });

  it('исходящее доставленное показывает две галочки', () => {
    render(<MessageBubble message={message({ status: 'sent' })} />);

    expect(screen.getByLabelText('Отправлено')).toBeInTheDocument();
  });

  it('неудачное исходящее предлагает повторить и передаёт id', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<MessageBubble message={message({ id: 'local-7', status: 'failed' })} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(onRetry).toHaveBeenCalledWith('local-7');
  });

  it('сохраняет переносы строк', () => {
    render(<MessageBubble message={message({ text: 'Первая\nВторая' })} />);

    expect(screen.getByText(/Первая/)).toHaveClass('whitespace-pre-wrap');
  });
});
