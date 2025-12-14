import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { Firestore } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { EventInfoService } from '../event-info/event-info.service';
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
      navigate: jasmine.createSpy('navigate'),
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
        { provide: Auth, useValue: authMock },
        { provide: Functions, useValue: functionsMock },
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
