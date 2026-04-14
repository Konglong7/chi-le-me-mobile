// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('session and bootstrap routes', () => {
  afterEach(async () => {
    if ((globalThis as { __app?: { close: () => Promise<void> } }).__app) {
      await (globalThis as { __app?: { close: () => Promise<void> } }).__app?.close();
      delete (globalThis as { __app?: { close: () => Promise<void> } }).__app;
    }
  });

  it('identifies a user session and returns bootstrap data', async () => {
    const app = await buildApp({ useMemoryDb: true });
    (globalThis as { __app?: typeof app }).__app = app;

    const identify = await app.inject({
      method: 'POST',
      url: '/api/sessions/identify',
      payload: {
        deviceId: 'device-a',
        nickname: '麻辣小王子',
      },
    });

    expect(identify.statusCode).toBe(200);

    const identifyBody = identify.json();

    expect(identifyBody.currentUser.nickname).toBe('麻辣小王子');
    expect(typeof identifyBody.sessionToken).toBe('string');
    expect(identifyBody.sessionToken.length).toBeGreaterThan(10);

    const bootstrap = await app.inject({
      method: 'GET',
      url: '/api/bootstrap',
      headers: {
        authorization: `Bearer ${identifyBody.sessionToken}`,
      },
    });

    expect(bootstrap.statusCode).toBe(200);

    const bootstrapBody = bootstrap.json();

    expect(bootstrapBody.currentUser.nickname).toBe('麻辣小王子');
    expect(bootstrapBody.proposals.length).toBeGreaterThan(0);
    expect(bootstrapBody.shares.length).toBeGreaterThan(0);
  });

  it('reuses the same device identity and updates nickname', async () => {
    const app = await buildApp({ useMemoryDb: true });
    (globalThis as { __app?: typeof app }).__app = app;

    await app.inject({
      method: 'POST',
      url: '/api/sessions/identify',
      payload: {
        deviceId: 'device-b',
        nickname: '旧昵称',
      },
    });

    const identifyAgain = await app.inject({
      method: 'POST',
      url: '/api/sessions/identify',
      payload: {
        deviceId: 'device-b',
        nickname: '新昵称',
      },
    });

    expect(identifyAgain.statusCode).toBe(200);
    expect(identifyAgain.json().currentUser.nickname).toBe('新昵称');
  });

  it('rejects whitespace-only nicknames', async () => {
    const app = await buildApp({ useMemoryDb: true });
    (globalThis as { __app?: typeof app }).__app = app;

    const identify = await app.inject({
      method: 'POST',
      url: '/api/sessions/identify',
      payload: {
        deviceId: 'device-space',
        nickname: '   ',
      },
    });

    expect(identify.statusCode).toBe(400);
  });
});
