# Migration Checklist

This checklist will help you migrate from service account keys to Workload Identity Federation.

## Pre-Migration

- [ ] Review the [DEPLOYMENT.md](DEPLOYMENT.md) documentation
- [ ] Ensure you have admin access to the Google Cloud project (`w1aw-schedule-76a82`)
- [ ] Ensure you have admin access to the GitHub repository
- [ ] Have `gcloud` CLI installed and authenticated

## Setup Steps

Follow these steps in order:

### Google Cloud Setup

1. [ ] Enable IAM Credentials API
   ```bash
   gcloud services enable iamcredentials.googleapis.com --project=w1aw-schedule-76a82
   ```

2. [ ] Create service account
   ```bash
   gcloud iam service-accounts create github-actions-deploy \
     --display-name="GitHub Actions Deployment" \
     --project=w1aw-schedule-76a82
   ```

3. [ ] Grant IAM roles to service account
   - [ ] Firebase Hosting Admin: `roles/firebasehosting.admin`
   - [ ] Cloud Functions Developer: `roles/cloudfunctions.developer`
   - [ ] Cloud Run Admin: `roles/run.admin`
   - [ ] Service Account User: `roles/iam.serviceAccountUser`
   - [ ] Firebase Admin SDK Admin Service Agent: `roles/firebase.sdkAdminServiceAgent`
   - [ ] Cloud Datastore User: `roles/datastore.user`

   See [DEPLOYMENT.md](DEPLOYMENT.md) for exact commands.

4. [ ] Create workload identity pool
   ```bash
   gcloud iam workload-identity-pools create "github-actions" \
     --project="w1aw-schedule-76a82" \
     --location="global" \
     --display-name="GitHub Actions Pool"
   ```

5. [ ] Create workload identity provider
   ```bash
   gcloud iam workload-identity-pools providers create-oidc "github-provider" \
     --project="w1aw-schedule-76a82" \
     --location="global" \
     --workload-identity-pool="github-actions" \
     --display-name="GitHub Provider" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
     --issuer-uri="https://token.actions.githubusercontent.com"
   ```

6. [ ] Get project number
   ```bash
   gcloud projects describe w1aw-schedule-76a82 --format="value(projectNumber)"
   ```
   Record the project number: `_________________`

7. [ ] Bind workload identity to service account (replace PROJECT_NUMBER)
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
     "github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com" \
     --project="w1aw-schedule-76a82" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/k0swe/w1aw-schedule"
   ```

8. [ ] Get the workload identity provider resource name
   ```bash
   gcloud iam workload-identity-pools providers describe "github-provider" \
     --project="w1aw-schedule-76a82" \
     --location="global" \
     --workload-identity-pool="github-actions" \
     --format="value(name)"
   ```
   Record the full resource name: `_________________`

### GitHub Setup

9. [ ] Add `WIF_PROVIDER` secret to GitHub repository
   - Go to repository Settings → Secrets and variables → Actions
   - Add new secret named `WIF_PROVIDER`
   - Value: The full resource name from step 8 (should start with `projects/`)

10. [ ] Add `WIF_SERVICE_ACCOUNT` secret to GitHub repository
    - Add new secret named `WIF_SERVICE_ACCOUNT`
    - Value: `github-actions-deploy@w1aw-schedule-76a82.iam.gserviceaccount.com`

### Testing

11. [ ] Merge this PR to `main` branch

12. [ ] Trigger the deployment workflow manually
    - Go to Actions → Deploy → Run workflow
    - Select `main` branch
    - Click "Run workflow"

13. [ ] Monitor the workflow execution
    - [ ] Check that authentication succeeds
    - [ ] Verify deployment completes successfully
    - [ ] Test the deployed application

### Cleanup

14. [ ] Once verified working, remove the old `FIREBASE_SERVICE_ACCOUNT_W1AW_SCHEDULE` secret
    - Go to repository Settings → Secrets and variables → Actions
    - Delete `FIREBASE_SERVICE_ACCOUNT_W1AW_SCHEDULE`

15. [ ] (Optional but recommended) Disable or delete the old service account key
    - Find the old service account in Google Cloud Console
    - Disable or delete its keys
    - Note: Keep the service account itself if it's used elsewhere

## Troubleshooting

If deployment fails:

1. Check workflow logs for specific error messages
2. Verify all secrets are set correctly in GitHub
3. Confirm service account has all required IAM roles
4. Ensure workload identity binding uses the correct project number
5. Wait a few minutes for IAM changes to propagate if you just made changes

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting steps.

## Rollback Plan

If you need to rollback:

1. Revert the workflow changes in `.github/workflows/deploy.yml`
2. Restore the `firebaseServiceAccount` parameter pointing to `FIREBASE_SERVICE_ACCOUNT_W1AW_SCHEDULE`
3. Ensure the old secret still exists in GitHub
4. Trigger a deployment to verify it works

## Benefits of This Migration

✅ **More secure**: No long-lived credentials stored in GitHub
✅ **Better audit trail**: All authentication events logged in Google Cloud
✅ **Automatic rotation**: Credentials expire after 1 hour
✅ **Fine-grained access**: Only this specific repository can deploy
✅ **Industry best practice**: Recommended by both Google and GitHub
