import type { GetSettingsResponse } from '@/api/types';

export type SettingsIssue = {
  message: string;
  fixLabel: string;
  /** Одно поле за запрос — setSettings принимает только одиночные поля (спека §6.3). */
  patch: Record<string, string>;
};

export function findBlockingIssues(settings: GetSettingsResponse): SettingsIssue[] {
  const issues: SettingsIssue[] = [];

  if (settings.webhookUrl.trim() !== '') {
    issues.push({
      message:
        'На инстансе задан webhookUrl. Пока он задан, GREEN-API не отдаёт сообщения через receiveNotification и отвечает ошибкой 400. Очистите его — после этого подождите около минуты.',
      fixLabel: 'Очистить webhookUrl',
      patch: { webhookUrl: '' },
    });
  }

  if (settings.incomingWebhook !== 'yes') {
    issues.push({
      message:
        'Приём входящих отключён (incomingWebhook = no). Входящие сообщения не попадут в очередь и получатель не сможет вам ответить в веб-чате.',
      fixLabel: 'Включить приём входящих',
      patch: { incomingWebhook: 'yes' },
    });
  }

  return issues;
}
