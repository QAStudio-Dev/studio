/**
 * TOTP Encryption Key Rotation Script
 *
 * This script helps rotate the TOTP encryption key safely:
 * 1. Keeps old key(s) accessible during rotation
 * 2. Re-encrypts all tokens with the new key
 * 3. Provides rollback capability if needed
 *
 * USAGE:
 * 1. Generate new key: openssl rand -hex 32
 * 2. Add new key to environment as TOTP_ENCRYPTION_KEY_V2
 * 3. Update CURRENT_KEY_VERSION in totp-crypto.ts to 2
 * 4. Run this script: tsx scripts/rotate-totp-key.ts
 * 5. After confirming all tokens work, remove old key from environment
 *
 * SAFETY:
 * - Always test in development first
 * - Backup database before running in production
 * - Keep old keys in environment until rotation is verified
 */

import { db } from '../src/lib/server/db';
import { reencryptTOTPSecret } from '../src/lib/server/totp-crypto';

async function rotateKeys() {
	console.log('🔄 Starting TOTP key rotation...\n');

	try {
		// Get all authenticator tokens
		const tokens = await db.authenticatorToken.findMany({
			select: {
				id: true,
				name: true,
				secret: true
			}
		});

		console.log(`📊 Found ${tokens.length} tokens to re-encrypt\n`);

		if (tokens.length === 0) {
			console.log('✅ No tokens to rotate. Exiting.');
			return;
		}

		let successCount = 0;
		let failureCount = 0;
		const failures: Array<{ id: string; name: string; error: string }> = [];

		// Re-encrypt each token
		for (const token of tokens) {
			try {
				console.log(`🔐 Re-encrypting: ${token.name} (${token.id})`);

				// Re-encrypt with current key version
				const newEncryptedSecret = reencryptTOTPSecret(token.secret);

				// Update database
				await db.authenticatorToken.update({
					where: { id: token.id },
					data: { secret: newEncryptedSecret }
				});

				successCount++;
				console.log(`   ✅ Success`);
			} catch (error) {
				failureCount++;
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				failures.push({
					id: token.id,
					name: token.name,
					error: errorMessage
				});
				console.error(`   ❌ Failed: ${errorMessage}`);
			}
		}

		console.log('\n📈 Rotation Summary:');
		console.log(`   ✅ Successful: ${successCount}`);
		console.log(`   ❌ Failed: ${failureCount}`);

		if (failures.length > 0) {
			console.log('\n⚠️  Failed tokens:');
			failures.forEach((f) => {
				console.log(`   - ${f.name} (${f.id}): ${f.error}`);
			});
			console.log('\n⚠️  Some tokens failed to rotate. Do NOT remove old keys yet!');
			process.exit(1);
		} else {
			console.log('\n✅ All tokens successfully rotated!');
			console.log(
				'   You can now safely remove old encryption keys from environment after verification.'
			);
		}
	} catch (error) {
		console.error('\n❌ Fatal error during key rotation:');
		console.error(error);
		console.error('\n⚠️  Rotation aborted. No changes were made.');
		process.exit(1);
	}
}

// Run the script
rotateKeys()
	.then(() => {
		console.log('\n🎉 Key rotation completed successfully!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Unexpected error:');
		console.error(error);
		process.exit(1);
	});
