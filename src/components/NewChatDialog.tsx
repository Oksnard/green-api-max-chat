import { useState, type FormEvent } from 'react';

type Props = {
  onSubmit: (phone: string) => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
};

export function NewChatDialog({ onSubmit, onClose, busy = false, error = null }: Props) {
  const [phone, setPhone] = useState('');
  const canSubmit = phone.trim() !== '' && !busy;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    void onSubmit(phone.trim());
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
        role="dialog"
        aria-label="Новый чат"
      >
        <h2 className="text-[15px] font-semibold text-ink">Новый чат</h2>

        <label className="mt-4 block text-[12px] text-ink-2" htmlFor="new-chat-phone">
          Номер телефона получателя
        </label>
        <input
          id="new-chat-phone"
          type="tel"
          inputMode="tel"
          autoFocus
          value={phone}
          disabled={busy}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 999 123-45-67"
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />
        <p className="mt-1.5 text-[11px] text-ink-3">
          MAX работает только с номерами РФ (+7) и Беларуси (+375).
        </p>

        {error && (
          <p role="alert" className="mt-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-line"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="accent-gradient rounded-full px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Проверяем номер…' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  );
}
