import { useState, type FormEvent } from 'react';
import {
  deriveApiUrl,
  getSettings,
  getStateInstance,
  setSettings,
  type Credentials,
} from '@/api/greenApi';
import { findBlockingIssues, type SettingsIssue } from '@/api/setupCheck';
import type { GetSettingsResponse, InstanceState } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';

const STATE_HINTS: Record<InstanceState, string> = {
  authorized: 'Инстанс готов к работе.',
  notAuthorized: 'Инстанс не авторизован. Откройте личный кабинет GREEN-API и отсканируйте QR-код в MAX.',
  blocked: 'Инстанс заблокирован. Обратитесь в поддержку GREEN-API.',
  starting: 'Инстанс запускается. Подождите минуту и нажмите «Войти» снова.',
  suspended: 'Аккаунт приостановлен — отправка сообщений недоступна.',
  pendingPassword: 'Инстанс ожидает ввода пароля в личном кабинете GREEN-API.',
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Не удалось подключиться к GREEN-API';
}

export function LoginScreen() {
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const [idInstance, setIdInstance] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<SettingsIssue[]>([]);

  const cleanId = idInstance.trim();
  const cleanToken = apiToken.trim();

  function credentialsOf(): Credentials {
    return { idInstance: cleanId, apiToken: cleanToken, apiUrl: deriveApiUrl(cleanId) };
  }

  /** Возвращает true, если инстанс готов и креды сохранены. */
  async function verify(credentials: Credentials): Promise<boolean> {
    const { stateInstance } = await getStateInstance(credentials);

    if (stateInstance !== 'authorized') {
      setError(STATE_HINTS[stateInstance]);
      setIssues([]);
      return false;
    }

    const settings: GetSettingsResponse = await getSettings(credentials);
    const blocking = findBlockingIssues(settings);

    if (blocking.length > 0) {
      setError(null);
      setIssues(blocking);
      return false;
    }

    setError(null);
    setIssues([]);
    setCredentials({ idInstance: credentials.idInstance, apiToken: credentials.apiToken });
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (cleanId === '' || cleanToken === '') {
      setError('Заполните оба поля');
      setIssues([]);
      return;
    }

    if (cleanId.replace(/\D/g, '').length < 4) {
      setError('idInstance должен содержать хотя бы 4 цифры');
      setIssues([]);
      return;
    }

    setBusy(true);
    try {
      await verify(credentialsOf());
    } catch (caught) {
      setError(describeError(caught));
      setIssues([]);
    } finally {
      setBusy(false);
    }
  }

  async function handleFix(issue: SettingsIssue) {
    setBusy(true);
    try {
      await setSettings(credentialsOf(), issue.patch);
      await verify(credentialsOf());
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-app px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-sm">
        <h1 className="text-[19px] font-semibold text-ink">Чат MAX</h1>
        <p className="mt-1 text-[13px] text-ink-2">
          Введите данные инстанса GREEN-API. Они сохранятся только в этом браузере.
        </p>

        <label className="mt-5 block text-[12px] text-ink-2" htmlFor="id-instance">
          idInstance
        </label>
        <input
          id="id-instance"
          value={idInstance}
          autoComplete="off"
          disabled={busy}
          onChange={(event) => setIdInstance(event.target.value)}
          placeholder="310022748042"
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />

        <label className="mt-4 block text-[12px] text-ink-2" htmlFor="api-token">
          apiTokenInstance
        </label>
        <input
          id="api-token"
          type="password"
          value={apiToken}
          autoComplete="off"
          disabled={busy}
          onChange={(event) => setApiToken(event.target.value)}
          placeholder="Ваш токен"
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] text-danger">
            {error}
          </p>
        )}

        {issues.map((issue) => (
          <div key={issue.fixLabel} className="mt-3 rounded-xl bg-surface-2 p-3">
            <p role="alert" className="text-[12.5px] text-ink-2">
              {issue.message}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleFix(issue)}
              className="accent-gradient mt-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
            >
              {issue.fixLabel}
            </button>
          </div>
        ))}

        <button
          type="submit"
          disabled={busy}
          className="accent-gradient mt-6 w-full rounded-xl py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Проверяем…' : 'Войти'}
        </button>

        <p className="mt-3 text-[11.5px] text-ink-3">
          Где взять данные: личный кабинет GREEN-API → нужный инстанс → «Инструкция».
        </p>
      </form>
    </div>
  );
}
