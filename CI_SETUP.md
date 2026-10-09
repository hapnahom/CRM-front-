# CI/CD Setup Guide

## Overview

This guide explains how to set up the CI/CD pipeline to resolve Firebase authentication errors during builds.

## Solutions Implemented

### 1. Dynamic Page Generation

Added `export const dynamic = 'force-dynamic'` to all pages that use Firebase authentication to prevent static generation issues.

### 2. Next.js Configuration

Updated `next.config.mjs` with:

- `output: 'standalone'` - Prevents static generation issues
- `experimental: { esmExternals: false }` - Resolves module resolution issues

### 3. GitHub Actions Environment Variables

The CI workflow now includes all necessary Firebase environment variables.

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### Firebase Configuration

```
NEXT_PUBLIC_API_KEY=your_firebase_api_key
NEXT_PUBLIC_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_PROJECT_ID=your_project_id
NEXT_PUBLIC_APP_ID=your_app_id
```

### App Environment Variables

```
ORG_AND_EMP_URL=your_org_emp_url
TENANT_MGMT_URL=your_tenant_mgmt_url
TENANT_BASE_URL=your_tenant_base_url
NOTIFICATION_URL=your_notification_url
PUBLIC_DOMAIN=your_public_domain
APPROVER_URL=your_approver_url
EMAIL_URL=your_email_url
```

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings**
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value

## Testing the Setup

1. Commit and push your changes
2. The CI will automatically run
3. Check the Actions tab to see the build status
4. If successful, you should see "✓ Compiled successfully" and no Firebase errors

## Troubleshooting

### Still Getting Firebase Errors?

- Ensure all secrets are added to GitHub
- Check that secret names match exactly (case-sensitive)
- Verify Firebase project configuration

### Build Still Failing?

- Check the CI logs for specific error messages
- Ensure all environment variables are properly set
- Verify Next.js configuration is correct

## Files Modified

- `next.config.mjs` - Added build configuration
- `.github/workflows/ci.yml` - Enhanced environment variables
- Multiple page files - Added `dynamic = 'force-dynamic'`
- `env.example` - Environment variables template
- `CI_SETUP.md` - This documentation

## Next Steps

1. Add all required secrets to GitHub
2. Commit and push your changes
3. Monitor the CI build
4. The build should now pass successfully! 🎉
