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

import { db } from '../src/lib/server/db.js';
import { decrypt, isEncrypted } from '../src/lib/server/encryption.js';

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

			// Decrypt it (use non-strict mode for migration)
			const decrypted = decrypt(message.accountSid, { strict: false });

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
	.then(() => {
		console.log('\nMigration finished successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\nMigration failed:', error);
		process.exit(1);
	});
