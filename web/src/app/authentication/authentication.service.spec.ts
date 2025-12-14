import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

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
        { provide: Auth, useValue: authMock },
        { provide: Functions, useValue: functionsMock },
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
