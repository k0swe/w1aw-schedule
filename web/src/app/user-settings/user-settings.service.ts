import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  collectionSnapshots,
  deleteDoc,
  doc,
  docData,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  firstValueFrom,
  from,
  mergeMap,
  of,
} from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventApproval, EventInfoWithId } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  private authService = inject(AuthenticationService);
  private firestore = inject(Firestore);
  private httpClient = inject(HttpClient);

  settings$ = new BehaviorSubject<UserSettings>({});
  started = false;

  public init(): void {
    if (this.started) {
      console.log('[UserSettingsService] Already initialized, skipping');
      return;
    }
    console.log(
      '[UserSettingsService] Initializing user settings subscription...',
    );
    this.started = true;
    this.authService.user$
      .pipe(
        switchMap((user) => {
          if (user == null) {
            console.log('[UserSettingsService] No user logged in');
            return of(undefined);
          }
          console.log(
            '[UserSettingsService] Querying user document for:',
            user.uid,
          );
          const docRef = doc(this.firestore, 'users', user.uid);
          return docData(docRef) as Observable<UserSettings | undefined>;
        }),
      )
      .subscribe({
        next: (settings) => {
          if (settings) {
            console.log(
              '[UserSettingsService] Successfully loaded user settings',
            );
            this.settings$.next(settings);
          } else {
            console.log(
              '[UserSettingsService] No settings found, creating user document',
            );
            this.createUserDocument();
          }
        },
        error: (error) => {
          console.error(
            '[UserSettingsService] Error loading user settings:',
            error,
          );
        },
      });
  }

  private createUserDocument(): void {
    const u = this.authService.user$.getValue();
    if (!u) {
      return;
    }
    const docRef = doc(this.firestore, 'users', u.uid);
    setDoc(docRef, {
      email: u.email || '',
      name: u.displayName || '',
      status: 'Provisional',
    });
  }

  public settings(): Observable<UserSettings> {
    return this.settings$;
  }

  set(values: UserSettings): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(this.firestore, 'users', user.uid);
        return from(updateDoc(docRef, { ...values }));
      }),
    );
  }

  // Get all events from Firestore
  public getAllEvents(): Observable<EventInfoWithId[]> {
    console.log('[UserSettingsService] Querying events collection...');
    const eventsCol = collection(this.firestore, 'events');
    return collectionData(eventsCol, { idField: 'id' }).pipe(
      map((events) => {
        console.log(
          '[UserSettingsService] Events query successful:',
          events.length,
        );
        return events as EventInfoWithId[];
      }),
    );
  }

  // Get user's approval for a specific event
  public getUserEventApproval(
    eventId: string,
  ): Observable<EventApproval | undefined> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(
          this.firestore,
          `events/${eventId}/approvals/${user.uid}`,
        );
        return (docData(docRef) as Observable<EventApproval | undefined>).pipe(
          catchError((error) => {
            console.log(
              `[UserSettingsService] No access to approval for event ${eventId}:`,
              error.code || error.message,
            );
            return of(undefined);
          }),
        );
      }),
    );
  }

  // Get all events where the user has applied/been approved
  // Note: This performs N+1 queries (1 for events, N for approvals) which is acceptable
  // for the expected small number of events. Alternative would be to maintain a
  // separate index collection, but that adds complexity and data duplication.
  public getUserEventApprovals(): Observable<
    (EventApproval & { eventId: string })[]
  > {
    console.log('[UserSettingsService] Starting getUserEventApprovals...');
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          console.log(
            '[UserSettingsService] No user logged in, returning empty array',
          );
          return of([]);
        }
        console.log('[UserSettingsService] User ID:', user.uid);
        // Get all events
        return this.getAllEvents().pipe(
          switchMap((events) => {
            console.log(
              '[UserSettingsService] Fetched',
              events.length,
              'events',
            );
            if (events.length === 0) {
              return of([]);
            }
            // For each event, try to get the user's approval
            const approvalObservables = events.map((event) => {
              console.log(
                `[UserSettingsService] Querying approval for event ${event.id}...`,
              );
              const docRef = doc(
                this.firestore,
                `events/${event.id}/approvals/${user.uid}`,
              );
              return docData(docRef).pipe(
                map((approval) => {
                  if (approval) {
                    console.log(
                      `[UserSettingsService] Found approval for event ${event.id}`,
                    );
                    return {
                      ...(approval as EventApproval),
                      eventId: event.id,
                    };
                  }
                  console.log(
                    `[UserSettingsService] No approval found for event ${event.id}`,
                  );
                  return null;
                }),
                catchError((error) => {
                  // Handle permission errors gracefully (document doesn't exist or no access)
                  console.log(
                    `[UserSettingsService] No access to approval for event ${event.id}:`,
                    error.code || error.message,
                  );
                  return of(null);
                }),
              );
            });
            // Combine all observables and filter out nulls
            // Using combineLatest keeps the observable alive and reactive to changes
            if (approvalObservables.length === 0) {
              return of([]);
            }
            return combineLatest(approvalObservables).pipe(
              map((approvals) => {
                const filtered = approvals.filter(
                  (a) => a !== null,
                ) as (EventApproval & {
                  eventId: string;
                })[];
                console.log(
                  '[UserSettingsService] Found',
                  filtered.length,
                  'total approvals',
                );
                return filtered;
              }),
            );
          }),
        );
      }),
    );
  }

  // Apply for an event (create approval document)
  public applyForEvent(eventId: string): Observable<void> {
    console.log('[UserSettingsService] Applying for event:', eventId);
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          console.error(
            '[UserSettingsService] Cannot apply - no user logged in',
          );
          return of(undefined);
        }
        console.log('[UserSettingsService] User ID:', user.uid);
        console.log(
          '[UserSettingsService] Creating approval document at path:',
          `events/${eventId}/approvals/${user.uid}`,
        );
        const docRef = doc(
          this.firestore,
          `events/${eventId}/approvals/${user.uid}`,
        );
        const timestamp = Timestamp.now();
        const approvalData = {
          status: 'Applied',
          appliedAt: timestamp,
          userId: user.uid, // Store userId as a field for easier querying
        };
        console.log('[UserSettingsService] Approval data:', approvalData);
        console.log(
          '[UserSettingsService] Timestamp seconds:',
          timestamp.seconds,
          'nanoseconds:',
          timestamp.nanoseconds,
        );
        return from(setDoc(docRef, approvalData)).pipe(
          map(() => {
            console.log(
              '[UserSettingsService] Successfully applied for event:',
              eventId,
            );
          }),
          catchError((error) => {
            console.error(
              '[UserSettingsService] Error applying for event:',
              eventId,
              error,
            );
            console.error('[UserSettingsService] Error code:', error.code);
            console.error(
              '[UserSettingsService] Error message:',
              error.message,
            );
            throw error; // Re-throw so component can handle it
          }),
        );
      }),
    );
  }

  // Withdraw from an event (delete approval document)
  public withdrawFromEvent(eventId: string): Observable<void> {
    console.log('[UserSettingsService] Withdrawing from event:', eventId);
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          console.error(
            '[UserSettingsService] Cannot withdraw - no user logged in',
          );
          return of(undefined);
        }
        console.log('[UserSettingsService] User ID:', user.uid);
        console.log(
          '[UserSettingsService] Deleting approval document at path:',
          `events/${eventId}/approvals/${user.uid}`,
        );
        const docRef = doc(
          this.firestore,
          `events/${eventId}/approvals/${user.uid}`,
        );
        return from(deleteDoc(docRef)).pipe(
          map(() => {
            console.log(
              '[UserSettingsService] Successfully withdrew from event:',
              eventId,
            );
          }),
          catchError((error) => {
            console.error(
              '[UserSettingsService] Error withdrawing from event:',
              eventId,
              error,
            );
            console.error('[UserSettingsService] Error code:', error.code);
            console.error(
              '[UserSettingsService] Error message:',
              error.message,
            );
            throw error; // Re-throw so component can handle it
          }),
        );
      }),
    );
  }

  // Admin only - Query event approvals by status for a specific event
  private getEventApprovalsByStatus(
    eventId: string,
    status: 'Applied' | 'Approved' | 'Declined',
  ): Observable<UserSettings[]> {
    // Query the approvals collection directly under the event
    const approvalsCol = collection(
      this.firestore,
      `events/${eventId}/approvals`,
    );
    const q = query(approvalsCol, where('status', '==', status));

    return collectionSnapshots(q).pipe(
      switchMap((snapshots) => {
        if (snapshots.length === 0) {
          return of([]);
        }

        // Extract user IDs from the document IDs (which are the userIds)
        const userIds = snapshots.map((snapshot) => snapshot.id);

        // Get user details for each userId
        const userObservables = userIds.map((userId) => {
          const userDocRef = doc(this.firestore, 'users', userId);
          return docData(userDocRef).pipe(
            map((userData) => ({
              ...(userData as UserSettings),
              id: userId,
            })),
          );
        });

        // Combine all user observables
        return from(
          Promise.all(userObservables.map((obs) => firstValueFrom(obs))),
        );
      }),
    );
  }

  // Admin only - Get users who have applied for a specific event
  public getProvisionalUsers(eventId: string): Observable<UserSettings[]> {
    return this.getEventApprovalsByStatus(eventId, 'Applied');
  }

  // Admin only - Get users approved for a specific event
  public getApprovedUsers(eventId: string): Observable<UserSettings[]> {
    return this.getEventApprovalsByStatus(eventId, 'Approved');
  }

  // Admin only - Get users declined for a specific event
  public getDeclinedUsers(eventId: string): Observable<UserSettings[]> {
    return this.getEventApprovalsByStatus(eventId, 'Declined');
  }

  // Admin only - Approve user for a specific event
  public approve(userId: string, eventId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;

    const docRef = doc(this.firestore, `events/${eventId}/approvals/${userId}`);
    return from(
      updateDoc(docRef, {
        status: 'Approved',
        approvedBy: adminId,
        statusChangedAt: Timestamp.now(),
      }),
    );
  }

  // Admin only - Decline user for a specific event
  public decline(userId: string, eventId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;

    const docRef = doc(this.firestore, `events/${eventId}/approvals/${userId}`);
    return from(
      updateDoc(docRef, {
        status: 'Declined',
        declinedBy: adminId,
        statusChangedAt: Timestamp.now(),
      }),
    );
  }

  delete(userId: string): Observable<any> {
    // Call cloud function to delete user
    const url = `${environment.functionBase}/deleteUser?uid=${userId}`;
    return from(this.authService.user$.getValue()!.getIdToken(false)).pipe(
      mergeMap((jwt) => {
        return this.httpClient.post(url, null, {
          headers: { Authorization: 'Bearer ' + jwt },
        });
      }),
    );
  }

  setMultiShift(userId: string, newValue: boolean) {
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        multiShift: newValue,
      }),
    );
  }

  // Discord OAuth
  initiateDiscordOAuth(): Observable<{ authUrl: string }> {
    const url = `${environment.functionBase}/discordOAuthInitiate`;
    return from(this.authService.user$.getValue()!.getIdToken(false)).pipe(
      switchMap((jwt) => {
        return this.httpClient.get<{ authUrl: string }>(url, {
          headers: { Authorization: 'Bearer ' + jwt },
        });
      }),
    );
  }

  disconnectDiscord(): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(this.firestore, 'users', user.uid);
        return from(
          updateDoc(docRef, {
            discordId: null,
            discordUsername: null,
            discordDiscriminator: null,
            discordAvatar: null,
          }),
        );
      }),
    );
  }
}

export interface UserSettings {
  id?: string;
  callsign?: string;
  email?: string;
  emailVerified?: boolean;
  gridSquare?: string;
  name?: string;
  phone?: string;
  status?: string;
  approvedBy?: string;
  declinedBy?: string;
  multiShift?: boolean;
  arrlMemberNumber?: string;
  discordUsername?: string;
  discordId?: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
}
