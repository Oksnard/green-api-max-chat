import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GreenApiError } from '@/api/greenApi';
import { LoginScreen } from '@/screens/LoginScreen';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/greenApi')>();
  return {
    ...actual,
    getStateInstance: vi.fn(),
    getSettings: vi.fn(),
    setSettings: vi.fn(),
  };
});

import { getSettings, getStateInstance, setSettings } from '@/api/greenApi';

const getStateMock = vi.mocked(getStateInstance);
const getSettingsMock = vi.mocked(getSettings);
const setSettingsMock = vi.mocked(setSettings);

const HEALTHY_SETTINGS = {
  wid: '79996396183@c.us',
  webhookUrl: '',
  incomingWebhook: 'yes' as const,
  outgoingWebhook: 'yes' as const,
  stateWebhook: 'yes' as const,
  markIncomingMessagesReaded: 'no' as const,
  delaySendMessagesMilliseconds: 1000,
};

async function fillAndSubmit(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('idInstance'), '310022748042');
  await user.type(screen.getByLabelText('apiTokenInstance'), 'token');
  await user.click(screen.getByRole('button', { name: 'Войти' }));
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  useAuthStore.setState({ credentials: null });
  vi.clearAllMocks();
});

describe('LoginScreen', () => {
  it('сохраняет креды, когда инстанс авторизован и настроен', async () => {
    getStateMock.mockResolvedValue({ stateInstance: 'authorized' });
    getSettingsMock.mockResolvedValue(HEALTHY_SETTINGS);

    render(<LoginScreen />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(useAuthStore.getState().credentials?.apiToken).toBe('token');
    });
    expect(useAuthStore.getState().credentials?.apiUrl).toBe('https://3100.api.green-api.com');
  });

  it('объясняет неавторизованный инстанс и не пускает дальше', async () => {
    getStateMock.mockResolvedValue({ stateInstance: 'notAuthorized' });

    render(<LoginScreen />);
    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('не авторизован');
    expect(useAuthStore.getState().credentials).toBeNull();
  });

  it('показывает ошибку входа при неверном токене', async () => {
    getStateMock.mockRejectedValue(new GreenApiError('Неверный apiTokenInstance', { status: 401 }));

    render(<LoginScreen />);
    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный apiTokenInstance');
    expect(useAuthStore.getState().credentials).toBeNull();
  });

  it('не пускает в чат, пока на инстансе задан webhookUrl, и предлагает очистить', async () => {
    getStateMock.mockResolvedValue({ stateInstance: 'authorized' });
    getSettingsMock.mockResolvedValue({ ...HEALTHY_SETTINGS, webhookUrl: 'https://example.com/hook' });

    render(<LoginScreen />);
    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('webhookUrl');
    expect(useAuthStore.getState().credentials).toBeNull();
    expect(screen.getByRole('button', { name: 'Очистить webhookUrl' })).toBeInTheDocument();
  });

  it('починка настроек повторяет проверку и пускает в чат', async () => {
    const user = userEvent.setup();
    getStateMock.mockResolvedValue({ stateInstance: 'authorized' });
    getSettingsMock
      .mockResolvedValueOnce({ ...HEALTHY_SETTINGS, incomingWebhook: 'no' })
      .mockResolvedValueOnce(HEALTHY_SETTINGS);
    setSettingsMock.mockResolvedValue({ saveSettings: true });

    render(<LoginScreen />);
    await fillAndSubmit();

    await user.click(await screen.findByRole('button', { name: 'Включить приём входящих' }));

    await waitFor(() => {
      expect(useAuthStore.getState().credentials).not.toBeNull();
    });
    expect(setSettingsMock).toHaveBeenCalledWith(expect.anything(), { incomingWebhook: 'yes' });
  });

  it('не отправляет форму с пустыми полями', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(getStateMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Заполните оба поля');
  });

  it('не отправляет форму, если idInstance короче четырёх цифр', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText('idInstance'), '31');
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(getStateMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('хотя бы 4 цифры');
  });

  it('объясняет заблокированный инстанс', async () => {
    getStateMock.mockResolvedValue({ stateInstance: 'blocked' });

    render(<LoginScreen />);
    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('заблокирован');
  });

  it('прячет apiTokenInstance за полем типа password', () => {
    render(<LoginScreen />);

    expect(screen.getByLabelText('apiTokenInstance')).toHaveAttribute('type', 'password');
  });
});
