import { useState, type FormEvent, type KeyboardEvent } from 'react';

/** Ограничение метода sendMessage в GREEN-API (спека §6.3). */
const MAX_LENGTH = 4000;

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function Composer({ onSend, disabled = false }: Props) {
  const [text, setText] = useState('');

  const tooLong = text.length > MAX_LENGTH;
  const canSend = text.trim() !== '' && !tooLong && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-none flex-col gap-1 border-t border-line bg-surface px-3 py-2.5"
    >
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Текст сообщения"
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-[20px] bg-surface-2 px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3 disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Отправить"
          disabled={!canSend}
          className="accent-gradient flex h-10 w-10 flex-none items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
        >
          ➤
        </button>
      </div>

      {tooLong && (
        <p role="alert" className="px-1 text-[12px] text-danger">
          Слишком длинное сообщение: {text.length} из {MAX_LENGTH} символов
        </p>
      )}
    </form>
  );
}
