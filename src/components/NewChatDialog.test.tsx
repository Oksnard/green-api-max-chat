import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewChatDialog } from '@/components/NewChatDialog';

describe('NewChatDialog', () => {
  it('создаёт чат по введённому номеру', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NewChatDialog onSubmit={onSubmit} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Номер телефона получателя'), '+7 999 123-45-67');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(onSubmit).toHaveBeenCalledWith('+7 999 123-45-67');
  });

  it('не отправляет пустой номер', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewChatDialog onSubmit={onSubmit} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('показывает ошибку, пришедшую извне', () => {
    render(<NewChatDialog onSubmit={vi.fn()} onClose={vi.fn()} error="Этот номер не зарегистрирован в MAX" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Этот номер не зарегистрирован в MAX');
  });

  it('блокирует кнопку пока идёт проверка', () => {
    render(<NewChatDialog onSubmit={vi.fn()} onClose={vi.fn()} busy />);

    expect(screen.getByRole('button', { name: 'Проверяем номер…' })).toBeDisabled();
  });

  it('закрывается по кнопке отмены', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NewChatDialog onSubmit={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('показывает подсказку о формате номера', () => {
    render(<NewChatDialog onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/только с номерами РФ/)).toBeInTheDocument();
  });
});
