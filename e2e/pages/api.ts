import { APIRequestContext, APIResponse, expect } from '@playwright/test';

/**
 * API Client for QA Studio API
 * Follows the page object model for API testing
 */
export class ApiClient {
	readonly request: APIRequestContext;
	readonly baseURL: string;
	readonly apiKey: string;

	constructor(request: APIRequestContext, baseURL: string, apiKey: string) {
		this.request = request;
		this.baseURL = baseURL;
		this.apiKey = apiKey;
	}

	/**
	 * Get authorization headers
	 */
	private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
		return {
			'X-API-Key': this.apiKey,
			'Content-Type': 'application/json',
			...additionalHeaders
		};
	}

	// ==================== PROJECTS ====================

	/**
	 * Create a new project
	 */
	async createProject(data: {
		name: string;
		key: string;
		description?: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/projects`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List all projects
	 */
	async listProjects(params?: {
		page?: number;
		limit?: number;
		search?: string;
	}): Promise<APIResponse> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);

		const url = `${this.baseURL}/api/projects${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Get a project by ID
	 */
	async getProject(projectId: string): Promise<APIResponse> {
		return await this.request.get(`${this.baseURL}/api/projects/${projectId}`, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Update a project
	 */
	async updateProject(
		projectId: string,
		data: {
			name?: string;
			key?: string;
			description?: string;
		}
	): Promise<APIResponse> {
		return await this.request.patch(`${this.baseURL}/api/projects/${projectId}`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * Delete a project
	 */
	async deleteProject(projectId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/projects/${projectId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== TEST CASES ====================

	/**
	 * Create a test case
	 */
	async createTestCase(data: {
		projectId: string;
		title: string;
		description?: string;
		priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
		type?:
			| 'FUNCTIONAL'
			| 'REGRESSION'
			| 'SMOKE'
			| 'INTEGRATION'
			| 'PERFORMANCE'
			| 'SECURITY'
			| 'UI'
			| 'API'
			| 'UNIT'
			| 'E2E';
		automationStatus?: 'AUTOMATED' | 'NOT_AUTOMATED' | 'CANDIDATE';
		steps?: Array<{
			action: string;
			expectedResult: string;
			order: number;
		}>;
		tags?: string[];
		suiteId?: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/projects/${data.projectId}/cases`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List test cases for a project
	 */
	async listTestCases(
		projectId: string,
		params?: {
			page?: number;
			limit?: number;
			search?: string;
			status?: string;
			priority?: string;
			type?: string;
			tags?: string;
			suiteId?: string;
		}
	): Promise<APIResponse> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);
		if (params?.status) searchParams.set('status', params.status);
		if (params?.priority) searchParams.set('priority', params.priority);
		if (params?.type) searchParams.set('type', params.type);
		if (params?.tags) searchParams.set('tags', params.tags);
		if (params?.suiteId) searchParams.set('suiteId', params.suiteId);

		const url = `${this.baseURL}/api/projects/${projectId}/cases${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Get a test case by ID
	 */
	async getTestCase(projectId: string, testCaseId: string): Promise<APIResponse> {
		return await this.request.get(`${this.baseURL}/api/projects/${projectId}/cases/${testCaseId}`, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Update a test case
	 */
	async updateTestCase(
		projectId: string,
		testCaseId: string,
		data: {
			title?: string;
			description?: string;
			priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
			type?: string;
			automationStatus?: 'AUTOMATED' | 'NOT_AUTOMATED' | 'CANDIDATE';
			steps?: Array<{
				action: string;
				expectedResult: string;
				order: number;
			}>;
			tags?: string[];
		}
	): Promise<APIResponse> {
		return await this.request.patch(
			`${this.baseURL}/api/projects/${projectId}/cases/${testCaseId}`,
			{
				headers: this.getHeaders(),
				data
			}
		);
	}

	/**
	 * Delete a test case
	 */
	async deleteTestCase(projectId: string, testCaseId: string): Promise<APIResponse> {
		return await this.request.delete(
			`${this.baseURL}/api/projects/${projectId}/cases/${testCaseId}`,
			{
				headers: this.getHeaders()
			}
		);
	}

	// ==================== TEST RUNS ====================

	/**
	 * Create a test run
	 */
	async createTestRun(data: {
		projectId: string;
		name: string;
		description?: string;
		environmentId?: string;
		milestoneId?: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/runs`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List test runs
	 */
	async listTestRuns(params?: {
		page?: number;
		limit?: number;
		projectId?: string;
		environmentId?: string;
		milestoneId?: string;
	}): Promise<APIResponse> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.projectId) searchParams.set('projectId', params.projectId);
		if (params?.environmentId) searchParams.set('environmentId', params.environmentId);
		if (params?.milestoneId) searchParams.set('milestoneId', params.milestoneId);

		const url = `${this.baseURL}/api/runs${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Get a test run by ID
	 */
	async getTestRun(projectId: string, runId: string): Promise<APIResponse> {
		return await this.request.get(`${this.baseURL}/api/projects/${projectId}/runs/${runId}`, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Update a test run
	 */
	async updateTestRun(
		projectId: string,
		runId: string,
		data: {
			name?: string;
			description?: string;
			status?: string;
		}
	): Promise<APIResponse> {
		return await this.request.patch(`${this.baseURL}/api/projects/${projectId}/runs/${runId}`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * Delete a test run
	 */
	async deleteTestRun(projectId: string, runId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/projects/${projectId}/runs/${runId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== TEST RESULTS ====================

	/**
	 * Create a test result
	 */
	async createTestResult(data: {
		testRunId: string;
		testCaseId: string;
		status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'RETEST' | 'UNTESTED';
		duration?: number;
		error?: string;
		stackTrace?: string;
		steps?: Array<{
			action: string;
			expectedResult: string;
			actualResult?: string;
			status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
			order: number;
		}>;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/results`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List test results for a run
	 */
	async listTestResults(
		runId: string,
		params?: {
			page?: number;
			limit?: number;
			status?: string;
		}
	): Promise<APIResponse> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.status) searchParams.set('status', params.status);

		const url = `${this.baseURL}/api/runs/${runId}/results${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Get a test result by ID
	 */
	async getTestResult(resultId: string): Promise<APIResponse> {
		return await this.request.get(`${this.baseURL}/api/results/${resultId}`, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Update a test result
	 */
	async updateTestResult(
		resultId: string,
		data: {
			status?: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'RETEST' | 'UNTESTED';
			duration?: number;
			error?: string;
			stackTrace?: string;
		}
	): Promise<APIResponse> {
		return await this.request.patch(`${this.baseURL}/api/results/${resultId}`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * Delete a test result
	 */
	async deleteTestResult(resultId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/results/${resultId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== ATTACHMENTS ====================

	/**
	 * Upload an attachment
	 */
	async uploadAttachment(data: {
		testCaseId?: string;
		testResultId?: string;
		filename: string;
		data: string; // base64 encoded
		contentType: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/attachments`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List attachments
	 */
	async listAttachments(params?: {
		page?: number;
		limit?: number;
		testCaseId?: string;
		testResultId?: string;
	}): Promise<APIResponse> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.testCaseId) searchParams.set('testCaseId', params.testCaseId);
		if (params?.testResultId) searchParams.set('testResultId', params.testResultId);

		const url = `${this.baseURL}/api/attachments${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Delete an attachment
	 */
	async deleteAttachment(attachmentId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/attachments/${attachmentId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== ENVIRONMENTS ====================

	/**
	 * Create an environment
	 */
	async createEnvironment(data: {
		projectId: string;
		name: string;
		description?: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/environments`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List environments
	 */
	async listEnvironments(projectId?: string): Promise<APIResponse> {
		const url = projectId
			? `${this.baseURL}/api/environments?projectId=${projectId}`
			: `${this.baseURL}/api/environments`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Delete an environment
	 */
	async deleteEnvironment(environmentId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/environments/${environmentId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== MILESTONES ====================

	/**
	 * Create a milestone
	 */
	async createMilestone(data: {
		projectId: string;
		name: string;
		description?: string;
		startDate?: string;
		dueDate?: string;
	}): Promise<APIResponse> {
		return await this.request.post(`${this.baseURL}/api/milestones`, {
			headers: this.getHeaders(),
			data
		});
	}

	/**
	 * List milestones
	 */
	async listMilestones(projectId?: string): Promise<APIResponse> {
		const url = projectId
			? `${this.baseURL}/api/milestones?projectId=${projectId}`
			: `${this.baseURL}/api/milestones`;
		return await this.request.get(url, {
			headers: this.getHeaders()
		});
	}

	/**
	 * Delete a milestone
	 */
	async deleteMilestone(milestoneId: string): Promise<APIResponse> {
		return await this.request.delete(`${this.baseURL}/api/milestones/${milestoneId}`, {
			headers: this.getHeaders()
		});
	}

	// ==================== HELPER METHODS ====================

	/**
	 * Assert response status code
	 */
	async assertStatus(response: APIResponse, expectedStatus: number): Promise<void> {
		expect(response.status()).toBe(expectedStatus);
	}

	/**
	 * Assert response has required fields
	 */
	async assertHasFields(response: APIResponse, fields: string[]): Promise<void> {
		const json = await response.json();
		for (const field of fields) {
			expect(json).toHaveProperty(field);
		}
	}

	/**
	 * Get response body as JSON
	 */
	async getResponseBody(response: APIResponse): Promise<any> {
		return await response.json();
	}

	/**
	 * Assert pagination structure
	 */
	async assertPaginationStructure(response: APIResponse): Promise<void> {
		const json = await response.json();
		expect(json).toHaveProperty('data');
		expect(json).toHaveProperty('pagination');
		expect(json.pagination).toHaveProperty('page');
		expect(json.pagination).toHaveProperty('limit');
		expect(json.pagination).toHaveProperty('total');
		expect(json.pagination).toHaveProperty('totalPages');
		expect(json.pagination).toHaveProperty('hasMore');
		expect(Array.isArray(json.data)).toBe(true);
	}

	/**
	 * Assert error response structure
	 */
	async assertErrorResponse(response: APIResponse, expectedStatus: number): Promise<void> {
		expect(response.status()).toBe(expectedStatus);
		const json = await response.json();
		expect(json).toHaveProperty('message');
	}
}
