-- Add SSO fields to User table
ALTER TABLE "User" ADD COLUMN "ssoProvider" TEXT;
ALTER TABLE "User" ADD COLUMN "ssoProviderId" TEXT;

-- Create index for SSO lookups
CREATE INDEX "User_ssoProvider_ssoProviderId_idx" ON "User"("ssoProvider", "ssoProviderId");
