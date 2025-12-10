import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, of } from 'rxjs';

import { UserSettingsComponent } from './user-settings.component';
import { UserSettingsService } from './user-settings.service';
import { AuthenticationService } from '../authentication/authentication.service';

describe('UserSettingsComponent', () => {
  let component: UserSettingsComponent;
  let fixture: ComponentFixture<UserSettingsComponent>;

  beforeEach(async () => {
    const authMock = {} as Auth;
    const firestoreMock = {} as Firestore;
    const userSettingsServiceMock = {
      settings$: new BehaviorSubject({}),
      init: () => {},
      getAllEvents: () => of([]),
      getUserEventApprovals: () => of([]),
      set: () => of(undefined),
      applyForEvent: () => of(undefined),
      withdrawFromEvent: () => of(undefined),
      initiateDiscordOAuth: () => of({ authUrl: 'https://example.com' }),
      disconnectDiscord: () => of(undefined),
    };
    const authServiceMock = {
      user$: new BehaviorSubject(null),
      sendVerificationEmail: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [UserSettingsComponent],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: authMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
        { provide: AuthenticationService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
