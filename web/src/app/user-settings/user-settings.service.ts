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
import {
  EventApproval,
  EventInfoWithId,
  UserSettings,
} from 'w1aw-schedule-shared';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';

// Re-export UserSettings for backward compatibility
export { UserSettings } from 'w1aw-schedule-shared';

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
      return;
    }
    this.started = true;
    this.authService.user$
      .pipe(
        switchMap((user) => {
          if (user == null) {
            return of(undefined);
          }
          const docRef = doc(this.firestore, 'users', user.uid);
          return docData(docRef) as Observable<UserSettings | undefined>;
        }),
      )
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.settings$.next(settings);
          } else {
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
    const eventsCol = collection(this.firestore, 'events');
    return collectionData(eventsCol, { idField: 'id' }) as Observable<
      EventInfoWithId[]
    >;
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
          catchError(() => {
            // Handle permission errors gracefully (document doesn't exist or no access)
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
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of([]);
        }
        // Get all events
        return this.getAllEvents().pipe(
          switchMap((events) => {
            if (events.length === 0) {
              return of([]);
            }
            // For each event, try to get the user's approval
            const approvalObservables = events.map((event) => {
              const docRef = doc(
                this.firestore,
                `events/${event.id}/approvals/${user.uid}`,
              );
              return docData(docRef).pipe(
                map((approval) => {
                  if (approval) {
                    return {
                      ...(approval as EventApproval),
                      eventId: event.id,
                    };
                  }
                  return null;
                }),
                catchError(() => {
                  // Handle permission errors gracefully (document doesn't exist or no access)
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
                return approvals.filter((a) => a !== null) as (EventApproval & {
                  eventId: string;
                })[];
              }),
            );
          }),
        );
      }),
    );
  }

  // Apply for an event (create approval document)
  public applyForEvent(eventId: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(
          this.firestore,
          `events/${eventId}/approvals/${user.uid}`,
        );
        const approvalData = {
          status: 'Applied',
          appliedAt: Timestamp.now(),
          userId: user.uid, // Store userId as a field for easier querying
        };
        return from(setDoc(docRef, approvalData)).pipe(
          map(() => undefined),
          catchError((error) => {
            console.error(
              '[UserSettingsService] Error applying for event:',
              eventId,
              error,
            );
            throw error; // Re-throw so component can handle it
          }),
        );
      }),
    );
  }

  // Withdraw from an event (delete approval document)
  public withdrawFromEvent(eventId: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(
          this.firestore,
          `events/${eventId}/approvals/${user.uid}`,
        );
        return from(deleteDoc(docRef)).pipe(
          map(() => undefined),
          catchError((error) => {
            console.error(
              '[UserSettingsService] Error withdrawing from event:',
              eventId,
              error,
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
