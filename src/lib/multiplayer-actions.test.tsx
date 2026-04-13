import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('remote multiplayer actions', () => {
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

  it('creates a proposal through the remote API and renders the returned proposal', async () => {
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
          proposals: [],
          shares: [],
          wheelOptions: [],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'remote-created-proposal',
          title: '远程创建提案',
          creatorNickname: '麻辣小王子',
          creatorAvatarSeed: 'Felix',
          createdLabel: '刚刚',
          proposalType: '到店',
          status: '投票中',
          eventLabel: '今天 18:30',
          voteMode: 'single',
          voteOptions: [
            { id: 'a', name: '烤肉', voterNicknames: [] },
            { id: 'b', name: '炒饭', voterNicknames: [] },
          ],
          teamMembers: [{ nickname: '麻辣小王子', avatarSeed: 'Felix', isCreator: true }],
          maxPeople: 4,
          chatMessages: [],
        }),
      } as Response);

    render(<App />);

    await user.type(screen.getByPlaceholderText('输入你的干饭昵称 (必填)'), '麻辣小王子');
    await user.click(screen.getByRole('button', { name: '进入干饭圈' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '一起吃点啥' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '发起提案' }));
    await user.type(screen.getByPlaceholderText('例如：今晚去吃什么？'), '远程创建提案');
    await user.type(screen.getByPlaceholderText('店名/外卖名 (可选)'), '楼下烤肉');
    await user.click(screen.getByRole('button', { name: '发布提案' }));

    await waitFor(() => {
      expect(screen.getByText('远程创建提案')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
