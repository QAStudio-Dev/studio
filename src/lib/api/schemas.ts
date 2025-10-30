/**
 * API Schema Definitions
 *
 * Define your API endpoints here with TypeScript types.
 * These types will be used for:
 * 1. Type safety in your API endpoints
 * 2. Auto-generating API documentation
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export interface ApiSchema<TParams = any, TQuery = any, TBody = any, TResponse = any> {
	method: HttpMethod;
	path: string;
	description: string;
	tags?: string[]; // For grouping endpoints
	params?: {
		[K in keyof TParams]: {
			type: string;
			description: string;
			required: boolean;
			example?: string;
		};
	};
	query?: {
		[K in keyof TQuery]: {
			type: string;
			description: string;
			required: boolean;
			example?: string;
		};
	};
	body?: {
		description: string;
		example: TBody;
	};
	responses: {
		[statusCode: number]: {
			description: string;
			example: TResponse;
		};
	};
}

// ============================================
// PROJECTS API
// ============================================

export type ProjectResponse = {
	id: string;
	name: string;
	description: string | null;
	key: string;
	createdBy: string;
	teamId: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type ProjectWithCounts = ProjectResponse & {
	_count: {
		testCases: number;
		testRuns: number;
		testSuites: number;
	};
};

export type CreateProjectBody = {
	name: string;
	description?: string;
	key: string;
};

export type ErrorResponse = {
	error: string;
};

export const ProjectsApi = {
	list: {
		method: 'GET',
		path: '/api/projects',
		description: 'List all projects with test case, test run, and test suite counts.',
		tags: ['Projects'],
		responses: {
			200: {
				description: 'Success',
				example: [
					{
						id: 'clx1a2b3c4d5e6f7g8h9i0j1',
						name: 'E-Commerce Platform',
						description: 'Main e-commerce application testing',
						key: 'ECOM',
						createdBy: 'user_123',
						teamId: 'team_456',
						createdAt: '2024-01-15T10:30:00Z',
						updatedAt: '2024-01-15T10:30:00Z',
						_count: {
							testCases: 125,
							testRuns: 42,
							testSuites: 15
						}
					}
				] as ProjectWithCounts[]
			},
			500: {
				description: 'Server error',
				example: { error: 'Failed to fetch projects' } as ErrorResponse
			}
		}
	} satisfies ApiSchema<never, never, never, ProjectWithCounts[] | ErrorResponse>,

	create: {
		method: 'POST',
		path: '/api/projects',
		description: 'Create a new project.',
		tags: ['Projects'],
		body: {
			description: 'Project details',
			example: {
				name: 'E-Commerce Platform',
				description: 'Main e-commerce application testing',
				key: 'ECOM'
			} as CreateProjectBody
		},
		responses: {
			201: {
				description: 'Project created successfully',
				example: {
					id: 'clx1a2b3c4d5e6f7g8h9i0j1',
					name: 'E-Commerce Platform',
					description: 'Main e-commerce application testing',
					key: 'ECOM',
					createdBy: 'user_123',
					teamId: 'team_456',
					createdAt: '2024-01-15T10:30:00Z',
					updatedAt: '2024-01-15T10:30:00Z'
				} as ProjectResponse
			},
			400: {
				description: 'Name and key are required',
				example: { error: 'Name and key are required' } as ErrorResponse
			},
			409: {
				description: 'Project key already exists',
				example: { error: 'Project key already exists' } as ErrorResponse
			},
			500: {
				description: 'Server error',
				example: { error: 'Failed to create project' } as ErrorResponse
			}
		}
	} satisfies ApiSchema<never, never, CreateProjectBody, ProjectResponse | ErrorResponse>
} as const;

// ============================================
// TEST RUNS API
// ============================================

export type TestRunResponse = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	milestoneId: string | null;
	environmentId: string | null;
	status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
	createdBy: string;
	startedAt: Date | string | null;
	completedAt: Date | string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
	project?: {
		id: string;
		name: string;
		key: string;
	};
	environment?: {
		id: string;
		name: string;
	} | null;
	milestone?: {
		id: string;
		name: string;
	} | null;
};

export type CreateTestRunBody = {
	projectId: string;
	name: string;
	description?: string;
	environmentId?: string;
	environment?: string; // Alternative: environment name (will be created if doesn't exist)
	milestoneId?: string;
};

export const TestRunsApi = {
	create: {
		method: 'POST',
		path: '/api/test-runs',
		description: 'Create a new test run. Supports both session and API key authentication. If environment name is provided instead of ID, the environment will be created automatically.',
		tags: ['Test Runs'],
		body: {
			description: 'Test run details',
			example: {
				projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
				name: 'Nightly Regression - v2.1.0',
				description: 'Automated regression suite for release 2.1.0',
				environment: 'Production',
				milestoneId: 'milestone_123'
			} as CreateTestRunBody
		},
		responses: {
			200: {
				description: 'Test run created successfully',
				example: {
					id: 'run_123',
					name: 'Nightly Regression - v2.1.0',
					status: 'IN_PROGRESS',
					projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
					environmentId: 'env_123',
					milestoneId: 'milestone_123',
					createdBy: 'user_123',
					startedAt: '2024-01-15T10:30:00Z',
					completedAt: null,
					description: 'Automated regression suite for release 2.1.0',
					createdAt: '2024-01-15T10:30:00Z',
					updatedAt: '2024-01-15T10:30:00Z',
					project: {
						id: 'clx1a2b3c4d5e6f7g8h9i0j1',
						name: 'E-Commerce Platform',
						key: 'ECOM'
					},
					environment: {
						id: 'env_123',
						name: 'Production'
					},
					milestone: {
						id: 'milestone_123',
						name: 'v2.1.0'
					}
				} as TestRunResponse
			},
			400: {
				description: 'Invalid request',
				example: { error: 'projectId is required' } as ErrorResponse
			},
			403: {
				description: 'Access denied',
				example: { error: 'You do not have access to this project' } as ErrorResponse
			},
			404: {
				description: 'Project not found',
				example: { error: 'Project not found' } as ErrorResponse
			}
		}
	} satisfies ApiSchema<never, never, CreateTestRunBody, TestRunResponse | ErrorResponse>
} as const;

// ============================================
// TEST RESULTS API
// ============================================

export type TestResultResponse = {
	id: string;
	testCaseId: string;
	testRunId: string;
	status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'RETEST' | 'UNTESTED';
	comment: string | null;
	duration: number | null;
	stackTrace: string | null;
	errorMessage: string | null;
	executedBy: string;
	executedAt: Date | string;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type SubmitTestResultsBody = {
	testRunId: string;
	results: Array<{
		title: string;
		fullTitle?: string; // Full path like "Suite > Nested > Test"
		status: 'passed' | 'failed' | 'skipped' | 'timedout' | 'interrupted';
		duration?: number;
		errorMessage?: string;
		error?: string; // Alternative field name
		stackTrace?: string;
		attachments?: Array<{
			name: string;
			contentType: string;
			body?: string | Buffer | { type: 'Buffer'; data: number[] };
			type?: string;
		}>;
	}>;
};

export type SubmitTestResultsResponse = {
	processedCount: number;
	results: Array<{
		testCaseId: string;
		testResultId: string;
		title: string;
		status: 'PASSED' | 'FAILED' | 'SKIPPED';
		created: boolean; // Whether test case was newly created
		attachmentCount: number;
	}>;
	errors?: Array<{
		testTitle: string;
		error: string;
	}>;
};

export const TestResultsApi = {
	submit: {
		method: 'POST',
		path: '/api/test-results',
		description:
			'Submit test results from automated test runners (like Playwright). Automatically creates test cases and suites if they don\'t exist. Supports batch processing and attachment uploads. Sends notifications for failed tests.',
		tags: ['Test Results'],
		body: {
			description: 'Test results batch from automated reporter',
			example: {
				testRunId: 'run_123',
				results: [
					{
						title: 'should login with valid credentials',
						fullTitle: 'Auth > Login > Success > should login with valid credentials',
						status: 'passed',
						duration: 1500
					},
					{
						title: 'should show error for invalid credentials',
						fullTitle: 'Auth > Login > Failure > should show error for invalid credentials',
						status: 'failed',
						duration: 800,
						errorMessage: 'Expected error message to be visible',
						stackTrace: 'Error: Expected error message to be visible\n  at...',
						attachments: [
							{
								name: 'screenshot',
								contentType: 'image/png',
								body: 'base64-encoded-image-data...'
							}
						]
					}
				]
			} as SubmitTestResultsBody
		},
		responses: {
			200: {
				description: 'Results processed successfully',
				example: {
					processedCount: 2,
					results: [
						{
							testCaseId: 'tc_123',
							testResultId: 'result_123',
							title: 'should login with valid credentials',
							status: 'PASSED',
							created: false,
							attachmentCount: 0
						},
						{
							testCaseId: 'tc_124',
							testResultId: 'result_124',
							title: 'should show error for invalid credentials',
							status: 'FAILED',
							created: true,
							attachmentCount: 1
						}
					]
				} as SubmitTestResultsResponse
			},
			400: {
				description: 'Invalid request',
				example: { error: 'testRunId is required' } as ErrorResponse
			},
			403: {
				description: 'Access denied',
				example: { error: 'You do not have access to this test run' } as ErrorResponse
			},
			404: {
				description: 'Test run not found',
				example: { error: 'Test run not found' } as ErrorResponse
			}
		}
	} satisfies ApiSchema<
		never,
		never,
		SubmitTestResultsBody,
		SubmitTestResultsResponse | ErrorResponse
	>
} as const;

// ============================================
// TEST CASES API
// ============================================

export type TestCaseResponse = {
	id: string;
	title: string;
	description: string | null;
	preconditions: string | null;
	steps: any; // JSON array of steps
	expectedResult: string | null;
	priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
	type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'INTEGRATION' | 'PERFORMANCE' | 'SECURITY' | 'UI' | 'API' | 'UNIT' | 'E2E';
	automationStatus: 'AUTOMATED' | 'NOT_AUTOMATED' | 'CANDIDATE';
	tags: string[];
	projectId: string;
	suiteId: string | null;
	createdBy: string;
	order: number;
	createdAt: Date | string;
	updatedAt: Date | string;
	creator?: {
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	};
};

export type CreateTestCaseBody = {
	title: string;
	description?: string;
	preconditions?: string;
	steps?: any; // Array of test step objects
	expectedResult?: string;
	priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
	type?: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'INTEGRATION' | 'PERFORMANCE' | 'SECURITY' | 'UI' | 'API' | 'UNIT' | 'E2E';
	automationStatus?: 'AUTOMATED' | 'NOT_AUTOMATED' | 'CANDIDATE';
	tags?: string[];
	suiteId?: string;
};

export const TestCasesApi = {
	create: {
		method: 'POST',
		path: '/api/projects/:projectId/test-cases',
		description: 'Create a new test case in a project. Optionally link it to a test suite.',
		tags: ['Test Cases'],
		params: {
			projectId: {
				type: 'string',
				description: 'Project ID',
				required: true,
				example: 'clx1a2b3c4d5e6f7g8h9i0j1'
			}
		},
		body: {
			description: 'Test case details',
			example: {
				title: 'User can login with valid credentials',
				description: 'Verify that users can successfully login using valid email and password',
				preconditions: 'User account exists in the system',
				steps: [
					{ step: 'Navigate to login page', expected: 'Login page is displayed' },
					{ step: 'Enter valid email', expected: 'Email field accepts input' },
					{ step: 'Enter valid password', expected: 'Password field accepts input' },
					{ step: 'Click Login button', expected: 'User is redirected to dashboard' }
				],
				expectedResult: 'User successfully logs in and sees dashboard',
				priority: 'HIGH',
				type: 'FUNCTIONAL',
				automationStatus: 'AUTOMATED',
				tags: ['authentication', 'login', 'smoke'],
				suiteId: 'suite_123'
			} as CreateTestCaseBody
		},
		responses: {
			200: {
				description: 'Test case created successfully',
				example: {
					testCase: {
						id: 'tc_123',
						title: 'User can login with valid credentials',
						description: 'Verify that users can successfully login using valid email and password',
						preconditions: 'User account exists in the system',
						steps: [
							{ step: 'Navigate to login page', expected: 'Login page is displayed' },
							{ step: 'Enter valid email', expected: 'Email field accepts input' },
							{ step: 'Enter valid password', expected: 'Password field accepts input' },
							{ step: 'Click Login button', expected: 'User is redirected to dashboard' }
						],
						expectedResult: 'User successfully logs in and sees dashboard',
						priority: 'HIGH',
						type: 'FUNCTIONAL',
						automationStatus: 'AUTOMATED',
						tags: ['authentication', 'login', 'smoke'],
						projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
						suiteId: 'suite_123',
						createdBy: 'user_123',
						order: 0,
						createdAt: '2024-01-15T10:30:00Z',
						updatedAt: '2024-01-15T10:30:00Z',
						creator: {
							id: 'user_123',
							email: 'john@example.com',
							firstName: 'John',
							lastName: 'Doe'
						}
					}
				}
			},
			400: {
				description: 'Invalid request',
				example: { error: 'Test case title is required' } as ErrorResponse
			},
			403: {
				description: 'Access denied',
				example: { error: 'You do not have access to this project' } as ErrorResponse
			},
			404: {
				description: 'Project not found',
				example: { error: 'Project not found' } as ErrorResponse
			}
		}
	} satisfies ApiSchema
} as const;

// ============================================
// MILESTONES API
// ============================================

export type MilestoneResponse = {
	id: string;
	name: string;
	description: string | null;
	dueDate: Date | string | null;
	status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
	projectId: string;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type CreateMilestoneBody = {
	name: string;
	description?: string;
	dueDate?: string; // ISO date string
	status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
};

export const MilestonesApi = {
	create: {
		method: 'POST',
		path: '/api/projects/:projectId/milestones',
		description: 'Create a new milestone for tracking release goals and test progress.',
		tags: ['Milestones'],
		params: {
			projectId: {
				type: 'string',
				description: 'Project ID',
				required: true,
				example: 'clx1a2b3c4d5e6f7g8h9i0j1'
			}
		},
		body: {
			description: 'Milestone details',
			example: {
				name: 'v2.1.0 Release',
				description: 'Feature release with new authentication system',
				dueDate: '2024-02-15T00:00:00Z',
				status: 'ACTIVE'
			} as CreateMilestoneBody
		},
		responses: {
			201: {
				description: 'Milestone created successfully',
				example: {
					id: 'milestone_123',
					name: 'v2.1.0 Release',
					description: 'Feature release with new authentication system',
					dueDate: '2024-02-15T00:00:00Z',
					status: 'ACTIVE',
					projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
					createdAt: '2024-01-15T10:30:00Z',
					updatedAt: '2024-01-15T10:30:00Z'
				} as MilestoneResponse
			}
		}
	} satisfies ApiSchema
} as const;

// ============================================
// ENVIRONMENTS API
// ============================================

export type EnvironmentResponse = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type CreateEnvironmentBody = {
	name: string;
	description?: string;
};

export const EnvironmentsApi = {
	create: {
		method: 'POST',
		path: '/api/projects/:projectId/environments',
		description: 'Create a new test environment (Production, Staging, QA, etc.).',
		tags: ['Environments'],
		params: {
			projectId: {
				type: 'string',
				description: 'Project ID',
				required: true,
				example: 'clx1a2b3c4d5e6f7g8h9i0j1'
			}
		},
		body: {
			description: 'Environment details',
			example: {
				name: 'Production',
				description: 'Production environment for smoke tests'
			} as CreateEnvironmentBody
		},
		responses: {
			201: {
				description: 'Environment created successfully',
				example: {
					id: 'env_123',
					name: 'Production',
					description: 'Production environment for smoke tests',
					projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
					createdAt: '2024-01-15T10:30:00Z',
					updatedAt: '2024-01-15T10:30:00Z'
				} as EnvironmentResponse
			}
		}
	} satisfies ApiSchema
} as const;

// ============================================
// TEST SUITES API
// ============================================

export type TestSuiteResponse = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	parentId: string | null;
	order: number;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export type CreateTestSuiteBody = {
	name: string;
	description?: string;
	parentId?: string; // For nested suites
};

export const TestSuitesApi = {
	create: {
		method: 'POST',
		path: '/api/projects/:projectId/test-suites',
		description: 'Create a new test suite to organize test cases hierarchically.',
		tags: ['Test Suites'],
		params: {
			projectId: {
				type: 'string',
				description: 'Project ID',
				required: true,
				example: 'clx1a2b3c4d5e6f7g8h9i0j1'
			}
		},
		body: {
			description: 'Test suite details',
			example: {
				name: 'Authentication',
				description: 'All authentication-related test cases',
				parentId: null
			} as CreateTestSuiteBody
		},
		responses: {
			201: {
				description: 'Test suite created successfully',
				example: {
					id: 'suite_123',
					name: 'Authentication',
					description: 'All authentication-related test cases',
					projectId: 'clx1a2b3c4d5e6f7g8h9i0j1',
					parentId: null,
					order: 0,
					createdAt: '2024-01-15T10:30:00Z',
					updatedAt: '2024-01-15T10:30:00Z'
				} as TestSuiteResponse
			}
		}
	} satisfies ApiSchema
} as const;

// ============================================
// ATTACHMENTS API
// ============================================

export type AttachmentResponse = {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	testCaseId: string | null;
	testResultId: string | null;
	createdAt: Date | string;
};

export const AttachmentsApi = {
	upload: {
		method: 'POST',
		path: '/api/attachments',
		description: 'Upload an attachment (screenshot, log, video) and link it to a test case or test result.',
		tags: ['Attachments'],
		body: {
			description: 'Multipart form data with file and metadata',
			example: {
				file: 'Binary file data',
				testCaseId: 'tc_123',
				testResultId: null
			}
		},
		responses: {
			201: {
				description: 'Attachment uploaded successfully',
				example: {
					id: 'att_123',
					filename: 'screenshot-2024-01-15.png',
					originalName: 'screenshot.png',
					mimeType: 'image/png',
					size: 125440,
					url: 'https://storage.example.com/attachments/screenshot-2024-01-15.png',
					testCaseId: null,
					testResultId: 'result_123',
					createdAt: '2024-01-15T10:30:00Z'
				} as AttachmentResponse
			}
		}
	} satisfies ApiSchema
} as const;

// ============================================
// ALL API SCHEMAS
// ============================================

export const ApiSchemas = {
	projects: ProjectsApi,
	testRuns: TestRunsApi,
	testResults: TestResultsApi,
	testCases: TestCasesApi,
	milestones: MilestonesApi,
	environments: EnvironmentsApi,
	testSuites: TestSuitesApi,
	attachments: AttachmentsApi
} as const;
