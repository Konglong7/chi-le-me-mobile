import { and, asc, desc, eq } from 'drizzle-orm';
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
import type { AdminContentQuery, AppRepository, BootstrapPayload, SessionPayload } from './repository';
import type {
  AdminContentRecord,
  AdminDashboardPayload,
  AdminEvent,
  AdminKeyword,
  AdminUserDetail,
  AdminUserSummary,
} from '../../src/admin/types';
import {
  applyContentStatusFilter,
  createAdminEvent,
  createAdminStats,
  isToday,
  matchKeywords,
  nowIso,
  sortByCreatedAtDesc,
} from './admin-helpers';
import { createDb } from './db/client';
import { ensureSchema, seedDatabaseIfEmpty } from './db/bootstrap';
import {
  adminEventsTable,
  adminKeywordsTable,
  foodSharesTable,
  proposalMessagesTable,
  proposalOptionsTable,
  proposalParticipantsTable,
  proposalsTable,
  proposalVotesTable,
  sessionsTable,
  usersTable,
} from './db/schema';

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

function mapAdminEventRow(row: {
  id: string;
  eventType: string;
  actorType: string;
  actorUserId: string | null;
  actorName: string;
  targetType: string;
  targetId: string | null;
  proposalId: string | null;
  summary: string;
  matchedKeywords: string[] | null;
  createdAt: Date;
}): AdminEvent {
  return {
    id: row.id,
    eventType: row.eventType as AdminEvent['eventType'],
    actorType: row.actorType as AdminEvent['actorType'],
    actorUserId: row.actorUserId ?? undefined,
    actorName: row.actorName,
    targetType: row.targetType as AdminEvent['targetType'],
    targetId: row.targetId ?? undefined,
    proposalId: row.proposalId ?? undefined,
    summary: row.summary,
    matchedKeywords: row.matchedKeywords ?? [],
    createdAt: row.createdAt.toISOString(),
  };
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
    return row ? { nickname: row.nickname, avatarSeed: row.avatarSeed } : null;
  }

  async function getUserIdByToken(token: string) {
    const rows = await db
      .select({ userId: sessionsTable.userId })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);

    return rows[0]?.userId ?? null;
  }

  async function touchUser(userId: string) {
    await db.update(usersTable).set({ lastActiveAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, userId));
  }

  async function listKeywords() {
    const rows = await db
      .select({
        id: adminKeywordsTable.id,
        keyword: adminKeywordsTable.keyword,
        createdAt: adminKeywordsTable.createdAt,
      })
      .from(adminKeywordsTable)
      .orderBy(desc(adminKeywordsTable.createdAt));

    return rows.map((row) => ({
      id: row.id,
      keyword: row.keyword,
      createdAt: row.createdAt.toISOString(),
    })) satisfies AdminKeyword[];
  }

  async function detectKeywords(values: Array<string | undefined | null>) {
    return matchKeywords(await listKeywords(), values);
  }

  async function logEvent(event: Omit<AdminEvent, 'id' | 'createdAt'> & { createdAt?: string }) {
    const next = createAdminEvent(event);

    await db.insert(adminEventsTable).values({
      id: next.id,
      eventType: next.eventType,
      actorType: next.actorType,
      actorUserId: next.actorUserId ?? null,
      actorName: next.actorName,
      targetType: next.targetType,
      targetId: next.targetId ?? null,
      proposalId: next.proposalId ?? null,
      summary: next.summary,
      matchedKeywords: next.matchedKeywords ?? [],
      createdAt: new Date(next.createdAt),
    });

    return next;
  }

  async function listEvents(limit = 100) {
    const rows = await db
      .select({
        id: adminEventsTable.id,
        eventType: adminEventsTable.eventType,
        actorType: adminEventsTable.actorType,
        actorUserId: adminEventsTable.actorUserId,
        actorName: adminEventsTable.actorName,
        targetType: adminEventsTable.targetType,
        targetId: adminEventsTable.targetId,
        proposalId: adminEventsTable.proposalId,
        summary: adminEventsTable.summary,
        matchedKeywords: adminEventsTable.matchedKeywords,
        createdAt: adminEventsTable.createdAt,
      })
      .from(adminEventsTable)
      .orderBy(desc(adminEventsTable.createdAt))
      .limit(limit);

    return rows.map(mapAdminEventRow);
  }

  async function createSensitiveEvents(params: {
    actorUserId: string;
    actorName: string;
    targetType: 'proposal' | 'message' | 'share';
    targetId: string;
    proposalId?: string;
    matchedKeywords: string[];
    summary: string;
    createdAt?: string;
  }) {
    if (params.matchedKeywords.length === 0) {
      return;
    }

    await logEvent({
      eventType: 'sensitive_hit',
      actorType: 'user',
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      targetType: params.targetType,
      targetId: params.targetId,
      proposalId: params.proposalId,
      summary: params.summary,
      matchedKeywords: params.matchedKeywords,
      createdAt: params.createdAt,
    });
  }

  async function mapProposalById(proposalId: string, includeDeleted = false): Promise<Proposal | null> {
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
        voteMode: proposalsTable.voteMode,
        maxPeople: proposalsTable.maxPeople,
        creatorNickname: usersTable.nickname,
        creatorAvatarSeed: usersTable.avatarSeed,
        creatorUserId: proposalsTable.creatorUserId,
        createdAt: proposalsTable.createdAt,
        finalOptionId: proposalsTable.finalOptionId,
        isDeleted: proposalsTable.isDeleted,
        deletedAt: proposalsTable.deletedAt,
        deletedBy: proposalsTable.deletedBy,
        deleteReason: proposalsTable.deleteReason,
        hasSensitiveHit: proposalsTable.hasSensitiveHit,
        matchedKeywords: proposalsTable.matchedKeywords,
      })
      .from(proposalsTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalsTable.creatorUserId))
      .where(eq(proposalsTable.id, proposalId))
      .limit(1);

    const proposalRow = proposalRows[0];

    if (!proposalRow || (proposalRow.isDeleted && !includeDeleted)) {
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

    const voteRows = await db
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
        createdAt: proposalMessagesTable.createdAt,
        isDeleted: proposalMessagesTable.isDeleted,
        deletedAt: proposalMessagesTable.deletedAt,
        deletedBy: proposalMessagesTable.deletedBy,
        deleteReason: proposalMessagesTable.deleteReason,
        hasSensitiveHit: proposalMessagesTable.hasSensitiveHit,
        matchedKeywords: proposalMessagesTable.matchedKeywords,
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
      chatMessages: messageRows
        .filter((message) => includeDeleted || !message.isDeleted)
        .map((message) => ({
          id: message.id,
          nickname: message.nickname,
          avatarSeed: message.avatarSeed,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          isDeleted: message.isDeleted,
          deletedAt: message.deletedAt?.toISOString(),
          deletedBy: message.deletedBy ?? undefined,
          deleteReason: message.deleteReason ?? undefined,
          hasSensitiveHit: message.hasSensitiveHit,
          matchedKeywords: message.matchedKeywords ?? [],
        })),
      historyLabel: formatRecentLabel(proposalRow.createdAt),
      finalResult: proposalRow.finalOptionId ? voteOptions.find((option) => option.id === proposalRow.finalOptionId)?.name : undefined,
      createdAt: proposalRow.createdAt.toISOString(),
      isDeleted: proposalRow.isDeleted,
      deletedAt: proposalRow.deletedAt?.toISOString(),
      deletedBy: proposalRow.deletedBy ?? undefined,
      deleteReason: proposalRow.deleteReason ?? undefined,
      hasSensitiveHit: proposalRow.hasSensitiveHit,
      matchedKeywords: proposalRow.matchedKeywords ?? [],
    };
  }

  async function listProposals(includeDeleted = false) {
    const rows = await db
      .select({ id: proposalsTable.id })
      .from(proposalsTable)
      .where(includeDeleted ? undefined : eq(proposalsTable.isDeleted, false))
      .orderBy(desc(proposalsTable.createdAt));

    const mapped = await Promise.all(rows.map((row) => mapProposalById(row.id, includeDeleted)));
    return mapped.filter(Boolean) as Proposal[];
  }

  async function listShares(includeDeleted = false) {
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
        isDeleted: foodSharesTable.isDeleted,
        deletedAt: foodSharesTable.deletedAt,
        deletedBy: foodSharesTable.deletedBy,
        deleteReason: foodSharesTable.deleteReason,
        hasSensitiveHit: foodSharesTable.hasSensitiveHit,
        matchedKeywords: foodSharesTable.matchedKeywords,
        sharedBy: usersTable.nickname,
        sharedAvatarSeed: usersTable.avatarSeed,
      })
      .from(foodSharesTable)
      .innerJoin(usersTable, eq(usersTable.id, foodSharesTable.userId))
      .where(includeDeleted ? undefined : eq(foodSharesTable.isDeleted, false))
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
      createdAt: row.createdAt.toISOString(),
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt?.toISOString(),
      deletedBy: row.deletedBy ?? undefined,
      deleteReason: row.deleteReason ?? undefined,
      hasSensitiveHit: row.hasSensitiveHit,
      matchedKeywords: row.matchedKeywords ?? [],
    })) satisfies SharePost[];
  }

  async function listWheelOptions(): Promise<WheelOption[]> {
    const visibleShares = await listShares(false);
    const visibleProposals = await listProposals(false);
    const names = [...visibleShares.map((share) => share.foodName), ...visibleProposals.map((proposal) => proposal.targetName || proposal.title)].filter(Boolean);

    return [...new Set(names)].map((name, index) => ({
      id: `wheel-${index}`,
      name,
    }));
  }

  async function collectAdminContentRecords() {
    const proposalRows = await db
      .select({
        id: proposalsTable.id,
        title: proposalsTable.title,
        createdAt: proposalsTable.createdAt,
        isDeleted: proposalsTable.isDeleted,
        hasSensitiveHit: proposalsTable.hasSensitiveHit,
        matchedKeywords: proposalsTable.matchedKeywords,
        authorName: usersTable.nickname,
      })
      .from(proposalsTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalsTable.creatorUserId))
      .orderBy(desc(proposalsTable.createdAt));

    const messageRows = await db
      .select({
        id: proposalMessagesTable.id,
        content: proposalMessagesTable.content,
        createdAt: proposalMessagesTable.createdAt,
        isDeleted: proposalMessagesTable.isDeleted,
        hasSensitiveHit: proposalMessagesTable.hasSensitiveHit,
        matchedKeywords: proposalMessagesTable.matchedKeywords,
        authorName: usersTable.nickname,
        proposalId: proposalsTable.id,
        proposalTitle: proposalsTable.title,
      })
      .from(proposalMessagesTable)
      .innerJoin(usersTable, eq(usersTable.id, proposalMessagesTable.userId))
      .innerJoin(proposalsTable, eq(proposalsTable.id, proposalMessagesTable.proposalId))
      .orderBy(desc(proposalMessagesTable.createdAt));

    const shareRows = await db
      .select({
        id: foodSharesTable.id,
        foodName: foodSharesTable.foodName,
        comment: foodSharesTable.comment,
        createdAt: foodSharesTable.createdAt,
        isDeleted: foodSharesTable.isDeleted,
        hasSensitiveHit: foodSharesTable.hasSensitiveHit,
        matchedKeywords: foodSharesTable.matchedKeywords,
        authorName: usersTable.nickname,
      })
      .from(foodSharesTable)
      .innerJoin(usersTable, eq(usersTable.id, foodSharesTable.userId))
      .orderBy(desc(foodSharesTable.createdAt));

    const records: AdminContentRecord[] = [
      ...proposalRows.map((row) => ({
        type: 'proposal' as const,
        id: row.id,
        authorName: row.authorName,
        content: row.title,
        proposalTitle: row.title,
        proposalId: row.id,
        createdAt: row.createdAt.toISOString(),
        isDeleted: row.isDeleted,
        hasSensitiveHit: row.hasSensitiveHit,
        matchedKeywords: row.matchedKeywords ?? [],
      })),
      ...messageRows.map((row) => ({
        type: 'message' as const,
        id: row.id,
        authorName: row.authorName,
        content: row.content,
        proposalTitle: row.proposalTitle,
        proposalId: row.proposalId,
        createdAt: row.createdAt.toISOString(),
        isDeleted: row.isDeleted,
        hasSensitiveHit: row.hasSensitiveHit,
        matchedKeywords: row.matchedKeywords ?? [],
      })),
      ...shareRows.map((row) => ({
        type: 'share' as const,
        id: row.id,
        authorName: row.authorName,
        content: row.comment?.trim() ? `${row.foodName} · ${row.comment}` : row.foodName,
        createdAt: row.createdAt.toISOString(),
        isDeleted: row.isDeleted,
        hasSensitiveHit: row.hasSensitiveHit,
        matchedKeywords: row.matchedKeywords ?? [],
      })),
    ];

    return sortByCreatedAtDesc(records);
  }

  return {
    async identifySession({ deviceId, nickname }): Promise<SessionPayload> {
      const cleanNickname = nickname.trim();
      const avatarSeed = createAvatarSeed(cleanNickname);
      const timestamp = new Date();

      const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
      let userId = existing[0]?.id;

      if (!userId) {
        userId = randomUUID();
        await db.insert(usersTable).values({
          id: userId,
          deviceId,
          nickname: cleanNickname,
          avatarSeed,
          lastActiveAt: timestamp,
        });
      } else {
        await db
          .update(usersTable)
          .set({
            nickname: cleanNickname,
            avatarSeed,
            lastActiveAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(usersTable.id, userId));
      }

      const sessionToken = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');

      await db.insert(sessionsTable).values({
        token: sessionToken,
        userId,
      });

      await logEvent({
        eventType: 'user_entered',
        actorType: 'user',
        actorUserId: userId,
        actorName: cleanNickname,
        targetType: 'session',
        summary: `${cleanNickname} 进入了网站`,
        createdAt: timestamp.toISOString(),
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
        proposals: await listProposals(false),
        shares: await listShares(false),
        wheelOptions: await listWheelOptions(),
      };
    },

    async createProposal(token, payload) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      await touchUser(userId);
      const proposalId = `proposal-${randomUUID()}`;
      const createdAt = new Date();
      const matchedKeywords = await detectKeywords([payload.title, payload.targetName, ...payload.voteOptions]);

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
          hasSensitiveHit: matchedKeywords.length > 0,
          matchedKeywords,
          createdAt,
          updatedAt: createdAt,
        });

        const optionValues = payload.voteEnabled
          ? payload.voteOptions
              .filter((item) => item.trim())
              .map((name, index) => ({
                id: `proposal-option-${randomUUID()}`,
                proposalId,
                name: name.trim(),
                sortOrder: index,
                createdAt,
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
            joinedAt: createdAt,
            updatedAt: createdAt,
          });
        }
      });

      await logEvent({
        eventType: 'proposal_created',
        actorType: 'user',
        actorUserId: userId,
        actorName: currentUser.nickname,
        targetType: 'proposal',
        targetId: proposalId,
        proposalId,
        summary: `${currentUser.nickname} 发布了提案：${payload.title.trim()}`,
        createdAt: createdAt.toISOString(),
      });

      await createSensitiveEvents({
        actorUserId: userId,
        actorName: currentUser.nickname,
        targetType: 'proposal',
        targetId: proposalId,
        proposalId,
        matchedKeywords,
        summary: `${payload.title.trim()} 命中了敏感词`,
        createdAt: createdAt.toISOString(),
      });

      return mapProposalById(proposalId, false);
    },

    async getProposal(token, proposalId) {
      const currentUser = await authenticate(token);
      return currentUser ? mapProposalById(proposalId, false) : null;
    },

    async submitVote(token, proposalId, optionId) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      await touchUser(userId);
      const proposal = await mapProposalById(proposalId, false);

      if (!proposal?.voteEnabled) {
        return proposal;
      }

      await db.transaction(async (tx) => {
        await tx.delete(proposalVotesTable).where(and(eq(proposalVotesTable.proposalId, proposalId), eq(proposalVotesTable.userId, userId)));
        await tx.insert(proposalVotesTable).values({
          proposalId,
          optionId,
          userId,
          createdAt: new Date(),
        });
      });

      const updated = await mapProposalById(proposalId, false);
      const selected = updated?.voteOptions.find((option) => option.id === optionId);

      if (updated) {
        await logEvent({
          eventType: 'vote_submitted',
          actorType: 'user',
          actorUserId: userId,
          actorName: currentUser.nickname,
          targetType: 'proposal',
          targetId: proposalId,
          proposalId,
          summary: `${currentUser.nickname} 投票给 ${selected?.name ?? '未知选项'}`,
        });
      }

      return updated;
    },

    async toggleParticipation(token, proposalId) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      await touchUser(userId);
      const proposal = await mapProposalById(proposalId, false);

      if (!proposal?.joinEnabled || proposal.creatorNickname === currentUser.nickname) {
        return proposal;
      }

      const existing = await db
        .select({ isActive: proposalParticipantsTable.isActive })
        .from(proposalParticipantsTable)
        .where(and(eq(proposalParticipantsTable.proposalId, proposalId), eq(proposalParticipantsTable.userId, userId)))
        .limit(1);

      let joined = false;

      if (!existing[0]) {
        joined = true;
        await db.insert(proposalParticipantsTable).values({
          proposalId,
          userId,
          isActive: true,
          joinedAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        joined = !existing[0].isActive;
        await db
          .update(proposalParticipantsTable)
          .set({
            isActive: joined,
            updatedAt: new Date(),
            joinedAt: joined ? new Date() : proposalParticipantsTable.joinedAt,
          })
          .where(and(eq(proposalParticipantsTable.proposalId, proposalId), eq(proposalParticipantsTable.userId, userId)));
      }

      const updated = await mapProposalById(proposalId, false);

      if (updated) {
        await logEvent({
          eventType: joined ? 'participation_joined' : 'participation_left',
          actorType: 'user',
          actorUserId: userId,
          actorName: currentUser.nickname,
          targetType: 'proposal',
          targetId: proposalId,
          proposalId,
          summary: `${currentUser.nickname}${joined ? '加入' : '退出'}了 ${updated.title}`,
        });
      }

      return updated;
    },

    async addMessage(token, proposalId, content) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      await touchUser(userId);
      const messageId = `chat-${randomUUID()}`;
      const createdAt = new Date();
      const matchedKeywords = await detectKeywords([content]);

      await db.insert(proposalMessagesTable).values({
        id: messageId,
        proposalId,
        userId,
        content: content.trim(),
        createdAt,
        hasSensitiveHit: matchedKeywords.length > 0,
        matchedKeywords,
      });

      const proposal = await mapProposalById(proposalId, false);

      if (proposal) {
        await logEvent({
          eventType: 'message_created',
          actorType: 'user',
          actorUserId: userId,
          actorName: currentUser.nickname,
          targetType: 'message',
          targetId: messageId,
          proposalId,
          summary: `${currentUser.nickname} 在 ${proposal.title} 中发送了消息`,
          createdAt: createdAt.toISOString(),
        });

        await createSensitiveEvents({
          actorUserId: userId,
          actorName: currentUser.nickname,
          targetType: 'message',
          targetId: messageId,
          proposalId,
          matchedKeywords,
          summary: `${currentUser.nickname} 的聊天命中了敏感词`,
          createdAt: createdAt.toISOString(),
        });
      }

      return proposal;
    },

    async addShare(token, payload) {
      const userId = await getUserIdByToken(token);
      const currentUser = await authenticate(token);

      if (!userId || !currentUser) {
        return null;
      }

      await touchUser(userId);
      const shareId = `share-${randomUUID()}`;
      const createdAt = new Date();
      const matchedKeywords = await detectKeywords([payload.foodName, payload.shopName, payload.comment]);

      await db.insert(foodSharesTable).values({
        id: shareId,
        userId,
        foodName: payload.foodName.trim(),
        shopName: toNullable(payload.shopName),
        price: toNullable(payload.price),
        address: toNullable(payload.address),
        rating: payload.rating,
        comment: toNullable(payload.comment),
        createdAt,
        hasSensitiveHit: matchedKeywords.length > 0,
        matchedKeywords,
      });

      await logEvent({
        eventType: 'share_created',
        actorType: 'user',
        actorUserId: userId,
        actorName: currentUser.nickname,
        targetType: 'share',
        targetId: shareId,
        summary: `${currentUser.nickname} 分享了 ${payload.foodName.trim()}`,
        createdAt: createdAt.toISOString(),
      });

      await createSensitiveEvents({
        actorUserId: userId,
        actorName: currentUser.nickname,
        targetType: 'share',
        targetId: shareId,
        matchedKeywords,
        summary: `${payload.foodName.trim()} 命中了敏感词`,
        createdAt: createdAt.toISOString(),
      });

      return (await listShares(true)).find((item) => item.id === shareId) ?? null;
    },

    async getHistory(token) {
      const currentUser = await authenticate(token);
      if (!currentUser) {
        return null;
      }

      return {
        proposals: await listProposals(false),
        shares: await listShares(false),
      };
    },

    async getAdminDashboard(): Promise<AdminDashboardPayload> {
      const recentEvents = await listEvents(100);
      const todayEvents = recentEvents.filter((event) => isToday(event.createdAt));
      const activeUsers = new Set(todayEvents.filter((event) => event.actorType === 'user' && event.actorUserId).map((event) => event.actorUserId));

      return {
        stats: createAdminStats({
          activeUsers: activeUsers.size,
          proposals: todayEvents.filter((event) => event.eventType === 'proposal_created').length,
          messages: todayEvents.filter((event) => event.eventType === 'message_created').length,
          shares: todayEvents.filter((event) => event.eventType === 'share_created').length,
          sensitiveHits: todayEvents.filter((event) => event.eventType === 'sensitive_hit').length,
          deletedContents: todayEvents.filter((event) => event.eventType === 'admin_deleted_content').length,
        }),
        recentEvents: recentEvents.slice(0, 24),
      };
    },

    async listAdminContent(query?: AdminContentQuery) {
      const records = await collectAdminContentRecords();
      const filteredByType = query?.type ? records.filter((record) => record.type === query.type) : records;
      return applyContentStatusFilter(filteredByType, query?.status ?? 'all');
    },

    async getAdminContent(type, id) {
      const records = await collectAdminContentRecords();
      return records.find((record) => record.type === type && record.id === id) ?? null;
    },

    async softDeleteAdminContent(type, id, deletedBy, deleteReason) {
      const deletedAt = new Date();

      if (type === 'proposal') {
        await db
          .update(proposalsTable)
          .set({ isDeleted: true, deletedAt, deletedBy, deleteReason: deleteReason ?? null, updatedAt: deletedAt })
          .where(eq(proposalsTable.id, id));
      }

      if (type === 'message') {
        await db
          .update(proposalMessagesTable)
          .set({ isDeleted: true, deletedAt, deletedBy, deleteReason: deleteReason ?? null })
          .where(eq(proposalMessagesTable.id, id));
      }

      if (type === 'share') {
        await db
          .update(foodSharesTable)
          .set({ isDeleted: true, deletedAt, deletedBy, deleteReason: deleteReason ?? null })
          .where(eq(foodSharesTable.id, id));
      }

      const record = await this.getAdminContent(type, id);

      if (record) {
        await logEvent({
          eventType: 'admin_deleted_content',
          actorType: 'admin',
          actorName: deletedBy,
          targetType: type,
          targetId: id,
          proposalId: record.proposalId,
          summary: `${deletedBy} 删除了 ${type}:${id}`,
          createdAt: deletedAt.toISOString(),
        });
      }

      return record;
    },

    async listAdminUsers() {
      const userRows = await db
        .select({
          id: usersTable.id,
          nickname: usersTable.nickname,
          createdAt: usersTable.createdAt,
          lastActiveAt: usersTable.lastActiveAt,
        })
        .from(usersTable)
        .orderBy(desc(usersTable.lastActiveAt));

      const proposalRows = await db.select({ userId: proposalsTable.creatorUserId }).from(proposalsTable);
      const messageRows = await db.select({ userId: proposalMessagesTable.userId }).from(proposalMessagesTable);
      const shareRows = await db.select({ userId: foodSharesTable.userId }).from(foodSharesTable);

      return userRows.map((row) => ({
        id: row.id,
        nickname: row.nickname,
        firstUsedAt: row.createdAt.toISOString(),
        lastActiveAt: row.lastActiveAt.toISOString(),
        proposalCount: proposalRows.filter((item) => item.userId === row.id).length,
        messageCount: messageRows.filter((item) => item.userId === row.id).length,
        shareCount: shareRows.filter((item) => item.userId === row.id).length,
      })) satisfies AdminUserSummary[];
    },

    async getAdminUserDetail(userId) {
      const profile = (await this.listAdminUsers()).find((item) => item.id === userId) ?? null;
      if (!profile) {
        return null;
      }

      return {
        profile,
        recentEvents: (await listEvents(200)).filter((event) => event.actorUserId === userId).slice(0, 20),
      } satisfies AdminUserDetail;
    },

    async listAdminKeywords() {
      return listKeywords();
    },

    async createAdminKeyword(keyword) {
      const clean = keyword.trim();
      const existing = (await listKeywords()).find((item) => item.keyword.toLowerCase() === clean.toLowerCase());

      if (existing) {
        return existing;
      }

      const next: AdminKeyword = {
        id: `keyword-${randomUUID()}`,
        keyword: clean,
        createdAt: nowIso(),
      };

      await db.insert(adminKeywordsTable).values({
        id: next.id,
        keyword: next.keyword,
        createdAt: new Date(next.createdAt),
      });

      return next;
    },

    async deleteAdminKeyword(keywordId) {
      const existing = await db.select({ id: adminKeywordsTable.id }).from(adminKeywordsTable).where(eq(adminKeywordsTable.id, keywordId)).limit(1);

      if (!existing[0]) {
        return false;
      }

      await db.delete(adminKeywordsTable).where(eq(adminKeywordsTable.id, keywordId));
      return true;
    },

    async listAdminLogs() {
      return (await listEvents(200)).filter((event) => event.actorType === 'admin');
    },
  };
}
