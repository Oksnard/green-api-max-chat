const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

function startOfLocalDay(seconds: number): number {
  const date = new Date(seconds * 1000);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

/** Время сообщения: 14:32 */
export function formatTime(seconds: number): string {
  return timeFormat.format(new Date(seconds * 1000));
}

/** Время в списке чатов: сегодня — 14:32, вчера — «Вчера», раньше — 03.06 */
export function formatListTime(seconds: number, now: number = Math.floor(Date.now() / 1000)): string {
  const today = startOfLocalDay(now);
  if (seconds >= today) return timeFormat.format(new Date(seconds * 1000));
  if (seconds >= startOfLocalDay(today - 1)) return 'Вчера';
  return dateFormat.format(new Date(seconds * 1000));
}
