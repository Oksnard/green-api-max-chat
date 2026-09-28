import { describe, expect, it } from 'vitest';
import { formatListTime, formatTime } from '@/lib/format';

/** 15 июня 2025, 12:00 по местному времени — опорная точка для «сегодня/вчера». */
const NOW = Math.floor(new Date(2025, 5, 15, 12, 0, 0).getTime() / 1000);

function secondsOf(year: number, month: number, day: number, hour: number, minute: number): number {
  return Math.floor(new Date(year, month, day, hour, minute, 0).getTime() / 1000);
}

describe('formatTime', () => {
  it('показывает часы и минуты', () => {
    expect(formatTime(secondsOf(2025, 5, 15, 14, 32))).toBe('14:32');
  });
});

describe('formatListTime', () => {
  it('для сегодняшнего сообщения показывает время', () => {
    expect(formatListTime(secondsOf(2025, 5, 15, 9, 5), NOW)).toBe('09:05');
  });

  it('для вчерашнего сообщения показывает «Вчера»', () => {
    expect(formatListTime(secondsOf(2025, 5, 14, 23, 59), NOW)).toBe('Вчера');
  });

  it('для более старого сообщения показывает день и месяц', () => {
    expect(formatListTime(secondsOf(2025, 5, 3, 10, 0), NOW)).toBe('03.06');
  });
});
