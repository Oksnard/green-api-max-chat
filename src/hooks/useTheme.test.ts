import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from '@/hooks/useTheme';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  document.documentElement.classList.remove('dark');
});

describe('useTheme', () => {
  it('берёт тему из класса на <html>', () => {
    document.documentElement.classList.add('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('переключает класс и запоминает выбор', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('gamc.theme')).toBe('dark');
  });

  it('возвращается к светлой теме вторым переключением', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle());
    act(() => result.current.toggle());

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('gamc.theme')).toBe('light');
  });
});
