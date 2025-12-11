# Deployment Configuration

This document describes how to configure deployment for the W1AW Schedule application using modern
best practices with Workload Identity Federation (WIF).

## Overview

The deployment process uses GitHub Actions to automatically deploy to Firebase Hosting. Instead of
using long-lived service account keys, the deployment uses **Workload Identity Federation**, which
allows GitHub Actions to authenticate directly with Google Cloud using short-lived OIDC tokens.

The repository includes two types of deployments:

1. **Production Deployment** (`.github/workflows/deploy.yml`): Deploys to production when code is
   merged to the `main` branch. Includes hosting, Firestore rules/indexes, and Cloud Functions.

2. **Preview Channel Deployment** (`.github/workflows/preview.yml`): Deploys to a temporary preview
   channel when a pull request is opened. Only includes the web application for quick testing.
   Preview channels expire after 7 days and are automatically cleaned up when PRs are closed.

## Prerequisites

- A Firebase project (this project uses `w1aw-schedule-76a82`)
- Admin access to both the Firebase/Google Cloud project and the GitHub repository
- `gcloud` CLI installed locally for setup

## Setting up Workload Identity Federation

### 1. Enable Required APIs

First, enable the required Google Cloud APIs:

```bash
gcloud services enable iamcredentials.googleapis.com \
  --project=w1aw-schedule-76a82
```

### 2. Create a Service Account

Create a service account that will be used for deployments:

```bash
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deployment" \
  --project=w1aw-schedule-76a82
```

### 3. Grant Required Permissions

Grant the service account the necessary permissions to deploy to Firebase:

```bash
# Firebase Hosting Admin role
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

# Cloud Functions Developer (if deploying functions)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.developer"

# Cloud Run Admin (for newer Firebase functions)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Service Account User (to deploy functions that run as other service accounts)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Firebase Admin SDK Admin Service Agent (for Firebase extensions)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/firebase.sdkAdminServiceAgent"

# Cloud Datastore User (for Firestore rules deployment)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Firebase Extensions Admin (for extensions management)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/firebaseextensions.admin"

# Secret Manager Secret Accessor (to read secret values)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Secret Manager Viewer (to read secret metadata)
gcloud projects add-iam-policy-binding w1aw-schedule-76a82 \
  --member="serviceAccount:github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --role="roles/secretmanager.viewer"
```

### 4. Create Workload Identity Pool

Create a workload identity pool for GitHub Actions:

```bash
gcloud iam workload-identity-pools create "github-actions" \
  --project="w1aw-schedule-76a82" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### 5. Create Workload Identity Provider

Create a provider in the pool for GitHub:

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="w1aw-schedule-76a82" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='k0swe'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

**What does `--attribute-condition` do?**

The `--attribute-condition` parameter is a security requirement that validates claims from the GitHub OIDC token. In this case, `assertion.repository_owner=='k0swe'` ensures that only repositories owned by the `k0swe` user/organization can use this identity provider. This prevents other GitHub users from potentially impersonating your service account.

**Why is this parameter required?**

Google Cloud requires an attribute condition when you use certain attribute mappings (like `attribute.repository_owner`). Without this condition, the command will fail with an error stating that "The attribute condition must reference one of the provider's claims." This is a security best practice to ensure you explicitly define which tokens are acceptable.

### 6. Allow GitHub Actions to Impersonate the Service Account

Grant the workload identity pool permission to impersonate the service account, but only from this
specific repository:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
  --project="w1aw-schedule-76a82" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/k0swe/w1aw-schedule"
```

**Note:** Replace `PROJECT_NUMBER` with your actual project number. You can find it with:

```bash
gcloud projects describe w1aw-schedule-76a82 --format="value(projectNumber)"
```

### 7. Get the Workload Identity Provider Resource Name

Get the full resource name of the workload identity provider:

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="w1aw-schedule-76a82" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --format="value(name)"
```

This will output something like:

```
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-provider
```

### 8. Configure GitHub Repository Secrets

Add the following secrets to your GitHub repository (`Settings` → `Secrets and variables` →
`Actions`):

1. **WIF_PROVIDER**: The full workload identity provider resource name from step 7

   ```
   projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-provider
   ```

2. **WIF_SERVICE_ACCOUNT**: The email of the service account
   ```
   github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com
   ```

**Required Repository Variables** (Settings → Secrets and variables → Actions → Variables tab):

1. **DISCORD_REDIRECT_URI**: The OAuth redirect URI for Discord authentication
2. **FINAL_REDIRECT_URI**: The final redirect URI after authentication completes

These are not sensitive and should be configured as variables (not secrets) so they're visible in logs for debugging.

### 9. Remove Old Secret (Optional)

Once you've verified the new setup works, you can remove the old
`FIREBASE_SERVICE_ACCOUNT_W1AW_SCHEDULE` secret from GitHub.

## How It Works

When a deployment workflow runs:

1. GitHub Actions generates an OIDC token that identifies the workflow, repository, and actor
2. The `google-github-actions/auth` action exchanges this token for Google Cloud credentials
3. The workload identity pool validates that the request comes from the authorized repository
4. Google Cloud grants temporary credentials to impersonate the service account
5. The Firebase CLI uses these credentials to deploy

## Benefits

- **No long-lived credentials**: Service account keys are not stored anywhere
- **Better security**: Credentials are short-lived (1 hour) and automatically rotated
- **Fine-grained access control**: Only specific repositories and workflows can deploy
- **Audit trail**: All authentication events are logged in Google Cloud
- **Easier key rotation**: No manual key rotation needed

## Troubleshooting

### INVALID_ARGUMENT: The attribute condition must reference one of the provider's claims

If you encounter this error when creating the Workload Identity Provider in step 5:

```
ERROR: (gcloud.iam.workload-identity-pools.providers.create-oidc) INVALID_ARGUMENT: 
The attribute condition must reference one of the provider's claims.
```

This means you need to add the `--attribute-condition` parameter to your command. Google Cloud requires this security measure when using attribute mappings like `attribute.repository_owner`. 

**Solution:** Make sure your command includes the `--attribute-condition` parameter as shown in step 5:

```bash
--attribute-condition="assertion.repository_owner=='k0swe'"
```

This condition restricts the provider to only accept tokens from repositories owned by `k0swe`, improving security.

### Authentication Errors

If you see authentication errors:

1. Verify the `WIF_PROVIDER` secret is the full resource name (starts with `projects/`)
2. Verify the `WIF_SERVICE_ACCOUNT` secret has the correct email format
3. Check that the service account has the required IAM roles
4. Ensure the workload identity binding includes the correct repository name

### Permission Errors

If deployment fails with permission errors:

1. Verify all IAM roles from step 3 are granted
2. Check that the service account has `serviceAccountUser` role if deploying functions
3. Wait a few minutes for IAM changes to propagate

### Provider Not Found

If you see "provider not found" errors:

1. Ensure you've enabled the IAM Credentials API
2. Verify the workload identity pool and provider were created successfully
3. Check that you're using the correct project ID

## Preview Channels for Pull Requests

Firebase Hosting preview channels allow you to test changes before merging to production. This
repository includes automated preview channel deployments for all pull requests.

### How It Works

1. When a PR is opened against the `main` branch, the `.github/workflows/preview.yml` workflow runs
2. The web application is built using `npm run build:prod`
3. A unique preview channel is created based on the PR number (e.g., `pr-123`)
4. The built application is deployed to the preview channel
5. A comment is automatically posted on the PR with the preview URL
6. When the PR is closed or merged, the `.github/workflows/cleanup-preview.yml` workflow deletes
   the preview channel

### Preview Channel Features

- **Unique URLs**: Each PR gets its own preview URL like
  `https://w1aw-schedule-76a82--pr-123-RANDOM.web.app`
- **Automatic Expiration**: Preview channels expire after 7 days
- **Web Only**: Preview deployments only include the web application, not Firestore rules or Cloud
  Functions. The preview will connect to the production Firebase services.
- **No Manual Cleanup Needed**: Channels are automatically deleted when PRs are closed

### Security Considerations

Since preview channels connect to the production Firebase project:

- Firestore security rules still apply
- Authentication is required for protected features
- Preview deployments cannot modify Firestore rules or deploy new Cloud Functions
- Test data created in previews will be in the production database (use with care)

### Manual Preview Channel Management

If needed, you can manually manage preview channels using the Firebase CLI:

```bash
# List all preview channels
firebase hosting:channel:list --project w1aw-schedule-76a82

# Create a preview channel manually
firebase hosting:channel:deploy CHANNEL_NAME --project w1aw-schedule-76a82

# Delete a preview channel
firebase hosting:channel:delete CHANNEL_NAME --project w1aw-schedule-76a82 --force
```

## Additional Resources

- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions OIDC Integration](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Firebase Deployment with GitHub Actions](https://firebase.google.com/docs/hosting/github-integration)
- [Firebase Hosting Preview Channels](https://firebase.google.com/docs/hosting/test-preview-deploy)
