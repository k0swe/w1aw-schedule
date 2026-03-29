import { InjectionToken } from '@angular/core';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import {
  DocumentData,
  DocumentReference,
  Query,
  QueryDocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { Observable } from 'rxjs';

/**
 * Angular injection token for the Firebase Auth instance.
 * Use `inject(AUTH)` in services/components and provide it with
 * `{ provide: AUTH, useFactory: getAuth }` in your app config.
 */
export const AUTH = new InjectionToken<Auth>('firebase/auth Auth');

/**
 * Angular injection token for the Firebase Functions instance.
 * Use `inject(FUNCTIONS)` in services/components and provide it with
 * `{ provide: FUNCTIONS, useFactory: getFunctions }` in your app config.
 */
export const FUNCTIONS = new InjectionToken<Functions>(
  'firebase/functions Functions',
);

/**
 * Returns an Observable that emits the document data whenever it changes.
 * The Observable completes the Firestore listener when unsubscribed.
 */
export function docData<T = DocumentData>(
  ref: DocumentReference,
): Observable<T | undefined> {
  return new Observable((subscriber) => {
    return onSnapshot(
      ref,
      (snap) => subscriber.next(snap.data() as T | undefined),
      (err) => subscriber.error(err),
    );
  });
}

/**
 * Returns an Observable that emits an array of document data whenever the
 * collection changes. If `options.idField` is set, each document's Firestore
 * ID is added to the emitted object under that key.
 * The Observable cancels the Firestore listener when unsubscribed.
 */
export function collectionData<T = DocumentData>(
  q: Query,
  options?: { idField?: string },
): Observable<T[]> {
  return new Observable((subscriber) => {
    return onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => {
          const data = d.data() as T;
          if (options?.idField) {
            return { ...data, [options.idField]: d.id } as T;
          }
          return data;
        });
        subscriber.next(docs);
      },
      (err) => subscriber.error(err),
    );
  });
}

/**
 * Returns an Observable that emits the raw QueryDocumentSnapshot array
 * whenever the collection changes.
 * The Observable cancels the Firestore listener when unsubscribed.
 */
export function collectionSnapshots(
  q: Query,
): Observable<QueryDocumentSnapshot<DocumentData>[]> {
  return new Observable((subscriber) => {
    return onSnapshot(
      q,
      (snap) => subscriber.next(snap.docs),
      (err) => subscriber.error(err),
    );
  });
}

/**
 * Returns an Observable that emits the current Firebase Auth user (or null)
 * and updates whenever the auth state changes.
 * The Observable cancels the listener when unsubscribed.
 */
export function authState(auth: Auth): Observable<User | null> {
  return new Observable((subscriber) => {
    return onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (err) => subscriber.error(err),
    );
  });
}
