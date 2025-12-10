import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, of } from 'rxjs';

import { UserSettingsService } from './user-settings.service';
import { AuthenticationService } from '../authentication/authentication.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;

  beforeEach(() => {
    const authMock = {} as Auth;
    const firestoreMock = {} as Firestore;
    const httpClientMock = {
      get: () => of({}),
      post: () => of({}),
    };
    const authServiceMock = {
      user$: new BehaviorSubject(null),
    };

    TestBed.configureTestingModule({
      providers: [
        UserSettingsService,
        { provide: Auth, useValue: authMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: HttpClient, useValue: httpClientMock },
        { provide: AuthenticationService, useValue: authServiceMock },
      ],
    });
    service = TestBed.inject(UserSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
