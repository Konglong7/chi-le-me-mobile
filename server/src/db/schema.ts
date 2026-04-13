import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'chi_le_me_users',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id').notNull(),
    nickname: text('nickname').notNull(),
    avatarSeed: text('avatar_seed').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('chi_le_me_users_device_id_idx').on(table.deviceId)],
);

export const sessionsTable = pgTable('chi_le_me_sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const proposalsTable = pgTable('chi_le_me_proposals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  proposalType: text('proposal_type').notNull(),
  targetName: text('target_name'),
  address: text('address'),
  eventLabel: text('event_label'),
  expectedPeople: integer('expected_people'),
  remark: text('remark'),
  voteEnabled: boolean('vote_enabled').notNull().default(true),
  joinEnabled: boolean('join_enabled').notNull().default(true),
  status: text('status').notNull(),
  voteMode: text('vote_mode').notNull(),
  maxPeople: integer('max_people').notNull(),
  creatorUserId: text('creator_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  finalOptionId: text('final_option_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const proposalOptionsTable = pgTable('chi_le_me_proposal_options', {
  id: text('id').primaryKey(),
  proposalId: text('proposal_id')
    .notNull()
    .references(() => proposalsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const proposalVotesTable = pgTable(
  'chi_le_me_proposal_votes',
  {
    proposalId: text('proposal_id')
      .notNull()
      .references(() => proposalsTable.id, { onDelete: 'cascade' }),
    optionId: text('option_id')
      .notNull()
      .references(() => proposalOptionsTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.proposalId, table.userId] })],
);

export const proposalParticipantsTable = pgTable(
  'chi_le_me_proposal_participants',
  {
    proposalId: text('proposal_id')
      .notNull()
      .references(() => proposalsTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.proposalId, table.userId] })],
);

export const proposalMessagesTable = pgTable('chi_le_me_proposal_messages', {
  id: text('id').primaryKey(),
  proposalId: text('proposal_id')
    .notNull()
    .references(() => proposalsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const foodSharesTable = pgTable('chi_le_me_food_shares', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  foodName: text('food_name').notNull(),
  shopName: text('shop_name'),
  price: text('price'),
  address: text('address'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionsTable),
  proposals: many(proposalsTable),
  shares: many(foodSharesTable),
}));

export const proposalRelations = relations(proposalsTable, ({ many, one }) => ({
  creator: one(usersTable, {
    fields: [proposalsTable.creatorUserId],
    references: [usersTable.id],
  }),
  options: many(proposalOptionsTable),
  messages: many(proposalMessagesTable),
  votes: many(proposalVotesTable),
  participants: many(proposalParticipantsTable),
}));
