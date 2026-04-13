import { randomUUID } from 'node:crypto';
import { createSeedState } from '../../../src/app/seed';
import {
  foodSharesTable,
  proposalMessagesTable,
  proposalOptionsTable,
  proposalParticipantsTable,
  proposalsTable,
  proposalVotesTable,
  usersTable,
} from './schema';
import type { AppDb } from './client';

function createSeedUserId(nickname: string) {
  return `seed-user-${nickname}`;
}

export async function ensureSchema(db: AppDb) {
  await db.execute(`
    create table if not exists chi_le_me_users (
      id text primary key,
      device_id text not null unique,
      nickname text not null,
      avatar_seed text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_sessions (
      token text primary key,
      user_id text not null references chi_le_me_users(id) on delete cascade,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_proposals (
      id text primary key,
      title text not null,
      proposal_type text not null,
      target_name text,
      address text,
      event_label text,
      expected_people integer,
      remark text,
      vote_enabled boolean not null default true,
      join_enabled boolean not null default true,
      status text not null,
      vote_mode text not null,
      max_people integer not null,
      creator_user_id text not null references chi_le_me_users(id) on delete cascade,
      final_option_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_proposal_options (
      id text primary key,
      proposal_id text not null references chi_le_me_proposals(id) on delete cascade,
      name text not null,
      sort_order integer not null,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_proposal_votes (
      proposal_id text not null references chi_le_me_proposals(id) on delete cascade,
      option_id text not null references chi_le_me_proposal_options(id) on delete cascade,
      user_id text not null references chi_le_me_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (proposal_id, user_id)
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_proposal_participants (
      proposal_id text not null references chi_le_me_proposals(id) on delete cascade,
      user_id text not null references chi_le_me_users(id) on delete cascade,
      is_active boolean not null default true,
      joined_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (proposal_id, user_id)
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_proposal_messages (
      id text primary key,
      proposal_id text not null references chi_le_me_proposals(id) on delete cascade,
      user_id text not null references chi_le_me_users(id) on delete cascade,
      content text not null,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(`
    create table if not exists chi_le_me_food_shares (
      id text primary key,
      user_id text not null references chi_le_me_users(id) on delete cascade,
      food_name text not null,
      shop_name text,
      price text,
      address text,
      rating integer not null,
      comment text,
      created_at timestamptz not null default now()
    );
  `);
}

export async function seedDatabaseIfEmpty(db: AppDb) {
  const proposalCount = await db.$count(proposalsTable);

  if (proposalCount > 0) {
    return;
  }

  const seed = createSeedState();
  const nicknameSet = new Set<string>();

  for (const proposal of seed.proposals) {
    nicknameSet.add(proposal.creatorNickname);
    proposal.teamMembers.forEach((member) => nicknameSet.add(member.nickname));
    proposal.chatMessages.forEach((message) => nicknameSet.add(message.nickname));
  }

  seed.shares.forEach((share) => nicknameSet.add(share.sharedBy));

  const users = [...nicknameSet].map((nickname) => ({
    id: createSeedUserId(nickname),
    deviceId: `seed-device-${nickname}`,
    nickname,
    avatarSeed: nickname === '吃货小美'
      ? 'Annie'
      : nickname === '火锅杀手'
      ? 'Bob'
      : nickname === '阿西巴'
      ? 'Echo'
      : nickname === '王大锤'
      ? 'Foxtrot'
      : nickname,
  }));

  await db.insert(usersTable).values(users);

  for (const proposal of seed.proposals) {
    const optionIds = proposal.voteOptions.map(() => `seed-option-${randomUUID()}`);
    const optionIdByName = new Map<string, string>();

    proposal.voteOptions.forEach((option, index) => {
      optionIdByName.set(option.name, optionIds[index]);
    });

    await db.insert(proposalsTable).values({
      id: proposal.id,
      title: proposal.title,
      proposalType: proposal.proposalType,
      targetName: proposal.targetName ?? null,
      address: proposal.address ?? null,
      eventLabel: proposal.eventLabel ?? null,
      expectedPeople: proposal.expectedPeopleLabel ? Number(proposal.expectedPeopleLabel.replace(/\D/g, '')) || null : null,
      remark: proposal.remark ?? null,
      voteEnabled: proposal.voteEnabled,
      joinEnabled: proposal.joinEnabled,
      status: proposal.status,
      voteMode: proposal.voteMode,
      maxPeople: proposal.maxPeople,
      creatorUserId: createSeedUserId(proposal.creatorNickname),
      finalOptionId: proposal.finalResult ? optionIdByName.get(proposal.finalResult) ?? null : null,
    });

    await db.insert(proposalOptionsTable).values(
      proposal.voteOptions.map((option, index) => ({
        id: optionIds[index],
        proposalId: proposal.id,
        name: option.name,
        sortOrder: index,
      })),
    );

    const participantNicknames = new Set(proposal.teamMembers.map((member) => member.nickname));
    await db.insert(proposalParticipantsTable).values(
      [...participantNicknames].map((nickname) => ({
        proposalId: proposal.id,
        userId: createSeedUserId(nickname),
        isActive: true,
      })),
    );

    const votes = proposal.voteOptions.flatMap((option) =>
      option.voterNicknames.map((nickname) => ({
        proposalId: proposal.id,
        optionId: optionIdByName.get(option.name)!,
        userId: createSeedUserId(nickname),
      })),
    );

    if (votes.length > 0) {
      await db.insert(proposalVotesTable).values(votes);
    }

    if (proposal.chatMessages.length > 0) {
      await db.insert(proposalMessagesTable).values(
        proposal.chatMessages.map((message) => ({
          id: message.id,
          proposalId: proposal.id,
          userId: createSeedUserId(message.nickname),
          content: message.content,
        })),
      );
    }
  }

  if (seed.shares.length > 0) {
    await db.insert(foodSharesTable).values(
      seed.shares.map((share) => ({
        id: share.id,
        userId: createSeedUserId(share.sharedBy),
        foodName: share.foodName,
        shopName: share.shopName ?? null,
        price: share.price ?? null,
        address: share.address ?? null,
        rating: share.rating,
        comment: share.comment ?? null,
      })),
    );
  }
}
