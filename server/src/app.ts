import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';
import { getServerEnv } from './env';
import { createPostgresRepository } from './postgres-repository';
import { createMemoryRepository, type AppRepository } from './repository';

export async function buildApp({ useMemoryDb = false, repository }: { useMemoryDb?: boolean; repository?: AppRepository } = {}) {
  const env = getServerEnv();
  const app = Fastify();
  const repo =
    repository ??
    (useMemoryDb || !env.databaseUrl ? createMemoryRepository() : await createPostgresRepository(env.databaseUrl));

  await app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });

  const io = new SocketServer(app.server, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  const authHeaderSchema = z.string().startsWith('Bearer ');

  async function authenticate(request: { headers: Record<string, string | string[] | undefined> }) {
    const authorization = request.headers.authorization;

    if (!authorization || Array.isArray(authorization)) {
      return null;
    }

    const parsed = authHeaderSchema.safeParse(authorization);

    if (!parsed.success) {
      return null;
    }

    return parsed.data.replace('Bearer ', '');
  }

  async function authenticateToken(token: string | null) {
    if (!token) {
      return null;
    }

    return repo.authenticate(token);
  }

  function emitProposalUpdate(proposal: Awaited<ReturnType<AppRepository['getProposal']>>) {
    if (!proposal) {
      return;
    }

    io.to('lobby').emit('proposal:upsert', proposal);
    io.to(`proposal:${proposal.id}`).emit('proposal:upsert', proposal);
  }

  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : null;
    const user = await authenticateToken(token);

    if (!user) {
      next(new Error('Unauthorized'));
      return;
    }

    next();
  });

  io.on('connection', (socket) => {
    socket.join('lobby');

    socket.on('proposal:join-room', (payload: { proposalId?: string }, callback?: (value: { ok: boolean }) => void) => {
      if (payload?.proposalId) {
        socket.join(`proposal:${payload.proposalId}`);
      }

      callback?.({ ok: true });
    });

    socket.on('proposal:leave-room', (payload: { proposalId?: string }, callback?: (value: { ok: boolean }) => void) => {
      if (payload?.proposalId) {
        socket.leave(`proposal:${payload.proposalId}`);
      }

      callback?.({ ok: true });
    });
  });

  app.addHook('onClose', async () => {
    await io.close();
  });

  app.post('/api/sessions/identify', async (request, reply) => {
    const bodySchema = z.object({
      deviceId: z.string().min(1),
      nickname: z.string().min(1),
    });
    const parsed = bodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid session payload' });
    }

    const payload = await repo.identifySession(parsed.data);
    return reply.code(200).send(payload);
  });

  app.get('/api/bootstrap', async (request, reply) => {
    const token = await authenticate(request);

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const payload = await repo.getBootstrap(token);

    if (!payload) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    return payload;
  });

  app.post('/api/proposals', async (request, reply) => {
    const token = await authenticate(request);
    const bodySchema = z.object({
      title: z.string().min(1),
      proposalType: z.enum(['到店', '外卖', '随机征集']),
      targetName: z.string().default(''),
      eventLabel: z.string().default(''),
      maxPeople: z.number().int().min(2).max(20),
      voteOptions: z.array(z.string()),
    });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const parsed = bodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid proposal payload' });
    }

    const proposal = await repo.createProposal(token, parsed.data);

    if (!proposal) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    emitProposalUpdate(proposal);

    return reply.code(201).send(proposal);
  });

  app.get('/api/proposals/:proposalId', async (request, reply) => {
    const token = await authenticate(request);
    const paramsSchema = z.object({
      proposalId: z.string().min(1),
    });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const parsed = paramsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid proposal id' });
    }

    const proposal = await repo.getProposal(token, parsed.data.proposalId);

    if (!proposal) {
      return reply.code(404).send({ message: 'Proposal not found' });
    }

    emitProposalUpdate(proposal);

    return proposal;
  });

  app.post('/api/proposals/:proposalId/vote', async (request, reply) => {
    const token = await authenticate(request);
    const paramsSchema = z.object({ proposalId: z.string().min(1) });
    const bodySchema = z.object({ optionId: z.string().min(1) });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ message: 'Invalid vote payload' });
    }

    const proposal = await repo.submitVote(token, params.data.proposalId, body.data.optionId);

    if (!proposal) {
      return reply.code(404).send({ message: 'Proposal not found' });
    }

    emitProposalUpdate(proposal);

    return proposal;
  });

  app.post('/api/proposals/:proposalId/participation/toggle', async (request, reply) => {
    const token = await authenticate(request);
    const paramsSchema = z.object({ proposalId: z.string().min(1) });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: 'Invalid proposal id' });
    }

    const proposal = await repo.toggleParticipation(token, params.data.proposalId);

    if (!proposal) {
      return reply.code(404).send({ message: 'Proposal not found' });
    }

    emitProposalUpdate(proposal);

    return proposal;
  });

  app.post('/api/proposals/:proposalId/messages', async (request, reply) => {
    const token = await authenticate(request);
    const paramsSchema = z.object({ proposalId: z.string().min(1) });
    const bodySchema = z.object({ content: z.string().min(1) });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ message: 'Invalid message payload' });
    }

    const proposal = await repo.addMessage(token, params.data.proposalId, body.data.content);

    if (!proposal) {
      return reply.code(404).send({ message: 'Proposal not found' });
    }

    return proposal;
  });

  app.post('/api/shares', async (request, reply) => {
    const token = await authenticate(request);
    const bodySchema = z.object({
      foodName: z.string().min(1),
      shopName: z.string().default(''),
      price: z.string().default(''),
      address: z.string().default(''),
      rating: z.number().int().min(1).max(5),
      comment: z.string().default(''),
    });

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const body = bodySchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ message: 'Invalid share payload' });
    }

    const share = await repo.addShare(token, body.data);

    if (!share) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    io.to('lobby').emit('share:created', share);

    return reply.code(201).send(share);
  });

  app.get('/api/history', async (request, reply) => {
    const token = await authenticate(request);

    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const history = await repo.getHistory(token);

    if (!history) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    return history;
  });

  await app.ready();
  return app;
}
