import { describe, it, expect } from 'vitest';
import { sanitizeForMeta } from './sanitize-meta';

describe('sanitizeForMeta', () => {
	describe('null/undefined handling', () => {
		it('should return empty string for null', () => {
			expect(sanitizeForMeta(null)).toBe('');
		});

		it('should return empty string for undefined', () => {
			expect(sanitizeForMeta(undefined)).toBe('');
		});

		it('should return empty string for empty string', () => {
			expect(sanitizeForMeta('')).toBe('');
		});
	});

	describe('HTML tag removal', () => {
		it('should remove simple HTML tags', () => {
			expect(sanitizeForMeta('<script>alert("xss")</script>')).toBe('alert("xss")');
		});

		it('should remove multiple HTML tags', () => {
			expect(sanitizeForMeta('<div><p>Hello</p></div>')).toBe('Hello');
		});

		it('should remove self-closing tags', () => {
			expect(sanitizeForMeta('Line 1<br/>Line 2')).toBe('Line 1Line 2');
		});

		it('should remove tags with attributes', () => {
			expect(sanitizeForMeta('<a href="evil.com">Click me</a>')).toBe('Click me');
		});

		it('should preserve comparison operators (not HTML)', () => {
			// Our regex only matches actual HTML tags (letter after <)
			// Mathematical operators like < and > are preserved
			expect(sanitizeForMeta('Text < 5 and > 2')).toBe('Text < 5 and > 2');
		});
	});

	describe('control character removal', () => {
		it('should remove null bytes', () => {
			expect(sanitizeForMeta('Hello\x00World')).toBe('HelloWorld');
		});

		it('should remove control characters', () => {
			expect(sanitizeForMeta('Hello\x01\x02\x03World')).toBe('HelloWorld');
		});

		it('should remove zero-width characters', () => {
			expect(sanitizeForMeta('Hello\u200BWorld')).toBe('HelloWorld');
		});

		it('should remove multiple types of invisible characters', () => {
			expect(sanitizeForMeta('Test\u200B\u200C\u200D\uFEFFString')).toBe('TestString');
		});
	});

	describe('whitespace normalization', () => {
		it('should normalize multiple spaces to single space', () => {
			expect(sanitizeForMeta('Hello    World')).toBe('Hello World');
		});

		it('should convert newlines to spaces', () => {
			expect(sanitizeForMeta('Line 1\nLine 2\nLine 3')).toBe('Line 1 Line 2 Line 3');
		});

		it('should convert tabs to spaces', () => {
			expect(sanitizeForMeta('Hello\t\tWorld')).toBe('Hello World');
		});

		it('should trim leading and trailing whitespace', () => {
			expect(sanitizeForMeta('  Hello World  ')).toBe('Hello World');
		});

		it('should handle mixed whitespace characters', () => {
			expect(sanitizeForMeta('  Hello\n\t  World  \n')).toBe('Hello World');
		});
	});

	describe('special characters preservation', () => {
		it('should preserve ampersands (svelte-meta-tags handles escaping)', () => {
			expect(sanitizeForMeta('Johnson & Associates')).toBe('Johnson & Associates');
		});

		it('should preserve quotes', () => {
			expect(sanitizeForMeta('Project "Alpha"')).toBe('Project "Alpha"');
		});

		it('should preserve apostrophes', () => {
			expect(sanitizeForMeta("User's Project")).toBe("User's Project");
		});

		it('should preserve numbers and special chars', () => {
			expect(sanitizeForMeta('Test #123 @ 50%')).toBe('Test #123 @ 50%');
		});
	});

	describe('real-world scenarios', () => {
		it('should handle typical project name', () => {
			expect(sanitizeForMeta('E-Commerce Platform (2024)')).toBe(
				'E-Commerce Platform (2024)'
			);
		});

		it('should handle project name with HTML injection attempt', () => {
			expect(sanitizeForMeta('Project <script>alert(1)</script> Name')).toBe(
				'Project alert(1) Name'
			);
		});

		it('should handle multi-line description', () => {
			const input = 'Line 1\n\nLine 2\n  Line 3';
			expect(sanitizeForMeta(input)).toBe('Line 1 Line 2 Line 3');
		});

		it('should handle description with HTML formatting', () => {
			const input = '<p>This is a <strong>test</strong> description.</p>';
			expect(sanitizeForMeta(input)).toBe('This is a test description.');
		});

		it('should handle edge case: only whitespace', () => {
			expect(sanitizeForMeta('   \n\t   ')).toBe('');
		});

		it('should handle edge case: only control characters', () => {
			expect(sanitizeForMeta('\x00\x01\x02')).toBe('');
		});
	});

	describe('XSS prevention', () => {
		it('should prevent script injection', () => {
			const xss = '<script>document.cookie</script>';
			expect(sanitizeForMeta(xss)).toBe('document.cookie');
		});

		it('should prevent img tag injection', () => {
			const xss = '<img src=x onerror=alert(1)>';
			expect(sanitizeForMeta(xss)).toBe('');
		});

		it('should prevent style injection', () => {
			const xss = '<style>body{display:none}</style>';
			expect(sanitizeForMeta(xss)).toBe('body{display:none}');
		});

		it('should prevent event handler injection', () => {
			const xss = '<div onclick="alert(1)">Click</div>';
			expect(sanitizeForMeta(xss)).toBe('Click');
		});
	});
});
