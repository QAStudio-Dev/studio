-- Add GIN index for ssoDomains array to optimize domain lookups
-- This speeds up queries like: WHERE 'domain.com' = ANY("ssoDomains")
CREATE INDEX IF NOT EXISTS "idx_team_sso_domains" ON "Team" USING GIN ("ssoDomains");
