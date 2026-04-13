// @vitest-environment node
import { io, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';

async function identify(app: Awaited<ReturnType<typeof buildApp>>, deviceId: string, nickname: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/sessions/identify',
    payload: { deviceId, nickname },
  });

  return response.json().sessionToken as string;
}

function waitForEvent<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5000);

    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

async function waitForCondition(assertion: () => boolean, timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (assertion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Condition was not satisfied in time');
}

describe('socket realtime', () => {
  const sockets: Socket[] = [];
  let app: Awaited<ReturnType<typeof buildApp>> | null = null;

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());
    sockets.length = 0;
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('broadcasts proposal and share updates to lobby clients', async () => {
    app = await buildApp({ useMemoryDb: true });
    await app.listen({ host: '127.0.0.1', port: 0 });

    const token = await identify(app, 'socket-device-a', 'Socket用户A');
    const address = app.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const socket = io(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
    });
    sockets.push(socket);

    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const proposalEvent = waitForEvent<{ title: string }>(socket, 'proposal:upsert');

    await app.inject({
      method: 'POST',
      url: '/api/proposals',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Socket 广播提案',
        proposalType: '到店',
        targetName: '新店',
        eventLabel: '今天 18:30',
        maxPeople: 4,
        voteOptions: ['新店', '旧店'],
      },
    });

    await expect(proposalEvent).resolves.toMatchObject({ title: 'Socket 广播提案' });

    const shareEvent = waitForEvent<{ foodName: string }>(socket, 'share:created');

    await app.inject({
      method: 'POST',
      url: '/api/shares',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        foodName: 'Socket 分享炸鸡',
        shopName: '分享店',
        price: '31',
        address: '楼下',
        rating: 5,
        comment: '热乎的',
      },
    });

    await expect(shareEvent).resolves.toMatchObject({ foodName: 'Socket 分享炸鸡' });
  });

  it('broadcasts proposal detail updates to proposal rooms', async () => {
    app = await buildApp({ useMemoryDb: true });
    await app.listen({ host: '127.0.0.1', port: 0 });

    const token = await identify(app, 'socket-device-b', 'Socket用户B');
    const bootstrap = await app.inject({
      method: 'GET',
      url: '/api/bootstrap',
      headers: { authorization: `Bearer ${token}` },
    });
    const proposalId = bootstrap.json().proposals[0].id as string;
    const optionId = bootstrap.json().proposals[0].voteOptions[1].id as string;

    const address = app.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const socket = io(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
    });
    sockets.push(socket);

    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const seenProposalPayloads: Array<{ id: string; voteOptions: Array<{ id: string; voterNicknames: string[] }>; chatMessages: Array<{ content: string }> }> = [];
    socket.on('proposal:upsert', (payload) => {
      seenProposalPayloads.push(payload);
    });

    socket.emit('proposal:join-room', { proposalId });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const voteEventsBefore = seenProposalPayloads.length;

    await fetch(`http://127.0.0.1:${port}/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ optionId }),
    });

    await waitForCondition(() =>
      seenProposalPayloads.length > voteEventsBefore && seenProposalPayloads.some((proposal) => proposal.id === proposalId),
    );

  }, 10000);
});
