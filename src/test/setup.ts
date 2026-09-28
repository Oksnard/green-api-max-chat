import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom не реализует scrollIntoView, а MessageList прокручивает ленту к
// последнему сообщению. Без заглушки тесты ChatScreen падают на TypeError.
Element.prototype.scrollIntoView = vi.fn();

// jsdom не полностью поддерживает localStorage в некоторых версиях.
// Мокаем его для zustand persist middleware.
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

afterEach(() => {
  cleanup();
  try { localStorage.clear(); } catch { /* */ }
  vi.clearAllMocks();
});
