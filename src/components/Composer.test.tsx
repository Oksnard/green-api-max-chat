import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from '@/components/Composer';

describe('Composer', () => {
  it('отправляет текст по Enter и очищает поле', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    const field = screen.getByLabelText('Текст сообщения');
    await user.type(field, 'Привет{Enter}');

    expect(onSend).toHaveBeenCalledWith('Привет');
    expect(field).toHaveValue('');
  });

  it('по Shift+Enter переносит строку и не отправляет', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    const field = screen.getByLabelText('Текст сообщения');
    await user.type(field, 'Первая{Shift>}{Enter}{/Shift}Вторая');

    expect(onSend).not.toHaveBeenCalled();
    expect(field).toHaveValue('Первая\nВторая');
  });

  it('не отправляет пустое поле', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    await user.type(screen.getByLabelText('Текст сообщения'), '   {Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('отправляет текст без обрамляющих пробелов', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    await user.type(screen.getByLabelText('Текст сообщения'), '  Привет  ');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(onSend).toHaveBeenCalledWith('Привет');
  });

  it('блокирует отправку длиннее 4000 символов и объясняет почему', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    const field = screen.getByLabelText('Текст сообщения');
    await user.click(field);
    await user.paste('x'.repeat(4001));

    expect(screen.getByRole('alert')).toHaveTextContent('4001 из 4000');
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();

    await user.type(field, '{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('ровно 4000 символов отправляются', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);

    const field = screen.getByLabelText('Текст сообщения');
    await user.click(field);
    await user.paste('x'.repeat(4000));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
  });

  it('в выключенном состоянии не отправляет', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled />);

    const field = screen.getByLabelText('Текст сообщения');
    expect(field).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(onSend).not.toHaveBeenCalled();
  });
});
