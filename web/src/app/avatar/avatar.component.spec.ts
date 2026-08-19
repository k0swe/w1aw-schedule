import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { of } from 'rxjs';

import { EventInfoService } from '../event-info/event-info.service';
import { AUTH, FUNCTIONS } from '../firebase-rxjs';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    const authMock = {
      onAuthStateChanged: () => () => {},
    } as unknown as Auth;
    const functionsMock = {} as Functions;
    const firestoreMock = {} as Firestore;
    const routerMock = {
      navigate: vi.fn().mockName('navigate'),
    };
    const activatedRouteMock = {
      snapshot: { queryParams: {} },
    };
    const eventInfoServiceMock = {
      getAdminList: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
      providers: [
        { provide: AUTH, useValue: authMock },
        { provide: FUNCTIONS, useValue: functionsMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
