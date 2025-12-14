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
import { COLORADO_DOC_ID, EventInfo, Shift } from 'w1aw-schedule-shared';
```

### In Cloud Functions

```typescript
import { COLORADO_DOC_ID, EventInfo, Shift } from 'w1aw-schedule-shared';
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
2. Use the built artifacts for web and functions builds
3. Cache dependencies for faster builds

See `.github/workflows/test-shared.yml` and `.github/workflows/deploy.yml` for details.

## Type Safety

The shared module uses a `GenericTimestamp` interface that is compatible with both:
- `firebase/firestore` Timestamp (used in web)
- `firebase-admin/firestore` Timestamp (used in functions)

This ensures type safety across both environments without requiring separate type definitions.

## Exports

The shared module exports:

### Constants
- `TWO_HOURS_IN_MS` - Duration constant
- `MODES` - Operating modes (phone, cw, digital)
- `BANDS` - Amateur radio bands
- `COLORADO_DOC_ID` - Default event ID
- `COLORADO_SLUG` - Default event slug
- `SUPER_ADMIN_ID` - Super admin user ID

### Types
- `EventInfo` - Event information structure
- `EventInfoWithId` - Event info with ID field
- `UserSettings` - User profile settings
- `EventApproval` - User approval status
- `Shift` - Schedule shift information
- `GenericTimestamp` - Compatible timestamp interface

### Functions
- `shiftId(shift)` - Generate unique ID for a shift
