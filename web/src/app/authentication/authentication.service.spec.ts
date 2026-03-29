import { TestBed } from '@angular/core/testing';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AUTH, FUNCTIONS } from '../firebase-rxjs';
import { EventInfoService } from '../event-info/event-info.service';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    const authMock = {
      onAuthStateChanged: () => () => {},
    } as unknown as Auth;
    const functionsMock = {} as Functions;
    const firestoreMock = {} as Firestore;
    const routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };
    const activatedRouteMock = {
      snapshot: { queryParams: {} },
    };
    const eventInfoServiceMock = {
      getAdminList: () => of([]),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthenticationService,
        { provide: AUTH, useValue: authMock },
        { provide: FUNCTIONS, useValue: functionsMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
      ],
    });
    service = TestBed.inject(AuthenticationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
