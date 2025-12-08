# W1AW Schedule - GitHub Copilot Instructions

## Project Overview

This is the W1AW/0 Colorado Scheduler application for scheduling amateur radio operators during ARRL America250 Worked All States events. The application consists of:

- **Frontend**: Angular 20+ single-page application with Angular Material UI
- **Backend**: Firebase Cloud Functions (Node.js 22, TypeScript)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Authentication (including Discord OAuth)
- **Hosting**: Firebase Hosting with GitHub Actions deployment

## Technology Stack

### Frontend (web/)
- Angular 20+ with TypeScript 5.9
- Angular Material for UI components
- RxJS for reactive programming
- Firebase SDK for client-side operations
- Karma/Jasmine for testing

### Backend (functions/)
- TypeScript 5.9 compiled to JavaScript
- Firebase Cloud Functions (2nd gen)
- Firebase Admin SDK
- Mocha for testing
- ESLint with Google style guide
- Express.js for HTTP endpoints

### Database (firestore/)
- Firestore security rules
- Firestore indexes

## Code Style and Conventions

### TypeScript/JavaScript
- **Indentation**: 2 spaces (enforced by .editorconfig)
- **Quotes**: Single quotes for imports/strings
- **Line length**: 80 characters maximum (functions/)
- **Semicolons**: Required
- Use Prettier for formatting with import sorting plugin
- Follow strict TypeScript configuration (strict mode enabled)

### Angular Specifics
- Use standalone components (modern Angular pattern)
- Enable strict templates and injection parameters
- Use signals and modern Angular features where appropriate
- Follow Angular style guide for component/service naming

### Firebase Functions
- Use double quotes (enforced by ESLint Google style)
- Export named functions for callable/HTTP functions
- Use async/await for asynchronous operations
- Handle errors with proper HTTP status codes

## Project Structure

```
/web/               - Angular frontend application
  /src/
    /app/           - Application components and services
      /agenda/      - User's personal agenda view
      /approval-tabs/ - Admin approval interface
      /authentication/ - Auth service and guards
      /avatar/      - User avatar components
      /event-info/  - Event information service
      /home/        - Home page component
      /login/       - Login components
      /schedule/    - Schedule grid and shift components
      /user-settings/ - User profile settings
    /assets/        - Static assets
    /environments/  - Environment configurations

/functions/         - Firebase Cloud Functions
  /src/
    calendar.ts     - iCal calendar generation
    deleteUser.ts   - User deletion cleanup
    discordOAuth.ts - Discord OAuth integration
    initShifts.ts   - Shift initialization
    newUser.ts      - New user setup
    syncEmailVerification.ts - Email verification sync
    userStatusChanged.ts - User approval workflow
    validateFirebaseToken.ts - Token validation middleware

/firestore/         - Firestore configuration
  firestore.rules   - Security rules
  firestore.indexes.json - Database indexes
```

## Multi-Event Support

The application supports multiple events with separate schedules:

- Each event has a unique ID and user-friendly slug
- Routes use slugs: `/events/:slug/schedule`, `/events/:slug/agenda`
- Default event (Colorado): ID `jZbFyscc23zjkEGRuPAI`, slug `usa250-co-may`
- Services accept optional `eventId` parameter defaulting to Colorado event
- See MULTI_EVENT_SUPPORT.md for detailed architecture

## Building and Testing

### Frontend
```bash
cd web/
npm install
npm start              # Development server (localhost:4200)
npm run build          # Production build
npm test               # Run tests with Karma
```

### Backend Functions
```bash
cd functions/
npm install
npm run build          # Compile TypeScript
npm run lint           # Run ESLint
npm test               # Run Mocha tests
npm run serve          # Local emulator
```

### Firestore Rules
```bash
cd firestore/
npm install
npm test               # Test security rules with emulator
```

## Common Development Tasks

### Adding a New Component
- Use Angular CLI: `ng generate component component-name`
- Place in appropriate feature directory under `/web/src/app/`
- Use standalone: true in component decorator
- Follow existing naming patterns

### Adding a New Cloud Function
- Create new file in `/functions/src/`
- Export named function with appropriate trigger (onCall, onRequest, etc.)
- Import and export in `/functions/src/index.ts`
- Update TypeScript strict types
- Add corresponding tests in `/functions/test/`

### Modifying Firestore Security Rules
- Edit `/firestore/firestore.rules`
- Write tests in `/firestore/test/`
- Run tests with `npm test` before deploying
- Consider multi-event admin permissions

### Working with User Authentication
- Use `AuthenticationService` for auth state
- Check admin status with `userIsAdmin(eventId?)`
- User profiles stored in `users/{uid}` collection
- Approval status managed via `approvalStatus` field

## Deployment

The application uses GitHub Actions for automated deployment:

- **Workflow**: `.github/workflows/deploy.yml`
- **Authentication**: Workload Identity Federation (no service account keys)
- **Triggers**: Push to `main` branch or manual workflow dispatch
- See DEPLOYMENT.md for detailed WIF setup

## Firebase Configuration

### Environment Variables (Functions)
```bash
firebase functions:config:set discord.client_id="..."
firebase functions:config:set discord.client_secret="..."
firebase functions:config:set discord.redirect_uri="..."
```

### Required Firebase Products
- Authentication (Email/Password, Discord OAuth)
- Firestore Database
- Cloud Functions (2nd generation)
- Hosting
- Extension: firebase/firestore-send-email (with SendGrid)

## Important Notes

- **Node Version**: 22 (specified in .nvmrc and package.json engines)
- **Default Event**: Code defaults to Colorado event for backward compatibility
- **User Settings**: Global across all events (not event-specific)
- **Admin Permissions**: Event-specific (admins manage only their events)
- **Security**: Never commit secrets or API keys
- **Testing**: Run existing tests before making changes to ensure baseline

## Key Constants and Shared Code

- Event IDs and constants in `/functions/src/shared-constants.ts`
- Colorado default event ID: `jZbFyscc23zjkEGRuPAI`
- Time slots and bands defined per event in Firestore

## Getting Help

- Review README.md for development server setup
- Check DEPLOYMENT.md for deployment configuration
- See MULTI_EVENT_SUPPORT.md for multi-event architecture
- Examine existing code patterns before implementing new features
- Follow Angular and Firebase best practices
