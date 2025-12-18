# Shared Module

This directory contains the shared constants, types, and utilities used by both the web application and Firebase Cloud Functions.

## Structure

```
shared/
├── src/
│   ├── index.ts                # Main export file
│   └── shared-constants.ts     # Shared constants and types
├── build/                      # Compiled output (git-ignored)
├── package.json                # Package configuration
└── tsconfig.json               # TypeScript configuration
```

## Usage

The shared module is referenced as a local file dependency in both `web/package.json` and `functions/package.json`:

```json
{
  "dependencies": {
    "w1aw-schedule-shared": "file:../shared"
  }
}
```

### In Web Application

```typescript
import { EventInfo, Shift, BANDS, MODES } from 'w1aw-schedule-shared';
```

### In Cloud Functions

```typescript
import { EventInfo, Shift, BANDS, MODES } from 'w1aw-schedule-shared';
```

## Development

### Building

The shared module must be built before building the web app or functions:

```bash
cd shared
npm install
npm run build
```

This compiles the TypeScript files to JavaScript in the `build/` directory.

### Watch Mode

For continuous development:

```bash
cd shared
npm run watch
```

## CI/CD

The GitHub Actions workflows automatically:

1. Build the shared module first
2. Use the built artifacts for web builds
3. For functions deployment, the Firebase predeploy script:
   - Builds and packs the shared module into a tarball
   - Installs the tarball as a real package (not a symlink)
   - Builds the functions code

This ensures the shared module is properly bundled with the functions when deploying to Cloud Functions.

See `.github/workflows/test-shared.yml` and `.github/workflows/deploy.yml` for details.

## Deployment to Cloud Functions

When deploying to Firebase Cloud Functions, the shared module must be packaged as a tarball rather than using a symlink. This is because Firebase only uploads the `functions` directory, and symlinks to `../shared` would be broken in the cloud environment.

The `functions/prepare-deploy.sh` script handles this automatically:
1. Builds the shared module
2. Creates a tarball with `npm pack`
3. Installs the tarball into `functions/node_modules` as a real package
4. Builds the functions code

This predeploy script is automatically run by Firebase CLI before deployment (configured in `firebase.json`).

## Type Safety

The shared module uses a `GenericTimestamp` interface that is compatible with both:
- `firebase/firestore` Timestamp (used in web)
- `firebase-admin/firestore` Timestamp (used in functions)

This ensures type safety across both environments without requiring separate type definitions.

## Exports

The shared module exports:

### Constants
- `TWO_HOURS_IN_MS` - Duration constant for 2-hour time slots
- `MODES` - Operating modes array (phone, cw, digital)
- `BANDS` - Amateur radio bands array (LF, HF, VHF/UHF)
- `LF_BANDS`, `LOW_HF_BANDS`, `HI_HF_BANDS`, `VHF_UHF_BANDS` - Band groups
- `SUPER_ADMIN_ID` - Super admin user ID with full system access

### Types
- `EventInfo` - Event information structure
- `EventInfoWithId` - Event info with ID field
- `UserSettings` - User profile settings
- `EventApproval` - User approval status
- `Shift` - Schedule shift information
- `GenericTimestamp` - Compatible timestamp interface

### Functions
- `shiftId(shift)` - Generate unique ID for a shift
