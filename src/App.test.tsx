import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { useAuthStore } from '@/stores/authStore';
import { useChatsStore } from '@/stores/chatsStore';

vi.mock('@/services/poller', () => ({ startPoller: vi.fn(() => vi.fn()) }));

beforeEach(() => {
  try { localStorage.clear(); } catch { /* */ }
  useAuthStore.setState({ credentials: null });
  useChatsStore.setState({ chats: [], messages: {}, activeChatId: null });
});

describe('App', () => {
  it('без кредов показывает экран входа', () => {
    render(<App />);

    expect(screen.getByLabelText('idInstance')).toBeInTheDocument();
  });

  it('с кредами показывает чат', () => {
    useAuthStore.setState({
      credentials: {
        idInstance: '310022748042',
        apiToken: 'token',
        apiUrl: 'https://3100.api.green-api.com',
      },
    });

    render(<App />);

    expect(screen.getByText('Чаты')).toBeInTheDocument();
    expect(screen.queryByLabelText('idInstance')).not.toBeInTheDocument();
  });
});
