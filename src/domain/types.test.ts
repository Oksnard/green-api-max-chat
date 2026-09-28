import { describe, expect, it } from 'vitest';
import { isGroupChat, normalizePhone } from '@/domain/types';

describe('normalizePhone', () => {
  it('приводит номер с разделителями к 11 цифрам с кодом 7', () => {
    expect(normalizePhone('+7 999 123-45-67')).toBe('79991234567');
  });

  it('дописывает код 7 к десяти цифрам', () => {
    expect(normalizePhone('9991234567')).toBe('79991234567');
  });

  it('принимает белорусский номер с кодом 375', () => {
    expect(normalizePhone('375 29 123-45-67')).toBe('375291234567');
  });

  it('возвращает null для номера неподдерживаемой длины', () => {
    expect(normalizePhone('12345')).toBeNull();
  });

  it('возвращает null для кода страны, которого нет в MAX', () => {
    expect(normalizePhone('+1 415 555 0100')).toBeNull();
  });

  it('возвращает null для пустой строки', () => {
    expect(normalizePhone('   ')).toBeNull();
  });
});

describe('isGroupChat', () => {
  it('считает групповым чат с отрицательным chatId', () => {
    expect(isGroupChat('-10000000000000')).toBe(true);
  });

  it('считает личным чат с положительным chatId', () => {
    expect(isGroupChat('181089250')).toBe(false);
  });
});
