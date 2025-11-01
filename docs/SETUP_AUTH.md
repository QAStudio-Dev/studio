# QA Studio - Clerk Authentication Setup Guide

## What You Need To Do

### 1. Sign Up for Clerk (5 minutes)

1. Go to **https://clerk.com** and create an account
2. Click "Add Application"
3. Name your application: **QA Studio**
4. Choose **SvelteKit** as your framework
5. Keep the default authentication options (Email, Google, etc.)

### 2. Get Your API Keys

After creating your application, you'll see your API keys on the dashboard:

1. Copy **Publishable Key** (starts with `pk_test_` or `pk_live_`)
2. Copy **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 3. Create Environment File

Create a file named `.env.local` in the root of your project:

```bash
# Clerk Authentication Keys
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Database (update with your PostgreSQL credentials)
DATABASE_URL="postgresql://user:password@localhost:5432/qa_studio?schema=public"
```

**Replace `pk_test_your_key_here` and `sk_test_your_key_here` with your actual Clerk keys!**

### 4. Configure Database Schema

Since we added user tracking fields, you need to migrate your database:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Create migration (if you have existing data, this might require manual migration)
npx prisma migrate dev --name add_user_tracking

# Or if starting fresh:
npx prisma db push
```

### 5. Start Your App

```bash
npm run dev
```

### 6. Test Authentication

1. Visit **http://localhost:5173**
2. Click **"Sign Up"** in the header
3. Create an account (you can use email or Google)
4. You should see your profile picture/menu in the header after signing in

## What's Been Set Up For You

### ✅ Files Created/Modified

1. **`.env.example`** - Template for environment variables
2. **`src/hooks.server.ts`** - Clerk middleware integration
3. **`src/routes/+layout.svelte`** - Clerk provider wrapper
4. **`src/routes/+layout.server.ts`** - Server-side auth state
5. **`src/routes/Header.svelte`** - Sign in/up buttons + UserButton
6. **`src/routes/sign-in/+page.svelte`** - Sign in page
7. **`src/routes/sign-up/+page.svelte`** - Sign up page
8. **`src/routes/user-profile/+page.svelte`** - User profile management
9. **`src/lib/server/auth.ts`** - Helper functions for protecting routes
10. **`src/routes/api/projects/+server.ts`** - Example protected API route
11. **`prisma/schema.prisma`** - Updated with user tracking fields
12. **`claude.md`** - Updated with auth documentation

### ✅ Features Included

- **Authentication Pages**: Sign in, sign up, user profile
- **Protected API Routes**: Projects API requires authentication
- **User Tracking**: All projects, test cases, test runs, and results track who created/executed them
- **Secure Headers**: User menu with profile and sign-out
- **Server-Side Auth**: Middleware validates sessions on every request

### ✅ Clerk Features Available

- **Email/Password**: Built-in
- **Social Login**: Google, GitHub, etc. (configure in Clerk dashboard)
- **Magic Links**: Passwordless authentication
- **Multi-Factor Auth**: SMS, Authenticator apps
- **Session Management**: Automatic token refresh
- **User Profile**: Pre-built profile management UI

## Enterprise Features (When You Need Them)

When you upgrade to Clerk's Business plan, you get:

### SSO/SAML Support

1. Go to Clerk Dashboard → **SSO Connections**
2. Click **Add Connection**
3. Choose provider (Okta, Azure AD, Google Workspace, etc.)
4. Follow provider-specific setup guide
5. Your customers can sign in with their corporate SSO

### Organizations (Multi-Tenancy)

```typescript
// Enable in Clerk Dashboard → Organizations
// Then you can check which org a user belongs to:

export const GET: RequestHandler = async (event) => {
	const userId = requireAuth(event);
	const { orgId } = event.locals.clerk.session || {};

	// Filter projects by organization
	const projects = await db.project.findMany({
		where: { organizationId: orgId }
	});

	return json(projects);
};
```

## Troubleshooting

### "Invalid publishable key"

- Make sure you created `.env.local` (not `.env`)
- Check that keys start with `pk_test_` and `sk_test_`
- Restart dev server after adding keys

### "Unauthorized" errors on API calls

- Make sure you're signed in
- Check that `requireAuth()` is being called correctly
- Look for `event.locals.clerk.session` in server logs

### Database migration issues

- If you have existing data, you may need to manually set `createdBy` fields
- Consider running `npx prisma migrate reset` for a fresh start (⚠️ deletes all data)

## Next Steps

1. **Protect remaining API routes**: Add `requireAuth()` to other endpoints
2. **Add organization support**: Configure multi-tenancy for team workspaces
3. **Set up SSO**: Contact Clerk for SSO setup (Business plan)
4. **Customize auth UI**: Modify sign-in/sign-up pages to match your brand
5. **Add RBAC**: Implement role-based permissions (Admin, Manager, Tester)

## Questions?

- **Clerk Docs**: https://clerk.com/docs/quickstarts/sveltekit
- **SvelteKit Integration**: https://clerk.com/docs/references/sveltekit/overview
- **Enterprise SSO**: https://clerk.com/docs/authentication/saml/overview

---

**You're all set!** 🎉 Just add your Clerk keys to `.env.local` and run the database migration.
