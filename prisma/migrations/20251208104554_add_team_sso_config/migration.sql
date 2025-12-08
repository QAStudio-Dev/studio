-- Add SSO configuration fields to Team model
-- Allows teams to configure their own SSO (Okta, Google, Azure AD, etc.)

ALTER TABLE "Team" ADD COLUMN "ssoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "ssoProvider" TEXT;
ALTER TABLE "Team" ADD COLUMN "ssoClientId" TEXT;
ALTER TABLE "Team" ADD COLUMN "ssoClientSecret" TEXT;
ALTER TABLE "Team" ADD COLUMN "ssoIssuer" TEXT;
ALTER TABLE "Team" ADD COLUMN "ssoDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create indexes for SSO lookups
CREATE INDEX "Team_ssoEnabled_idx" ON "Team"("ssoEnabled");
CREATE INDEX "Team_ssoProvider_idx" ON "Team"("ssoProvider");

-- Add comments for documentation
COMMENT ON COLUMN "Team"."ssoEnabled" IS 'Enable SSO authentication for this team';
COMMENT ON COLUMN "Team"."ssoProvider" IS 'SSO provider type: okta, google, azure, etc.';
COMMENT ON COLUMN "Team"."ssoClientId" IS 'OAuth Client ID (should be encrypted in application)';
COMMENT ON COLUMN "Team"."ssoClientSecret" IS 'OAuth Client Secret (should be encrypted in application)';
COMMENT ON COLUMN "Team"."ssoIssuer" IS 'OIDC Issuer URL (e.g., https://company.okta.com/oauth2/default)';
COMMENT ON COLUMN "Team"."ssoDomains" IS 'Email domains that trigger SSO for this team (e.g., [acme.com, acme.co])';
