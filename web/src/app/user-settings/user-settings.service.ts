import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  collectionGroup,
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
  firstValueFrom,
  from,
  mergeMap,
  of,
} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import {
  EventApproval,
  EventInfoWithId,
} from '../schedule/shared-constants';

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
      .subscribe((settings) => {
        if (settings) {
          this.settings$.next(settings);
        } else {
          this.createUserDocument();
        }
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
    const eventsCol = collection(this.firestore, 'events');
    return collectionData(eventsCol, { idField: 'id' }) as Observable<
      EventInfoWithId[]
    >;
  }

  // Get user's event approvals across all events
  public getUserEventApprovals(): Observable<
    (EventApproval & { eventId: string })[]
  > {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of([]);
        }
        const approvalsCol = collection(
          this.firestore,
          `users/${user.uid}/eventApprovals`,
        );
        return collectionData(approvalsCol, { idField: 'eventId' }) as Observable<
          (EventApproval & { eventId: string })[]
        >;
      }),
    );
  }

  // Apply for an event (create eventApproval document)
  public applyForEvent(eventId: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(
          this.firestore,
          `users/${user.uid}/eventApprovals/${eventId}`,
        );
        return from(
          setDoc(docRef, {
            status: 'Applied',
            appliedAt: Timestamp.now(),
          }),
        );
      }),
    );
  }

  // Withdraw from an event (delete eventApproval document)
  public withdrawFromEvent(eventId: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(
          this.firestore,
          `users/${user.uid}/eventApprovals/${eventId}`,
        );
        return from(deleteDoc(docRef));
      }),
    );
  }

  // Admin only - Query event approvals by status for a specific event
  private getEventApprovalsByStatus(
    eventId: string,
    status: 'Applied' | 'Approved' | 'Declined',
  ): Observable<UserSettings[]> {
    // Use collection group query to get all users' approvals
    const approvalsGroup = collectionGroup(this.firestore, 'eventApprovals');
    const q = query(approvalsGroup, where('status', '==', status));

    return collectionSnapshots(q).pipe(
      switchMap((snapshots) => {
        // Filter for this specific event and extract user IDs
        const userIds = snapshots
          .filter((snapshot) => snapshot.id === eventId)
          .map((snapshot) => {
            // Extract userId from the path: users/{userId}/eventApprovals/{eventId}
            const pathParts = snapshot.ref.path.split('/');
            // Validate path structure
            if (
              pathParts.length !== 4 ||
              pathParts[0] !== 'users' ||
              pathParts[2] !== 'eventApprovals'
            ) {
              throw new Error(`Invalid approval document path: ${snapshot.ref.path}`);
            }
            return pathParts[1];
          });

        if (userIds.length === 0) {
          return of([]);
        }

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
          Promise.all(
            userObservables.map((obs) => firstValueFrom(obs)),
          ),
        );
      }),
    );
  }

  // Admin only
  public getProvisionalUsers(eventId?: string): Observable<UserSettings[]> {
    if (eventId) {
      return this.getEventApprovalsByStatus(eventId, 'Applied');
    }
    // Legacy: fallback to global status for backward compatibility
    return this.getUsersByStatus('Provisional');
  }

  // Admin only
  public getApprovedUsers(eventId?: string): Observable<UserSettings[]> {
    if (eventId) {
      return this.getEventApprovalsByStatus(eventId, 'Approved');
    }
    // Legacy: fallback to global status for backward compatibility
    return this.getUsersByStatus('Approved');
  }

  // Admin only
  public getDeclinedUsers(eventId?: string): Observable<UserSettings[]> {
    if (eventId) {
      return this.getEventApprovalsByStatus(eventId, 'Declined');
    }
    // Legacy: fallback to global status for backward compatibility
    return this.getUsersByStatus('Declined');
  }

  private getUsersByStatus(status: string): Observable<UserSettings[]> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, where('status', '==', status));
    return collectionData(q, { idField: 'id' }) as Observable<UserSettings[]>;
  }

  // Admin only - Approve user for a specific event
  public approve(userId: string, eventId?: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;

    if (eventId) {
      // Per-event approval
      const docRef = doc(
        this.firestore,
        `users/${userId}/eventApprovals/${eventId}`,
      );
      return from(
        updateDoc(docRef, {
          status: 'Approved',
          approvedBy: adminId,
          statusChangedAt: Timestamp.now(),
        }),
      );
    }

    // Legacy: global approval for backward compatibility
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        status: 'Approved',
        approvedBy: adminId,
      }),
    );
  }

  // Admin only - Decline user for a specific event
  public decline(userId: string, eventId?: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;

    if (eventId) {
      // Per-event decline
      const docRef = doc(
        this.firestore,
        `users/${userId}/eventApprovals/${eventId}`,
      );
      return from(
        updateDoc(docRef, {
          status: 'Declined',
          declinedBy: adminId,
          statusChangedAt: Timestamp.now(),
        }),
      );
    }

    // Legacy: global decline for backward compatibility
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        status: 'Declined',
        declinedBy: adminId,
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
