// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('proposal routes', () => {
  afterEach(async () => {
    if ((globalThis as { __app?: { close: () => Promise<void> } }).__app) {
      await (globalThis as { __app?: { close: () => Promise<void> } }).__app?.close();
      delete (globalThis as { __app?: { close: () => Promise<void> } }).__app;
    }
  });

  it('creates a proposal and returns it in bootstrap and detail', async () => {
    const app = await buildApp({ useMemoryDb: true });
    (globalThis as { __app?: typeof app }).__app = app;

    const identify = await app.inject({
      method: 'POST',
      url: '/api/sessions/identify',
      payload: {
        deviceId: 'device-create',
        nickname: '发起人',
      },
    });

    const token = identify.json().sessionToken as string;

    const createProposal = await app.inject({
      method: 'POST',
      url: '/api/proposals',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: '今晚一起吃烧烤？',
        proposalType: '到店',
        targetName: '宿舍楼下烧烤摊',
        eventLabel: '今天 20:00',
        maxPeople: 4,
        voteOptions: ['楼下烧烤', '街口炒饭'],
      },
    });

    expect(createProposal.statusCode).toBe(201);
    expect(createProposal.json().title).toBe('今晚一起吃烧烤？');

    const bootstrap = await app.inject({
      method: 'GET',
      url: '/api/bootstrap',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().proposals[0].title).toBe('今晚一起吃烧烤？');

    const proposalId = createProposal.json().id as string;

    const detail = await app.inject({
      method: 'GET',
      url: `/api/proposals/${proposalId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.json().voteOptions).toHaveLength(2);
  });
});
