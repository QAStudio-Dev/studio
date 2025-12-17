import { describe, it, expect } from 'vitest';

// Test the boolean parsing logic directly
// This matches the implementation in src/lib/config.ts
function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
	if (!value) return defaultValue;
	return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

describe('parseBooleanEnv - Boolean Parsing Logic', () => {
	it('should parse "true" as true', () => {
		expect(parseBooleanEnv('true')).toBe(true);
	});

	it('should parse "TRUE" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('TRUE')).toBe(true);
	});

	it('should parse "True" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('True')).toBe(true);
	});

	it('should parse "1" as true', () => {
		expect(parseBooleanEnv('1')).toBe(true);
	});

	it('should parse "yes" as true', () => {
		expect(parseBooleanEnv('yes')).toBe(true);
	});

	it('should parse "YES" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('YES')).toBe(true);
	});

	it('should parse "Yes" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('Yes')).toBe(true);
	});

	it('should parse "on" as true', () => {
		expect(parseBooleanEnv('on')).toBe(true);
	});

	it('should parse "ON" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('ON')).toBe(true);
	});

	it('should parse "On" as true (case-insensitive)', () => {
		expect(parseBooleanEnv('On')).toBe(true);
	});

	it('should parse "false" as false', () => {
		expect(parseBooleanEnv('false')).toBe(false);
	});

	it('should parse "0" as false', () => {
		expect(parseBooleanEnv('0')).toBe(false);
	});

	it('should parse "no" as false', () => {
		expect(parseBooleanEnv('no')).toBe(false);
	});

	it('should parse "off" as false', () => {
		expect(parseBooleanEnv('off')).toBe(false);
	});

	it('should parse empty string as false', () => {
		expect(parseBooleanEnv('')).toBe(false);
	});

	it('should default to false when undefined', () => {
		expect(parseBooleanEnv(undefined)).toBe(false);
	});

	it('should use custom default value', () => {
		expect(parseBooleanEnv(undefined, true)).toBe(true);
		expect(parseBooleanEnv('', true)).toBe(true);
	});

	it('should parse random string as false', () => {
		expect(parseBooleanEnv('random-value')).toBe(false);
	});

	it('should parse whitespace-only string as false', () => {
		expect(parseBooleanEnv('   ')).toBe(false);
	});

	it('should trim whitespace before parsing', () => {
		expect(parseBooleanEnv(' true ')).toBe(true);
		expect(parseBooleanEnv('  1  ')).toBe(true);
		expect(parseBooleanEnv('\tyes\t')).toBe(true);
		expect(parseBooleanEnv('\non\n')).toBe(true);
	});
});
