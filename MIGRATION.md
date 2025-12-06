# Section to Event Migration Guide

## Overview

This document describes the migration from "section" terminology to "event" terminology throughout the codebase. This change provides more accurate naming while maintaining backward compatibility with existing Firestore data.

## What Changed

### Code Changes

1. **Directory Renamed**: `web/src/app/section-info/` → `web/src/app/event-info/`
2. **Service Renamed**: `SectionInfoService` → `EventInfoService`
3. **Interface Renamed**: `SectionInfo` → `EventInfo` (in both `web/src/app/schedule/shared-constants.ts` and `functions/src/shared-constants.ts`)
4. **Service Methods**: All methods updated to use "event" terminology
5. **Imports**: All imports updated throughout the codebase

### Firestore Migration Strategy

To ensure zero downtime and maintain compatibility with existing data, we implemented dual-read/write logic:

#### Read Operations
- Try reading from the new `events` collection first
- If not found or if an error occurs, fall back to the legacy `sections` collection
- This ensures data can be accessed regardless of which collection it's in

#### Write Operations  
- Write to both `sections` (legacy) and `events` (new) collections
- Both writes are executed, with errors suppressed to ensure resilience
- This ensures data is available in both collections during the transition

### Affected Files

#### Web Application
- `web/src/app/event-info/event-info.service.ts` (renamed from section-info)
- `web/src/app/event-info/event-info.service.spec.ts` (renamed from section-info)
- `web/src/app/authentication/authentication.service.ts`
- `web/src/app/schedule/schedule.service.ts`
- `web/src/app/schedule/shared-constants.ts`

#### Cloud Functions
- `functions/src/calendar.ts`
- `functions/src/deleteUser.ts`
- `functions/src/initShifts.ts`
- `functions/src/newUser.ts`
- `functions/src/userStatusChanged.ts`
- `functions/src/shared-constants.ts`

## Migration TODOs

All temporary migration code is marked with `TODO` comments for easy identification. Search for:
```
TODO: Remove dual-read/write logic after Firestore collection rename migration is complete
```

### Future Cleanup Steps

Once the Firestore `sections` collection has been renamed to `events` (or data has been fully migrated):

1. Remove all dual-read logic (fallback to `sections` collection)
2. Remove all dual-write logic (writes to `sections` collection)
3. Remove the backwards-compatible `SectionInfo` interface from `functions/src/shared-constants.ts`
4. Simplify all Firestore access code to only reference the `events` collection
5. Update this document to reflect completion of migration

## Testing

### Build Status
- ✅ Web application builds successfully
- ✅ Cloud functions build successfully
- ✅ Linting passes with no errors

### Test Status
- ⚠️ Web tests require Firebase mock setup (pre-existing issue)
- ⚠️ Function tests require Firestore emulator (pre-existing issue)

## Backward Compatibility

The migration maintains full backward compatibility:
- Existing code reading from `sections` collection continues to work
- New code can read from either `sections` or `events` collections
- All writes go to both collections, ensuring data consistency
- The `SectionInfo` interface is maintained as an alias for `EventInfo` in functions code

## Current State

As of this migration:
- All code references use "event" terminology
- All Firestore operations use dual-read/write logic
- The `sections` collection is still the primary data source
- Documentation has been updated to explain the migration

## Notes

- The README mentions that "Colorado section" refers to the ARRL Colorado Section, which is the correct terminology in that context (organizational unit, not the code terminology)
- Firestore collection renaming is a manual operation that requires careful planning and should be done during a maintenance window
- The dual-read/write approach ensures no data loss and no downtime during migration
