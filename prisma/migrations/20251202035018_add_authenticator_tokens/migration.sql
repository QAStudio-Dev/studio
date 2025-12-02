-- CreateTable
CREATE TABLE "AuthenticatorToken" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "secret" TEXT NOT NULL,
    "issuer" TEXT,
    "accountName" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'SHA1',
    "digits" INTEGER NOT NULL DEFAULT 6,
    "period" INTEGER NOT NULL DEFAULT 30,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticatorToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthenticatorToken_teamId_idx" ON "AuthenticatorToken"("teamId");

-- CreateIndex
CREATE INDEX "AuthenticatorToken_createdBy_idx" ON "AuthenticatorToken"("createdBy");

-- CreateIndex
CREATE INDEX "AuthenticatorToken_name_idx" ON "AuthenticatorToken"("name");

-- AddForeignKey
ALTER TABLE "AuthenticatorToken" ADD CONSTRAINT "AuthenticatorToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticatorToken" ADD CONSTRAINT "AuthenticatorToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
