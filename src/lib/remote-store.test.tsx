import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('remote store mode', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    (globalThis as { __CHI_LE_ME_API_BASE_URL__?: string }).__CHI_LE_ME_API_BASE_URL__ = 'http://api.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (globalThis as { __CHI_LE_ME_API_BASE_URL__?: string }).__CHI_LE_ME_API_BASE_URL__;
  });

  it('identifies a remote session and hydrates bootstrap data', async () => {
    const user = userEvent.setup();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentUser: {
            nickname: '麻辣小王子',
            avatarSeed: 'Felix',
          },
          sessionToken: 'remote-session-token',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentUser: {
            nickname: '麻辣小王子',
            avatarSeed: 'Felix',
          },
          proposals: [
            {
              id: 'remote-proposal',
              title: '远程提案：今晚吃烤肉？',
              creatorNickname: '阿强',
              creatorAvatarSeed: 'Annie',
              createdLabel: '刚刚',
              proposalType: '到店',
              status: '投票中',
              eventLabel: '今天 19:30',
              voteMode: 'single',
              voteOptions: [
                { id: 'a', name: '烤肉', voterNicknames: [] },
                { id: 'b', name: '炒饭', voterNicknames: [] },
              ],
              teamMembers: [],
              maxPeople: 4,
              chatMessages: [],
            },
          ],
          shares: [],
          wheelOptions: [],
        }),
      } as Response);

    render(<App />);

    await user.type(screen.getByPlaceholderText('输入你的干饭昵称 (必填)'), '麻辣小王子');
    await user.click(screen.getByRole('button', { name: '进入干饭圈' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '一起吃点啥' })).toBeInTheDocument();
    });

    expect(screen.getByText('远程提案：今晚吃烤肉？')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
