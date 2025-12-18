import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { EventInfoWithId } from 'w1aw-schedule-shared';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { ScheduleService } from '../schedule/schedule.service';
import { AgendaComponent } from './agenda.component';

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;

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
      paramMap: of(convertToParamMap({ slug: 'test-slug' })),
      snapshot: { queryParams: {} },
    };

    const mockEventInfo: EventInfoWithId = {
      id: 'test-id',
      slug: 'test-slug',
      name: 'Test Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      eventCallsign: 'W1AW/0',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    const eventInfoServiceMock = {
      getAdminList: () => of([]),
      getEventBySlug: () => of(mockEventInfo),
      getEventInfo: () => of(mockEventInfo),
    };
    const scheduleServiceMock = {
      findUserShifts: jasmine
        .createSpy('findUserShifts')
        .and.returnValue(of([])),
    };
    const authenticationServiceMock = {
      user$: new BehaviorSubject(null),
    };

    await TestBed.configureTestingModule({
      imports: [AgendaComponent],
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: Functions, useValue: functionsMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: AuthenticationService, useValue: authenticationServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
