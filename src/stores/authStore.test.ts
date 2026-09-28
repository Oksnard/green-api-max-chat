import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  useAuthStore.setState({ credentials: null });
});

describe('authStore', () => {
  it('изначально не авторизован', () => {
    expect(useAuthStore.getState().credentials).toBeNull();
  });

  it('при сохранении кредов выводит apiUrl из idInstance', () => {
    useAuthStore.getState().setCredentials({
      idInstance: '310022748042',
      apiToken: 'secret-token',
    });

    expect(useAuthStore.getState().credentials).toEqual({
      idInstance: '310022748042',
      apiToken: 'secret-token',
      apiUrl: 'https://3100.api.green-api.com',
    });
  });

  it('«Выйти» очищает креды', () => {
    useAuthStore.getState().setCredentials({ idInstance: '310022748042', apiToken: 'secret-token' });

    useAuthStore.getState().clear();

    expect(useAuthStore.getState().credentials).toBeNull();
  });

  it('сохраняет креды в localStorage под ключом gamc.auth', () => {
    useAuthStore.getState().setCredentials({ idInstance: '310022748042', apiToken: 'secret-token' });

    const stored = JSON.parse(localStorage.getItem('gamc.auth') ?? '{}') as {
      state?: { credentials?: { apiToken?: string } };
    };

    expect(stored.state?.credentials?.apiToken).toBe('secret-token');
  });
});
