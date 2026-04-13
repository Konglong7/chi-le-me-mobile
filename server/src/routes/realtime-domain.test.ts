// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

async function identify(app: Awaited<ReturnType<typeof buildApp>>, deviceId: string, nickname: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/sessions/identify',
    payload: { deviceId, nickname },
  });

  return response.json().sessionToken as string;
}

describe('proposal domain routes', () => {
  afterEach(async () => {
    if ((globalThis as { __app?: { close: () => Promise<void> } }).__app) {
      await (globalThis as { __app?: { close: () => Promise<void> } }).__app?.close();
      delete (globalThis as { __app?: { close: () => Promise<void> } }).__app;
    }
  });

  it('keeps one vote per user, toggles participation, stores messages and shares, and exposes history', async () => {
    const app = await buildApp({ useMemoryDb: true });
    (globalThis as { __app?: typeof app }).__app = app;

    const token = await identify(app, 'domain-device', '麻辣小王子');

    const bootstrap = await app.inject({
      method: 'GET',
      url: '/api/bootstrap',
      headers: { authorization: `Bearer ${token}` },
    });

    const proposalId = bootstrap.json().proposals[0].id as string;
    const secondOptionId = bootstrap.json().proposals[0].voteOptions[1].id as string;

    const vote = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposalId}/vote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { optionId: secondOptionId },
    });

    expect(vote.statusCode).toBe(200);

    const votedProposal = vote.json();
    const selectedOption = votedProposal.voteOptions.find((option: { id: string }) => option.id === secondOptionId);

    expect(selectedOption.voterNicknames).toContain('麻辣小王子');

    const join = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposalId}/participation/toggle`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(join.statusCode).toBe(200);
    expect(join.json().teamMembers.some((member: { nickname: string }) => member.nickname === '麻辣小王子')).toBe(true);

    const leave = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposalId}/participation/toggle`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(leave.statusCode).toBe(200);
    expect(leave.json().teamMembers.some((member: { nickname: string }) => member.nickname === '麻辣小王子')).toBe(false);

    const message = await app.inject({
      method: 'POST',
      url: `/api/proposals/${proposalId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: '俺也去，顺便帮我带瓶可乐。' },
    });

    expect(message.statusCode).toBe(200);
    expect(message.json().chatMessages.at(-1).content).toBe('俺也去，顺便帮我带瓶可乐。');

    const share = await app.inject({
      method: 'POST',
      url: '/api/shares',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        foodName: '深夜炸鸡套餐',
        shopName: '楼下炸鸡',
        price: '28',
        address: '宿舍楼下',
        rating: 5,
        comment: '深夜党福音，趁热吃很顶。',
      },
    });

    expect(share.statusCode).toBe(201);
    expect(share.json().foodName).toBe('深夜炸鸡套餐');

    const history = await app.inject({
      method: 'GET',
      url: '/api/history',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(history.statusCode).toBe(200);
    expect(history.json().shares[0].foodName).toBe('深夜炸鸡套餐');
  });
});
