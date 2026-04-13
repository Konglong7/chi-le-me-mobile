import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type {
  AppUser,
  CreateProposalInput,
  CreateShareInput,
  Proposal,
  SharePost,
  TeamMember,
  VoteOption,
  WheelOption,
} from '../../src/app/types';
import { createDb } from './db/client';
import { ensureSchema, seedDatabaseIfEmpty } from './db/bootstrap';
import {
  foodSharesTable,
  proposalMessagesTable,
  proposalOptionsTable,
  proposalParticipantsTable,
  proposalsTable,
  proposalVotesTable,
  sessionsTable,
  usersTable,
} from './db/schema';
import type { AppRepository, BootstrapPayload, SessionPayload } from './repository';

function createAvatarSeed(nickname: string) {
  return nickname || 'guest';
}

function formatRecentLabel(date: Date) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 1) {
    return '刚刚';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }

  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function deriveStatus(input: { teamCount: number; maxPeople: number; optionCount: number; voteEnabled: boolean; joinEnabled: boolean }) {
  if (!input.joinEnabled && !input.voteEnabled) {
    return '组队中' as const;
  }

  if (input.teamCount >= input.maxPeople) {
    return '已成团' as const;
  }

  if (input.voteEnabled && input.optionCount > 1) {
    return '投票中' as const;
  }

  return '组队中' as const;
}

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createPostgresRepository(databaseUrl: string): Promise<AppRepository> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });
  return createPostgresRepositoryFromPool(pool);
}

export async function createPostgresRepositoryFromPool(pool: Pool): Promise<AppRepository> {
  const db = createDb(pool);
  await ensureSchema(db);
  await seedDatabaseIfEmpty(db);

  async function authenticate(token: string): Promise<AppUser | null> {
    const rows = await db
      .select({
        nickname: usersTable.nickname,
        avatarSeed: usersTable.avatarSeed,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
      .where(eq(sessionsTable.token, token))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      nickname: row.nickname,
      avatarSeed: row.avatarSeed,
    };
  }

  async function getUserIdByToken(token: string) {
    const rows = await db.select({ userId: sessionsTable.userId }).from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
    return rows[0]?.userId ?? null;
  }

  async function mapProposalById(proposalId: string): Promise<Proposal | null> {
    const proposalRows = await db
      .select({
        id: proposalsTable.id,
        title: proposalsTable.title,
        proposalType: proposalsTable.proposalType,
        targetName: proposalsTable.targetName,
        address: proposalsTable.address,
        eventLabel: proposalsTable.eventLabel,
        expectedPeople: proposalsTable.expectedPeople,
        remark: proposalsTable.remark,
        voteEnabled: proposalsTable.voteEnabled,
        joinEnabled: proposalsTable.joinEnabled,
        status: proposalsTable.status,
        voteMode: proposalsTable.voteMode,
        maxPeople: proposalsTable.maxPeople,
        creatorNickname: usersTable.nickname,
        creatorAvatarSeed: usersTable.avatarSeed,
        creatorUserId: proposalsTable.creatorUserId,
        createdAt: proposalsTable.createdAt,
        finalOptionId: proposalsTable.finalOptionId,
      })
      .from(proposalsTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalsTable.creatorUserId))
      .where(eq(proposalsTable.id, proposalId))
      .limit(1);

    const proposalRow = proposalRows[0];

    if (!proposalRow) {
      return null;
    }

    const optionRows = await db
      .select({
        id: proposalOptionsTable.id,
        name: proposalOptionsTable.name,
        sortOrder: proposalOptionsTable.sortOrder,
      })
      .from(proposalOptionsTable)
      .where(eq(proposalOptionsTable.proposalId, proposalId))
      .orderBy(asc(proposalOptionsTable.sortOrder));

    const optionIds = optionRows.map((row) => row.id);

    const voteRows =
      optionIds.length === 0
        ? []
        : await db
            .select({
              optionId: proposalVotesTable.optionId,
              nickname: usersTable.nickname,
            })
            .from(proposalVotesTable)
            .innerJoin(usersTable, eq(usersTable.id, proposalVotesTable.userId))
            .where(eq(proposalVotesTable.proposalId, proposalId));

    const participantRows = await db
      .select({
        nickname: usersTable.nickname,
        avatarSeed: usersTable.avatarSeed,
        userId: usersTable.id,
      })
      .from(proposalParticipantsTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalParticipantsTable.userId))
      .where(and(eq(proposalParticipantsTable.proposalId, proposalId), eq(proposalParticipantsTable.isActive, true)))
      .orderBy(asc(proposalParticipantsTable.joinedAt));

    const messageRows = await db
      .select({
        id: proposalMessagesTable.id,
        content: proposalMessagesTable.content,
        nickname: usersTable.nickname,
        avatarSeed: usersTable.avatarSeed,
      })
      .from(proposalMessagesTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalMessagesTable.userId))
      .where(eq(proposalMessagesTable.proposalId, proposalId))
      .orderBy(asc(proposalMessagesTable.createdAt));

    const voteOptions: VoteOption[] = optionRows.map((option) => ({
      id: option.id,
      name: option.name,
      voterNicknames: voteRows.filter((vote) => vote.optionId === option.id).map((vote) => vote.nickname),
    }));

    const teamMembers: TeamMember[] = participantRows.map((participant) => ({
      nickname: participant.nickname,
      avatarSeed: participant.avatarSeed,
      isCreator: participant.userId === proposalRow.creatorUserId,
    }));

    const finalResult = proposalRow.finalOptionId
      ? voteOptions.find((option) => option.id === proposalRow.finalOptionId)?.name
      : undefined;

    return {
      id: proposalRow.id,
      title: proposalRow.title,
      creatorNickname: proposalRow.creatorNickname,
      creatorAvatarSeed: proposalRow.creatorAvatarSeed,
      createdLabel: formatRecentLabel(proposalRow.createdAt),
      proposalType: proposalRow.proposalType as Proposal['proposalType'],
      status: deriveStatus({
        teamCount: teamMembers.length,
        maxPeople: proposalRow.maxPeople,
        optionCount: voteOptions.length,
        voteEnabled: proposalRow.voteEnabled,
        joinEnabled: proposalRow.joinEnabled,
      }),
      eventLabel: proposalRow.eventLabel ?? undefined,
      expectedPeopleLabel: proposalRow.expectedPeople ? `预计${proposalRow.expectedPeople}人` : undefined,
      targetName: proposalRow.targetName ?? undefined,
      address: proposalRow.address ?? undefined,
      remark: proposalRow.remark ?? undefined,
      voteEnabled: proposalRow.voteEnabled,
      joinEnabled: proposalRow.joinEnabled,
      voteMode: proposalRow.voteMode as Proposal['voteMode'],
      voteOptions,
      teamMembers,
      maxPeople: proposalRow.maxPeople,
      chatMessages: messageRows.map((message) => ({
        id: message.id,
        nickname: message.nickname,
        avatarSeed: message.avatarSeed,
        content: message.content,
      })),
      historyLabel: formatRecentLabel(proposalRow.createdAt),
      finalResult,
    };
  }

  async function listProposals() {
    const proposalIds = await db.select({ id: proposalsTable.id }).from(proposalsTable).orderBy(desc(proposalsTable.createdAt));
    const proposals = await Promise.all(proposalIds.map((row) => mapProposalById(row.id)));
    return proposals.filter(Boolean) as Proposal[];
  }

  async function listShares() {
    const rows = await db
      .select({
        id: foodSharesTable.id,
        foodName: foodSharesTable.foodName,
        shopName: foodSharesTable.shopName,
        price: foodSharesTable.price,
        address: foodSharesTable.address,
        rating: foodSharesTable.rating,
        comment: foodSharesTable.comment,
        createdAt: foodSharesTable.createdAt,
        sharedBy: usersTable.nickname,
        sharedAvatarSeed: usersTable.avatarSeed,
      })
      .from(foodSharesTable)
      .innerJoin(usersTable, eq(usersTable.id, foodSharesTable.userId))
      .orderBy(desc(foodSharesTable.createdAt));

    return rows.map((row) => ({
      id: row.id,
      foodName: row.foodName,
      shopName: row.shopName ?? undefined,
      price: row.price ?? undefined,
      address: row.address ?? undefined,
      rating: row.rating,
      comment: row.comment ?? undefined,
      sharedBy: row.sharedBy,
      sharedAvatarSeed: row.sharedAvatarSeed,
      sharedAtLabel: formatRecentLabel(row.createdAt),
    })) as SharePost[];
  }

  async function listWheelOptions(): Promise<WheelOption[]> {
    const shares = await listShares();
    const proposals = await listProposals();
    const names = [...shares.map((share) => share.foodName), ...proposals.map((proposal) => proposal.targetName || proposal.title)];
    const unique = [...new Set(names.filter(Boolean))];

    return unique.map((name, index) => ({
      id: `wheel-${index}`,
      name,
    }));
  }

  return {
    async identifySession({ deviceId, nickname }): Promise<SessionPayload> {
      const cleanNickname = nickname.trim();
      const avatarSeed = createAvatarSeed(cleanNickname);

      const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
      let userId = existing[0]?.id;

      if (!userId) {
        userId = randomUUID();
        await db.insert(usersTable).values({
          id: userId,
          deviceId,
          nickname: cleanNickname,
          avatarSeed,
        });
      } else {
        await db
          .update(usersTable)
          .set({
            nickname: cleanNickname,
            avatarSeed,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, userId));
      }

      const sessionToken = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');

      await db.insert(sessionsTable).values({
        token: sessionToken,
        userId,
      });

      return {
        currentUser: {
          nickname: cleanNickname,
          avatarSeed,
        },
        sessionToken,
      };
    },

    authenticate,

    async getBootstrap(token): Promise<BootstrapPayload | null> {
      const currentUser = await authenticate(token);

      if (!currentUser) {
        return null;
      }

      return {
        currentUser,
        proposals: await listProposals(),
        shares: await listShares(),
        wheelOptions: await listWheelOptions(),
      };
    },

    async createProposal(token, payload) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      const proposalId = `proposal-${randomUUID()}`;

      await db.transaction(async (tx) => {
        await tx.insert(proposalsTable).values({
          id: proposalId,
          title: payload.title.trim(),
          proposalType: payload.proposalType,
          targetName: toNullable(payload.targetName),
          eventLabel: toNullable(payload.eventLabel),
          expectedPeople: payload.maxPeople,
          remark: '新提案已发布，快来表态。',
          voteEnabled: payload.voteEnabled,
          joinEnabled: payload.joinEnabled,
          status: payload.voteEnabled && payload.voteOptions.filter((item) => item.trim()).length > 1 ? '投票中' : '组队中',
          voteMode: 'single',
          maxPeople: payload.maxPeople,
          creatorUserId: userId,
        });

        const optionValues = payload.voteEnabled
          ? payload.voteOptions
          .filter((item) => item.trim())
          .map((name, index) => ({
            id: `proposal-option-${randomUUID()}`,
            proposalId,
            name: name.trim(),
            sortOrder: index,
          }))
          : [];

        if (optionValues.length > 0) {
          await tx.insert(proposalOptionsTable).values(optionValues);
        }

        if (payload.joinEnabled) {
          await tx.insert(proposalParticipantsTable).values({
            proposalId,
            userId,
            isActive: true,
          });
        }
      });

      return mapProposalById(proposalId);
    },

    async getProposal(token, proposalId) {
      const currentUser = await authenticate(token);

      if (!currentUser) {
        return null;
      }

      return mapProposalById(proposalId);
    },

    async submitVote(token, proposalId, optionId) {
      const userId = await getUserIdByToken(token);

      if (!userId) {
        return null;
      }

      const proposal = await mapProposalById(proposalId);

      if (!proposal?.voteEnabled) {
        return proposal;
      }

      await db.transaction(async (tx) => {
        await tx.delete(proposalVotesTable).where(and(eq(proposalVotesTable.proposalId, proposalId), eq(proposalVotesTable.userId, userId)));
        await tx.insert(proposalVotesTable).values({
          proposalId,
          optionId,
          userId,
        });
      });

      return mapProposalById(proposalId);
    },

    async toggleParticipation(token, proposalId) {
      const userId = await getUserIdByToken(token);

      if (!userId) {
        return null;
      }

      const proposal = await mapProposalById(proposalId);

      if (!proposal?.joinEnabled || proposal.creatorNickname === (await authenticate(token))?.nickname) {
        return proposal;
      }

      const existing = await db
        .select({ isActive: proposalParticipantsTable.isActive })
        .from(proposalParticipantsTable)
        .where(and(eq(proposalParticipantsTable.proposalId, proposalId), eq(proposalParticipantsTable.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        await db.insert(proposalParticipantsTable).values({
          proposalId,
          userId,
          isActive: true,
        });
      } else {
        await db
          .update(proposalParticipantsTable)
          .set({
            isActive: !existing[0].isActive,
            updatedAt: new Date(),
            joinedAt: !existing[0].isActive ? new Date() : proposalParticipantsTable.joinedAt,
          })
          .where(and(eq(proposalParticipantsTable.proposalId, proposalId), eq(proposalParticipantsTable.userId, userId)));
      }

      return mapProposalById(proposalId);
    },

    async addMessage(token, proposalId, content) {
      const userId = await getUserIdByToken(token);

      if (!userId) {
        return null;
      }

      await db.insert(proposalMessagesTable).values({
        id: `chat-${randomUUID()}`,
        proposalId,
        userId,
        content: content.trim(),
      });

      return mapProposalById(proposalId);
    },

    async addShare(token, payload) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      const shareId = `share-${randomUUID()}`;
      await db.insert(foodSharesTable).values({
        id: shareId,
        userId,
        foodName: payload.foodName.trim(),
        shopName: toNullable(payload.shopName),
        price: toNullable(payload.price),
        address: toNullable(payload.address),
        rating: payload.rating,
        comment: toNullable(payload.comment),
      });

      const rows = await db
        .select({
          id: foodSharesTable.id,
          foodName: foodSharesTable.foodName,
          shopName: foodSharesTable.shopName,
          price: foodSharesTable.price,
          address: foodSharesTable.address,
          rating: foodSharesTable.rating,
          comment: foodSharesTable.comment,
          createdAt: foodSharesTable.createdAt,
        })
        .from(foodSharesTable)
        .where(eq(foodSharesTable.id, shareId))
        .limit(1);

      const row = rows[0];

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        foodName: row.foodName,
        shopName: row.shopName ?? undefined,
        price: row.price ?? undefined,
        address: row.address ?? undefined,
        rating: row.rating,
        comment: row.comment ?? undefined,
        sharedBy: currentUser.nickname,
        sharedAvatarSeed: currentUser.avatarSeed,
        sharedAtLabel: formatRecentLabel(row.createdAt),
      };
    },

    async getHistory(token) {
      const currentUser = await authenticate(token);

      if (!currentUser) {
        return null;
      }

      return {
        proposals: await listProposals(),
        shares: await listShares(),
      };
    },
  };
}
