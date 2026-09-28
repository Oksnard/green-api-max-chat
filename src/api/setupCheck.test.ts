import { describe, expect, it } from 'vitest';
import type { GetSettingsResponse } from '@/api/types';
import { findBlockingIssues } from '@/api/setupCheck';

function settings(overrides: Partial<GetSettingsResponse> = {}): GetSettingsResponse {
  return {
    wid: '79996396183@c.us',
    webhookUrl: '',
    incomingWebhook: 'yes',
    outgoingWebhook: 'yes',
    stateWebhook: 'yes',
    markIncomingMessagesReaded: 'no',
    delaySendMessagesMilliseconds: 1000,
    ...overrides,
  };
}

describe('findBlockingIssues', () => {
  it('на здоровом инстансе не находит проблем', () => {
    expect(findBlockingIssues(settings())).toEqual([]);
  });

  it('находит заданный webhookUrl и предлагает его очистить', () => {
    const issues = findBlockingIssues(settings({ webhookUrl: 'https://example.com/hook' }));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.patch).toEqual({ webhookUrl: '' });
    expect(issues[0]?.message).toContain('webhookUrl');
  });

  it('находит отключённый приём входящих и предлагает включить', () => {
    const issues = findBlockingIssues(settings({ incomingWebhook: 'no' }));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.patch).toEqual({ incomingWebhook: 'yes' });
  });

  it('находит обе проблемы сразу', () => {
    const issues = findBlockingIssues(settings({ webhookUrl: 'https://x', incomingWebhook: 'no' }));

    expect(issues.map((issue) => issue.fixLabel)).toEqual([
      'Очистить webhookUrl',
      'Включить приём входящих',
    ]);
  });
});
