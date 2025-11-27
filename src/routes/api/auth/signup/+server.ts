import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/crypto';
import { createSession, setSessionCookie } from '$lib/server/sessions';

export const POST: RequestHandler = async (event) => {
	try {
		const { email, password, firstName, lastName } = await event.request.json();

		// Validate input
		if (!email || !password) {
			throw error(400, {
				message: 'Email and password are required'
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw error(400, {
				message: 'Invalid email format'
			});
		}

		// Validate password strength (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number)
		if (password.length < 8) {
			throw error(400, {
				message: 'Password must be at least 8 characters long'
			});
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
		if (!passwordRegex.test(password)) {
			throw error(400, {
				message:
					'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			});
		}

		// Check if user already exists
		const existingUser = await db.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (existingUser) {
			throw error(409, {
				message: 'An account with this email already exists'
			});
		}

		// Hash password using bcrypt
		const passwordHash = await hashPassword(password);

		// Create user
		const user = await db.user.create({
			data: {
				email: email.toLowerCase(),
				passwordHash,
				firstName: firstName || null,
				lastName: lastName || null,
				role: 'TESTER', // Default role
				emailVerified: false // Set to true if you don't require email verification
			}
		});

		// Create session
		const { token, csrfToken } = await createSession(user.id);

		// Set session cookie
		setSessionCookie(event, token, csrfToken);

		// Return user data (excluding password hash)
		return json({
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Signup error:', err);
		throw error(500, {
			message: 'An error occurred during signup'
		});
	}
};
