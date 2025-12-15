import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { ScheduleComponent } from './schedule.component';
import { ScheduleService } from './schedule.service';
import { EventInfo } from 'w1aw-schedule-shared';

describe('ScheduleComponent', () => {
  let component: ScheduleComponent;
  let fixture: ComponentFixture<ScheduleComponent>;
  let eventInfoService: jasmine.SpyObj<EventInfoService>;
  let mockEventInfo: EventInfo;

  beforeEach(async () => {
    const authMock = {} as Auth;
    const firestoreMock = {} as Firestore;
    const functionsMock = {} as Functions;
    const scheduleServiceMock = jasmine.createSpyObj('ScheduleService', [
      'findUserShifts',
      'findShift',
    ]);
    scheduleServiceMock.findUserShifts.and.returnValue(of([]));
    scheduleServiceMock.findShift.and.returnValue(of(undefined));

    const authServiceMock = {
      user$: new BehaviorSubject({ uid: 'test-user' }),
      userIsAdmin: jasmine.createSpy('userIsAdmin').and.returnValue(of(false)),
    };

    const userSettingsServiceMock = {
      userSettings$: new BehaviorSubject(null),
      settings$: new BehaviorSubject(null),
      init: jasmine.createSpy('init'),
      getApprovedUsers: jasmine.createSpy('getApprovedUsers').and.returnValue(of([])),
      getUserEventApproval: jasmine.createSpy('getUserEventApproval').and.returnValue(of(null)),
    };

    eventInfoService = jasmine.createSpyObj('EventInfoService', [
      'getEventInfo',
      'getEventBySlug',
    ]);

    mockEventInfo = {
      name: 'Test Event',
      slug: 'test-event',
      coordinatorName: 'Test',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromDate(new Date('2026-05-27T00:00:00Z')),
      endTime: Timestamp.fromDate(new Date('2026-06-02T23:59:59Z')),
      timeZoneId: 'America/Denver',
      googleCalendarId: 'test-calendar-id',
    };
    eventInfoService.getEventInfo.and.returnValue(of(mockEventInfo));
    eventInfoService.getEventBySlug.and.returnValue(of(undefined));

    const activatedRouteMock = {
      paramMap: of(convertToParamMap({})),
      snapshot: {
        queryParams: {},
      },
    };

    await TestBed.configureTestingModule({
      imports: [ScheduleComponent],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: authMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: Functions, useValue: functionsMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: AuthenticationService, useValue: authServiceMock },
        { provide: EventInfoService, useValue: eventInfoService },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();
  });

  it('should create', (done) => {
    fixture = TestBed.createComponent(ScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async initialization
    setTimeout(() => {
      expect(component).toBeTruthy();
      done();
    }, 100);
  });

  describe('getNearestDayInEventRange', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ScheduleComponent);
      component = fixture.componentInstance;
    });

    it('should return event start date when today is before the event', () => {
      // Set event dates in the future
      component.eventStartTime = new Date('2026-05-27T00:00:00Z');
      component.eventEndTime = new Date('2026-06-02T23:59:59Z');

      // Mock today to be before the event (assuming test runs before 2026)
      const result = component['getNearestDayInEventRange']();

      // Result should be event start date normalized to midnight UTC
      const expectedDate = new Date(Date.UTC(2026, 4, 27, 0, 0, 0, 0)); // May 27, 2026
      expect(result.getTime()).toBe(expectedDate.getTime());
    });

    it('should return event end date when today is after the event', () => {
      // Set event dates in the past
      component.eventStartTime = new Date('2023-05-27T00:00:00Z');
      component.eventEndTime = new Date('2023-06-02T23:59:59Z');

      const result = component['getNearestDayInEventRange']();

      // Result should be event end date normalized to midnight UTC
      const expectedDate = new Date(Date.UTC(2023, 5, 2, 0, 0, 0, 0)); // June 2, 2023
      expect(result.getTime()).toBe(expectedDate.getTime());
    });

    it('should return today when today is during the event', () => {
      // Set event dates to span today
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      component.eventStartTime = yesterday;
      component.eventEndTime = tomorrow;

      const result = component['getNearestDayInEventRange']();

      // Result should be today normalized to midnight UTC
      const expectedDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      expect(result.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle event spanning multiple days', () => {
      // Set event dates to span a week in the past
      component.eventStartTime = new Date('2023-05-27T12:00:00Z');
      component.eventEndTime = new Date('2023-06-02T18:30:00Z');

      const result = component['getNearestDayInEventRange']();

      // Result should be event end date normalized to midnight UTC
      const expectedDate = new Date(Date.UTC(2023, 5, 2, 0, 0, 0, 0)); // June 2, 2023
      expect(result.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe('date navigation with query params', () => {
    it('should use query param day when provided', (done) => {
      const activatedRoute = TestBed.inject(ActivatedRoute);
      activatedRoute.snapshot.queryParams = { day: '2026-05-29' };

      fixture = TestBed.createComponent(ScheduleComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Allow async operations to complete
      setTimeout(() => {
        const expectedDate = new Date('2026-05-29');
        expect(component.viewDay.toISOString().split('T')[0]).toBe(
          expectedDate.toISOString().split('T')[0],
        );
        done();
      }, 100);
    });

    it('should calculate nearest day when no query param provided', (done) => {
      const activatedRoute = TestBed.inject(ActivatedRoute);
      activatedRoute.snapshot.queryParams = {};

      fixture = TestBed.createComponent(ScheduleComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Allow async operations to complete
      setTimeout(() => {
        // Should default to event start (since today is before 2026)
        const expectedDate = new Date(Date.UTC(2026, 4, 27, 0, 0, 0, 0));
        expect(component.viewDay.getTime()).toBe(expectedDate.getTime());
        done();
      }, 100);
    });
  });

  describe('Google Calendar link', () => {
    it('should construct Google Calendar link when googleCalendarId is provided', (done) => {
      fixture = TestBed.createComponent(ScheduleComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.googleCalendarLink).toBeDefined();
        expect(component.googleCalendarLink).toContain('test-calendar-id@import.calendar.google.com');
        expect(component.googleCalendarLink).toContain('ctz=America/Denver');
        expect(component.googleCalendarLink).toContain('mode=WEEK');
        expect(component.googleCalendarLink).toContain('dates=20260527/20260602');
        done();
      }, 100);
    });

    it('should set googleCalendarLink to undefined when googleCalendarId is missing', (done) => {
      const eventInfoWithoutCalendar = {
        ...mockEventInfo,
        googleCalendarId: undefined,
      };
      eventInfoService.getEventInfo.and.returnValue(of(eventInfoWithoutCalendar));

      fixture = TestBed.createComponent(ScheduleComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.googleCalendarLink).toBeUndefined();
        done();
      }, 100);
    });
  });
});
