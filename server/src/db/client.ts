import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema';

export type AppDb = NodePgDatabase<typeof schema>;

export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}
