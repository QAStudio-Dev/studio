# Decap CMS Setup Guide

This guide explains how to set up Decap CMS for managing blog posts on QA Studio.

## Prerequisites

1. A GitHub account
2. A GitHub repository for QA Studio
3. GitHub OAuth App credentials

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `QA Studio CMS`
   - **Homepage URL**: `https://qastudio.dev` (or your domain)
   - **Authorization callback URL**: `https://qastudio.dev/api/auth/decap`
4. Click "Register application"
5. Note the **Client ID** and generate a **Client Secret**

### 2. Update Environment Variables

Add the following to your `.env` file:

```bash
# Decap CMS GitHub OAuth
DECAP_GITHUB_CLIENT_ID=your_client_id_here
DECAP_GITHUB_CLIENT_SECRET=your_client_secret_here
```

### 3. Update CMS Configuration

Edit `/static/admin/config.yml` and update the repository:

```yaml
backend:
  name: github
  repo: YOUR_USERNAME/qa-studio # ← Update this with your GitHub username
  base_url: https://qastudio.dev
  auth_endpoint: /api/auth/decap
```

### 4. Access the CMS

1. Deploy your application with the new environment variables
2. Navigate to `https://qastudio.dev/admin`
3. Click "Login with GitHub"
4. Authorize the application
5. Start creating blog posts!

## File Structure

```
src/
├── md/
│   └── blog/                     # Blog markdown files
│       └── welcome-to-qa-studio.md
├── routes/
│   ├── blog/
│   │   ├── +page.server.ts      # Blog listing loader
│   │   ├── +page.svelte         # Blog listing page
│   │   └── [slug]/
│   │       ├── +page.server.ts  # Individual post loader
│   │       └── +page.svelte     # Individual post page
│   └── api/
│       └── auth/
│           └── decap/
│               └── +server.ts   # GitHub OAuth handler
static/
├── admin/
│   ├── config.yml               # Decap CMS configuration
│   └── index.html               # CMS admin interface
└── images/
    └── blog/                     # Blog images uploaded via CMS
```

## Creating Blog Posts

### Via CMS (Recommended)

1. Go to `/admin`
2. Click "New Blog Posts"
3. Fill in the fields:
   - **Title**: Post title
   - **Publish Date**: When to publish
   - **Description**: Short summary (for SEO)
   - **Cover Image**: Featured image
   - **Category**: Select from predefined categories
   - **Tags**: Comma-separated tags
   - **Author**: Defaults to "QA Studio Team"
   - **Slug**: URL-friendly identifier
   - **Published**: Toggle to publish/unpublish
   - **Body**: Main content in Markdown
4. Click "Save" → "Publish"

### Manually

Create a new `.md` file in `src/md/blog/`:

```markdown
---
title: 'Your Post Title'
date: 2025-01-15T10:00:00.000Z
description: 'A short description'
cover: '/images/blog/cover.jpg'
category: 'Testing'
tags: ['automation', 'qa']
author: 'Your Name'
slug: 'your-post-slug'
published: true
---

# Your Content Here

Write your blog post content in Markdown...
```

## Categories

Available categories:
- Testing
- QA Engineering
- Automation
- Best Practices
- Product Updates

## Local Development

For local development with Decap CMS:

1. Install `decap-server`:
   ```bash
   npm install -g decap-server
   ```

2. Uncomment in `/static/admin/config.yml`:
   ```yaml
   local_backend: true
   ```

3. Run the local proxy:
   ```bash
   decap-server
   ```

4. Access CMS at `http://localhost:5173/admin`

## Troubleshooting

### "Error loading entries"
- Check that your GitHub repo is correct in `config.yml`
- Verify GitHub OAuth credentials in `.env`
- Ensure you have write access to the repository

### "Failed to authenticate"
- Verify the OAuth callback URL matches your deployment
- Check that environment variables are set in production

### Posts not showing on blog page
- Ensure `published: true` in frontmatter
- Check that the file is in `src/md/blog/`
- Verify the date is not in the future

## Additional Resources

- [Decap CMS Documentation](https://decapcms.org/docs/)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
