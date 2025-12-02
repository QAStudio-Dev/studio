# TOTP Encryption Key Rotation Guide

## Overview

QA Studio uses AES-256-CBC encryption to protect TOTP secrets in the database. This guide explains how to safely rotate the encryption key.

## Why Rotate Keys?

- **Security Best Practice**: Periodic key rotation limits exposure if a key is compromised
- **Compliance Requirements**: Many security frameworks require regular key rotation
- **Incident Response**: Quickly invalidate compromised keys while maintaining service

## Key Versioning System

The encryption system supports multiple key versions simultaneously:

- **Current Version**: Used for encrypting new secrets
- **Old Versions**: Maintained temporarily for decrypting existing secrets during rotation
- **Format**: `v{version}:{iv}:{encrypted_data}`

### Backward Compatibility

The system automatically handles legacy data encrypted without version prefixes (format: `{iv}:{encrypted_data}`), treating it as version 1.

## Rotation Process

### Step 1: Generate New Key

```bash
openssl rand -hex 32
```

Save the output - you'll need it for the next step.

### Step 2: Add New Key to Environment

Add the new key as a versioned environment variable:

```bash
# .env or environment configuration
TOTP_ENCRYPTION_KEY=<original_key>      # Keep this during rotation
TOTP_ENCRYPTION_KEY_V2=<new_key>        # Add new key
```

### Step 3: Update Code

Edit `src/lib/server/totp-crypto.ts`:

```typescript
// Update version number
const CURRENT_KEY_VERSION = 2;

// Add new key handler
function getEncryptionKey(version: number = CURRENT_KEY_VERSION): string {
	if (version === 1) {
		// Original key (keep for old data)
		const key = env.TOTP_ENCRYPTION_KEY;
		// ... validation
		return key;
	}

	if (version === 2) {
		// New key (for new encryptions)
		const key = env.TOTP_ENCRYPTION_KEY_V2;
		if (!key) throw new Error('TOTP_ENCRYPTION_KEY_V2 not set');
		if (!/^[0-9a-f]{64}$/i.test(key)) {
			throw new Error('Invalid TOTP_ENCRYPTION_KEY_V2 format');
		}
		return key;
	}

	throw new Error(`Unsupported encryption key version: ${version}`);
}
```

### Step 4: Deploy Code Changes

Deploy the updated code to all environments. At this point:

- New secrets will be encrypted with the new key (v2)
- Old secrets can still be decrypted with the old key (v1)

### Step 5: Re-encrypt Existing Secrets

Run the migration script to re-encrypt all existing secrets:

```bash
# Development
tsx scripts/rotate-totp-key.ts

# Production (after testing in development!)
NODE_ENV=production tsx scripts/rotate-totp-key.ts
```

The script will:

1. Find all authenticator tokens
2. Decrypt each with the old key
3. Re-encrypt with the new key
4. Update the database
5. Report success/failure for each token

### Step 6: Verify Rotation

Test that all tokens work correctly:

```bash
# Check a few tokens in the UI
# Generate TOTP codes to verify decryption works
```

### Step 7: Remove Old Key (Optional)

After verification (recommended: wait 30 days), you can remove the old key:

1. Remove `TOTP_ENCRYPTION_KEY` from environment
2. Remove version 1 handler from `getEncryptionKey()`
3. Deploy the cleanup

**Important**: Keep old keys accessible until you're certain all data has been migrated.

## Rollback Procedure

If issues occur during rotation:

### Before Re-encryption Script

Simply revert code changes:

1. Set `CURRENT_KEY_VERSION` back to 1
2. Remove new key handlers
3. Redeploy

### After Re-encryption Script

You'll need to run a reverse migration:

1. Revert `CURRENT_KEY_VERSION` to 1
2. Create a reverse script that re-encrypts v2 data back to v1
3. Run the reverse migration
4. Remove new key from environment

## Security Considerations

### Key Storage

- **Never commit keys to version control**
- Store keys in secure secret management systems (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use different keys for each environment
- Restrict access to production keys

### Rotation Frequency

- **Regular Rotation**: Every 90-365 days (depends on compliance requirements)
- **Emergency Rotation**: Immediately if key compromise is suspected
- **Automated Rotation**: Consider implementing automatic rotation for critical systems

### Audit Trail

The rotation process should be logged:

- Who initiated the rotation
- When it occurred
- How many tokens were affected
- Any failures that occurred

Consider adding audit logs to the rotation script.

## Troubleshooting

### Script Fails to Decrypt

**Cause**: Old key is incorrect or missing

**Solution**:

- Verify `TOTP_ENCRYPTION_KEY` is set correctly
- Check environment variable is loaded properly
- Ensure key hasn't been truncated or modified

### Partial Migration Success

**Cause**: Some tokens failed to re-encrypt

**Solution**:

- Review error messages for specific tokens
- Manually investigate failed tokens
- Do NOT remove old keys until all tokens migrate successfully

### Version Mismatch Errors

**Cause**: Code version doesn't match encrypted data version

**Solution**:

- Ensure code changes are deployed before running migration
- Verify `CURRENT_KEY_VERSION` matches intended version
- Check that new key handler is implemented

## Example: Complete Rotation

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)
echo "New key: $NEW_KEY"

# 2. Add to .env
echo "TOTP_ENCRYPTION_KEY_V2=$NEW_KEY" >> .env.local

# 3. Update code (as shown above)

# 4. Restart app to load new environment variable
npm run dev

# 5. Run migration script
tsx scripts/rotate-totp-key.ts

# 6. Verify in UI
# Navigate to /authenticators and test code generation

# 7. After 30 days, remove old key
# Remove TOTP_ENCRYPTION_KEY from .env
# Remove version 1 handler from code
```

## Integration with Compliance

### SOC 2

- Document rotation schedule
- Maintain audit logs of rotations
- Demonstrate key access controls

### ISO 27001

- Include in cryptographic controls policy
- Regular key rotation as part of ISMS
- Key lifecycle management procedures

### GDPR

- Key rotation supports data protection by design
- Reduces impact of potential data breaches
- Part of technical measures for data security

## Future Enhancements

Consider implementing:

- **Automated Rotation**: Cron job or scheduled task
- **Key Management Service**: Integration with AWS KMS or similar
- **Encryption at Rest**: Database-level encryption for additional security
- **Monitoring**: Alerts for failed decryption attempts
- **Gradual Migration**: Lazy re-encryption during normal operations
