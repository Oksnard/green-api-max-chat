import { memo } from 'react';
import type { Message } from '@/domain/types';
import { formatTime } from '@/lib/format';

type Props = {
  message: Message;
  onRetry?: (messageId: string) => void;
};

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: Props) {
  const outgoing = message.direction === 'out';

  return (
    <div
      className={`${outgoing ? 'bubble-out' : 'bubble-in'} max-w-[75%] px-3 py-2 text-[13.5px] leading-snug shadow-sm`}
    >
      <p className="whitespace-pre-wrap break-words">{message.text}</p>

      <div
        className={`mt-1 flex items-center justify-end gap-1.5 text-[10.5px] ${
          outgoing ? 'text-white/70' : 'text-ink-3'
        }`}
      >
        <time>{formatTime(message.timestamp)}</time>

        {outgoing && message.status === 'sending' && <span aria-label="Отправляется">◌</span>}
        {outgoing && message.status === 'sent' && <span aria-label="Отправлено">✓✓</span>}
        {outgoing && message.status === 'failed' && (
          <button
            type="button"
            onClick={() => onRetry?.(message.id)}
            className="font-semibold text-white underline decoration-dotted underline-offset-2"
          >
            Повторить
          </button>
        )}
      </div>
    </div>
  );
});
