-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TESTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'UI', 'API', 'UNIT', 'E2E');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('SLACK', 'DISCORD', 'TEAMS', 'JIRA', 'GITHUB', 'GITLAB', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('TEST_RUN_STARTED', 'TEST_RUN_COMPLETED', 'TEST_RUN_FAILED', 'TEST_CASE_FAILED', 'TEST_CASE_PASSED', 'MILESTONE_DUE', 'PROJECT_CREATED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TESTER',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "key" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preconditions" TEXT,
    "steps" JSONB,
    "expectedResult" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "type" "TestType" NOT NULL DEFAULT 'FUNCTIONAL',
    "automationStatus" "AutomationStatus" NOT NULL DEFAULT 'NOT_AUTOMATED',
    "tags" TEXT[],
    "projectId" TEXT NOT NULL,
    "suiteId" TEXT,
    "createdBy" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "environmentId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'PLANNED',
    "createdBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiSummary" TEXT,
    "aiPatternAnalysis" TEXT,
    "aiSummaryGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "status" "TestStatus" NOT NULL,
    "comment" TEXT,
    "duration" INTEGER,
    "stackTrace" TEXT,
    "errorMessage" TEXT,
    "executedBy" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiDiagnosis" TEXT,
    "aiDiagnosisGeneratedAt" TIMESTAMP(3),
    "fullTitle" TEXT,
    "errorSnippet" TEXT,
    "errorLocation" JSONB,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "retry" INTEGER NOT NULL DEFAULT 0,
    "projectName" TEXT DEFAULT 'default',
    "metadata" JSONB,
    "consoleOutput" JSONB,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStepResult" (
    "id" TEXT NOT NULL,
    "testResultId" TEXT NOT NULL,
    "parentStepId" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" "TestStatus" NOT NULL,
    "comment" TEXT,
    "duration" INTEGER,
    "startTime" TIMESTAMP(3),
    "error" TEXT,
    "stackTrace" TEXT,
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestStepResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "testCaseId" TEXT,
    "testResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "config" JSONB,
    "installedBy" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationNotification" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" "NotificationEvent" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TESTER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraIssue" (
    "id" TEXT NOT NULL,
    "jiraIssueKey" TEXT NOT NULL,
    "jiraIssueId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "testResultId" TEXT,
    "projectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "issueType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "assignee" TEXT,
    "reporter" TEXT,
    "labels" TEXT[],
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_teamId_key" ON "Subscription"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_teamId_idx" ON "Subscription"("teamId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

-- CreateIndex
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "Milestone_dueDate_idx" ON "Milestone"("dueDate");

-- CreateIndex
CREATE INDEX "Milestone_projectId_status_idx" ON "Milestone"("projectId", "status");

-- CreateIndex
CREATE INDEX "Environment_projectId_idx" ON "Environment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE INDEX "TestSuite_projectId_idx" ON "TestSuite"("projectId");

-- CreateIndex
CREATE INDEX "TestSuite_parentId_idx" ON "TestSuite"("parentId");

-- CreateIndex
CREATE INDEX "TestSuite_projectId_order_idx" ON "TestSuite"("projectId", "order");

-- CreateIndex
CREATE INDEX "TestCase_projectId_idx" ON "TestCase"("projectId");

-- CreateIndex
CREATE INDEX "TestCase_suiteId_idx" ON "TestCase"("suiteId");

-- CreateIndex
CREATE INDEX "TestCase_priority_idx" ON "TestCase"("priority");

-- CreateIndex
CREATE INDEX "TestCase_type_idx" ON "TestCase"("type");

-- CreateIndex
CREATE INDEX "TestCase_createdBy_idx" ON "TestCase"("createdBy");

-- CreateIndex
CREATE INDEX "TestCase_order_idx" ON "TestCase"("order");

-- CreateIndex
CREATE INDEX "TestCase_automationStatus_idx" ON "TestCase"("automationStatus");

-- CreateIndex
CREATE INDEX "TestCase_projectId_priority_idx" ON "TestCase"("projectId", "priority");

-- CreateIndex
CREATE INDEX "TestCase_projectId_type_idx" ON "TestCase"("projectId", "type");

-- CreateIndex
CREATE INDEX "TestCase_suiteId_order_idx" ON "TestCase"("suiteId", "order");

-- CreateIndex
CREATE INDEX "TestRun_projectId_idx" ON "TestRun"("projectId");

-- CreateIndex
CREATE INDEX "TestRun_milestoneId_idx" ON "TestRun"("milestoneId");

-- CreateIndex
CREATE INDEX "TestRun_environmentId_idx" ON "TestRun"("environmentId");

-- CreateIndex
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");

-- CreateIndex
CREATE INDEX "TestRun_createdBy_idx" ON "TestRun"("createdBy");

-- CreateIndex
CREATE INDEX "TestRun_createdAt_idx" ON "TestRun"("createdAt");

-- CreateIndex
CREATE INDEX "TestRun_completedAt_idx" ON "TestRun"("completedAt");

-- CreateIndex
CREATE INDEX "TestRun_projectId_status_idx" ON "TestRun"("projectId", "status");

-- CreateIndex
CREATE INDEX "TestRun_projectId_createdAt_idx" ON "TestRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TestResult_testCaseId_idx" ON "TestResult"("testCaseId");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_idx" ON "TestResult"("testRunId");

-- CreateIndex
CREATE INDEX "TestResult_status_idx" ON "TestResult"("status");

-- CreateIndex
CREATE INDEX "TestResult_executedAt_idx" ON "TestResult"("executedAt");

-- CreateIndex
CREATE INDEX "TestResult_executedBy_idx" ON "TestResult"("executedBy");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_status_idx" ON "TestResult"("testRunId", "status");

-- CreateIndex
CREATE INDEX "TestResult_testCaseId_executedAt_idx" ON "TestResult"("testCaseId", "executedAt");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_executedAt_idx" ON "TestResult"("testRunId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_testCaseId_testRunId_retry_key" ON "TestResult"("testCaseId", "testRunId", "retry");

-- CreateIndex
CREATE INDEX "TestStepResult_testResultId_idx" ON "TestStepResult"("testResultId");

-- CreateIndex
CREATE INDEX "TestStepResult_parentStepId_idx" ON "TestStepResult"("parentStepId");

-- CreateIndex
CREATE INDEX "TestStepResult_testResultId_stepNumber_idx" ON "TestStepResult"("testResultId", "stepNumber");

-- CreateIndex
CREATE INDEX "Attachment_testCaseId_idx" ON "Attachment"("testCaseId");

-- CreateIndex
CREATE INDEX "Attachment_testResultId_idx" ON "Attachment"("testResultId");

-- CreateIndex
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_mimeType_idx" ON "Attachment"("mimeType");

-- CreateIndex
CREATE INDEX "Integration_teamId_idx" ON "Integration"("teamId");

-- CreateIndex
CREATE INDEX "Integration_type_idx" ON "Integration"("type");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- CreateIndex
CREATE INDEX "Integration_teamId_status_idx" ON "Integration"("teamId", "status");

-- CreateIndex
CREATE INDEX "Integration_teamId_type_idx" ON "Integration"("teamId", "type");

-- CreateIndex
CREATE INDEX "IntegrationNotification_integrationId_idx" ON "IntegrationNotification"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationNotification_status_idx" ON "IntegrationNotification"("status");

-- CreateIndex
CREATE INDEX "IntegrationNotification_eventType_idx" ON "IntegrationNotification"("eventType");

-- CreateIndex
CREATE INDEX "IntegrationNotification_nextRetryAt_idx" ON "IntegrationNotification"("nextRetryAt");

-- CreateIndex
CREATE INDEX "IntegrationNotification_createdAt_idx" ON "IntegrationNotification"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationNotification_integrationId_status_idx" ON "IntegrationNotification"("integrationId", "status");

-- CreateIndex
CREATE INDEX "IntegrationNotification_status_nextRetryAt_idx" ON "IntegrationNotification"("status", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");

-- CreateIndex
CREATE INDEX "TeamInvitation_token_idx" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_status_idx" ON "TeamInvitation"("status");

-- CreateIndex
CREATE INDEX "TeamInvitation_expiresAt_idx" ON "TeamInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_status_idx" ON "TeamInvitation"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamId_email_key" ON "TeamInvitation"("teamId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "JiraIssue_jiraIssueKey_key" ON "JiraIssue"("jiraIssueKey");

-- CreateIndex
CREATE INDEX "JiraIssue_integrationId_idx" ON "JiraIssue"("integrationId");

-- CreateIndex
CREATE INDEX "JiraIssue_testResultId_idx" ON "JiraIssue"("testResultId");

-- CreateIndex
CREATE INDEX "JiraIssue_projectId_idx" ON "JiraIssue"("projectId");

-- CreateIndex
CREATE INDEX "JiraIssue_jiraIssueKey_idx" ON "JiraIssue"("jiraIssueKey");

-- CreateIndex
CREATE INDEX "JiraIssue_status_idx" ON "JiraIssue"("status");

-- CreateIndex
CREATE INDEX "JiraIssue_createdAt_idx" ON "JiraIssue"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStepResult" ADD CONSTRAINT "TestStepResult_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStepResult" ADD CONSTRAINT "TestStepResult_parentStepId_fkey" FOREIGN KEY ("parentStepId") REFERENCES "TestStepResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationNotification" ADD CONSTRAINT "IntegrationNotification_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraIssue" ADD CONSTRAINT "JiraIssue_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraIssue" ADD CONSTRAINT "JiraIssue_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraIssue" ADD CONSTRAINT "JiraIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

