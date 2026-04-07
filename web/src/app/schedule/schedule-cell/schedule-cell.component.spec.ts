import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AUTH, FUNCTIONS } from '../../firebase-rxjs';
import { AuthenticationService } from '../../authentication/authentication.service';
import { EventInfoService } from '../../event-info/event-info.service';
import { UserSettingsService } from '../../user-settings/user-settings.service';
import { ScheduleService } from '../schedule.service';
import { ScheduleCellComponent } from './schedule-cell.component';

describe('ScheduleCellComponent', () => {
  let component: ScheduleCellComponent;
  let fixture: ComponentFixture<ScheduleCellComponent>;

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
    const scheduleServiceMock = {
      findShift: jasmine.createSpy('findShift').and.returnValue(of(undefined)),
    };
    const userSettingsServiceMock = {
      userSettings$: new BehaviorSubject(null),
      settings$: new BehaviorSubject(null),
      init: jasmine.createSpy('init'),
      getApprovedUsers: jasmine
        .createSpy('getApprovedUsers')
        .and.returnValue(of([])),
      getUserEventApproval: jasmine
        .createSpy('getUserEventApproval')
        .and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [ScheduleCellComponent],
      providers: [
        { provide: AUTH, useValue: authMock },
        { provide: FUNCTIONS, useValue: functionsMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isNotAllowed', () => {
    it('should return true for 30m phone', () => {
      component.band = '30';
      component.mode = 'phone';
      expect(component.isNotAllowed()).toBeTrue();
    });

    it('should return false for 30m cw', () => {
      component.band = '30';
      component.mode = 'cw';
      expect(component.isNotAllowed()).toBeFalse();
    });

    it('should return false for 20m phone', () => {
      component.band = '20';
      component.mode = 'phone';
      expect(component.isNotAllowed()).toBeFalse();
    });
  });

  describe('buttonDisabled', () => {
    it('should be disabled for 30m phone regardless of other conditions', () => {
      component.band = '30';
      component.mode = 'phone';
      expect(component.buttonDisabled()).toBeTrue();
    });
  });
});
