import { customAlphabet } from 'nanoid';

// URL-safe alphabet (62 characters: 0-9, A-Z, a-z)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// ID Generators for different entities
// Projects: 8 characters (218 trillion combinations) - globally unique
export const generateProjectId = customAlphabet(alphabet, 8);

// Test Runs: 4 characters (14.7 million combinations) - scoped per project
export const generateTestRunId = customAlphabet(alphabet, 4);

// Test Cases: 3 characters (238k combinations) - scoped per project
export const generateTestCaseId = customAlphabet(alphabet, 3);

// Test Results: 4 characters (14.7 million combinations) - scoped per run
export const generateTestResultId = customAlphabet(alphabet, 4);

// Test Suites: 4 characters (14.7 million combinations) - scoped per project
export const generateTestSuiteId = customAlphabet(alphabet, 4);

// Environments: 3 characters (238k combinations) - scoped per project
export const generateEnvironmentId = customAlphabet(alphabet, 3);

// Milestones: 3 characters (238k combinations) - scoped per project
export const generateMilestoneId = customAlphabet(alphabet, 3);

// Attachments: 4 characters (14.7 million combinations)
export const generateAttachmentId = customAlphabet(alphabet, 4);

// Teams: 6 characters (56 billion combinations) - globally unique
export const generateTeamId = customAlphabet(alphabet, 6);

// Users: 6 characters (56 billion combinations) - globally unique
export const generateUserId = customAlphabet(alphabet, 6);
