import { randomBytes } from 'crypto';

// Set encryption key BEFORE any imports that might use it
if (!process.env.ENCRYPTION_KEY) {
	process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
}

// Set other required env vars for tests
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
}
