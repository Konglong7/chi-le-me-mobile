export interface ServerEnv {
  port: number;
  corsOrigin: string;
  databaseUrl: string | null;
}

export function getServerEnv(): ServerEnv {
  return {
    port: Number(process.env.PORT ?? 8787),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    databaseUrl: process.env.DATABASE_URL ?? null,
  };
}
