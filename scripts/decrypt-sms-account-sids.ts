/**
 * Migration script to decrypt accountSid values in SmsMessage table
 *
 * Context: The send SMS endpoint was incorrectly storing encrypted accountSid values.
 * The field should store plaintext for verification purposes (accountSid is a public identifier).
 * This script decrypts any encrypted values to ensure consistency.
 *
 * Usage:
 *   npx tsx scripts/decrypt-sms-account-sids.ts           # Run migration
 *   npx tsx scripts/decrypt-sms-account-sids.ts --dry-run # Preview changes without modifying database
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createDecipheriv } from 'crypto';

// Initialize Prisma client for standalone script (similar to src/lib/server/db.ts)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Encryption utilities (copied from src/lib/server/encryption.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
	console.error('ERROR: ENCRYPTION_KEY environment variable is not set');
	process.exit(1);
}

const encryptionKey = Buffer.from(ENCRYPTION_KEY, 'hex');

function isEncrypted(text: string): boolean {
	const parts = text.split(':');
	return parts.length === 3 && parts.every((part) => /^[0-9a-f]+$/i.test(part));
}

function decrypt(encryptedText: string): string {
	const parts = encryptedText.split(':');
	if (parts.length !== 3) {
		// Not encrypted, return as-is
		return encryptedText;
	}

	try {
		const [ivHex, authTagHex, encrypted] = parts;

		// Convert from hex
		const iv = Buffer.from(ivHex, 'hex');
		const authTag = Buffer.from(authTagHex, 'hex');

		// Create decipher
		const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
		decipher.setAuthTag(authTag);

		// Decrypt data
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		console.error('Decryption failed:', error);
		throw new Error('Failed to decrypt data');
	}
}

// Check for --dry-run flag
const isDryRun = process.argv.includes('--dry-run');

async function migrateAccountSids() {
	if (isDryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made to the database\n');
	}

	console.log('Starting accountSid migration...');

	// Get all SMS messages with direction OUTBOUND
	const messages = await db.smsMessage.findMany({
		where: {
			direction: 'OUTBOUND'
		},
		select: {
			id: true,
			accountSid: true,
			messageSid: true
		}
	});

	console.log(`Found ${messages.length} outbound messages`);

	let updatedCount = 0;
	let alreadyPlaintext = 0;
	let errors = 0;

	for (const message of messages) {
		try {
			// Check if the accountSid is encrypted using the isEncrypted utility
			if (!isEncrypted(message.accountSid)) {
				alreadyPlaintext++;
				continue;
			}

			// Decrypt it
			const decrypted = decrypt(message.accountSid);

			// Update the message with decrypted value (unless in dry-run mode)
			if (!isDryRun) {
				await db.smsMessage.update({
					where: { id: message.id },
					data: { accountSid: decrypted }
				});
			}

			updatedCount++;
			const prefix = isDryRun ? '🔍 Would decrypt' : '✓ Decrypted';
			console.log(
				`${prefix} ${message.messageSid}: ${message.accountSid.substring(0, 20)}... → ${decrypted}`
			);
		} catch (error) {
			console.error(`✗ Error processing ${message.messageSid}:`, error);
			errors++;
		}
	}

	console.log(`\n${isDryRun ? 'Dry run' : 'Migration'} complete:`);
	console.log(`  Total messages: ${messages.length}`);
	console.log(`  ${isDryRun ? 'Would update' : 'Updated'}: ${updatedCount}`);
	console.log(`  Already plaintext: ${alreadyPlaintext}`);
	console.log(`  Errors: ${errors}`);

	if (isDryRun && updatedCount > 0) {
		console.log(`\n💡 Run without --dry-run flag to apply these ${updatedCount} changes`);
	}
}

// Run the migration
migrateAccountSids()
	.then(async () => {
		console.log('\nMigration finished successfully');
		await db.$disconnect();
		await pool.end();
		process.exit(0);
	})
	.catch(async (error) => {
		console.error('\nMigration failed:', error);
		await db.$disconnect();
		await pool.end();
		process.exit(1);
	});
