import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AUTH, FUNCTIONS } from './firebase-rxjs';

// Initialize the Firebase app singleton before any DI factories run.
// Guard against re-initialization (e.g. HMR, test environments).
if (!getApps().length) {
  initializeApp(environment.firebase);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    { provide: AUTH, useFactory: getAuth },
    { provide: Firestore, useFactory: getFirestore },
    { provide: FUNCTIONS, useFactory: getFunctions },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
  ],
};
