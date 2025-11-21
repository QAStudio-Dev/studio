import 'dotenv/config';
import { PrismaClient } from '$lib/../generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { dev } from '$app/environment';
import { DATABASE_URL } from '$env/static/private';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
	pool: Pool | undefined;
};

// Prisma 7: Direct TCP connection with PostgreSQL adapter
const pool = globalForPrisma.pool ?? new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (dev) {
	globalForPrisma.prisma = db;
	globalForPrisma.pool = pool;
}
