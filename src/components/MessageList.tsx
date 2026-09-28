import { useEffect, useRef } from 'react';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message } from '@/domain/types';

type Props = {
  messages: Message[];
  onRetry: (messageId: string) => void;
};

export function MessageList({ messages, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessage?.id, messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-ink-3">
        Сообщений пока нет. Напишите первым.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-app px-4 py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onRetry={onRetry} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
