import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Timestamp } from 'firebase/firestore';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthenticationService } from './authentication/authentication.service';
import { EventInfoService } from './event-info/event-info.service';
import { EventInfoWithId } from './schedule/shared-constants';

describe('AppComponent', () => {
  let mockAuthService: jasmine.SpyObj<AuthenticationService>;
  let mockEventInfoService: jasmine.SpyObj<EventInfoService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthenticationService', ['userIsAdmin'], {
      user$: of(null),
    });
    mockAuthService.userIsAdmin.and.returnValue(of(false));

    const mockEventInfo: EventInfoWithId = {
      id: 'test-id',
      slug: 'test-slug',
      name: 'Test Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    mockEventInfoService = jasmine.createSpyObj('EventInfoService', ['getEventBySlug', 'getAllEvents']);
    mockEventInfoService.getEventBySlug.and.returnValue(of(mockEventInfo));
    mockEventInfoService.getAllEvents.and.returnValue(of([mockEventInfo]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: EventInfoService, useValue: mockEventInfoService },
      ],
    }).compileComponents();
  });

  it('should create the web', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should load all events on initialization', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(mockEventInfoService.getAllEvents).toHaveBeenCalled();
    expect(app.events$.value.length).toBe(1);
  });

  it('should set current event as default when available', (done) => {
    const now = Date.now();
    const pastEvent: EventInfoWithId = {
      id: 'past-event-id',
      slug: 'past-event-slug',
      name: 'Past Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now - 172800000), // 2 days ago
      endTime: Timestamp.fromMillis(now - 86400000), // 1 day ago
      timeZoneId: 'America/Denver',
    };

    const currentEvent: EventInfoWithId = {
      id: 'current-event-id',
      slug: 'current-event-slug',
      name: 'Current Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now - 86400000), // 1 day ago
      endTime: Timestamp.fromMillis(now + 86400000), // 1 day from now
      timeZoneId: 'America/Denver',
    };

    mockEventInfoService.getAllEvents.and.returnValue(of([pastEvent, currentEvent]));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      expect(app.selectedEvent$.value?.slug).toBe('current-event-slug');
      done();
    }, 100);
  });

  it('should set next future event as default when no current event', (done) => {
    const now = Date.now();
    const pastEvent: EventInfoWithId = {
      id: 'past-event-id',
      slug: 'past-event-slug',
      name: 'Past Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now - 172800000), // 2 days ago
      endTime: Timestamp.fromMillis(now - 86400000), // 1 day ago
      timeZoneId: 'America/Denver',
    };

    const futureEvent: EventInfoWithId = {
      id: 'future-event-id',
      slug: 'future-event-slug',
      name: 'Future Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now + 86400000), // 1 day from now
      endTime: Timestamp.fromMillis(now + 172800000), // 2 days from now
      timeZoneId: 'America/Denver',
    };

    mockEventInfoService.getAllEvents.and.returnValue(of([pastEvent, futureEvent]));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      expect(app.selectedEvent$.value?.slug).toBe('future-event-slug');
      done();
    }, 100);
  });

  it('should set last event as default when all events are in the past', (done) => {
    const now = Date.now();
    const olderPastEvent: EventInfoWithId = {
      id: 'older-past-event-id',
      slug: 'older-past-event-slug',
      name: 'Older Past Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now - 259200000), // 3 days ago
      endTime: Timestamp.fromMillis(now - 172800000), // 2 days ago
      timeZoneId: 'America/Denver',
    };

    const recentPastEvent: EventInfoWithId = {
      id: 'recent-past-event-id',
      slug: 'recent-past-event-slug',
      name: 'Recent Past Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.fromMillis(now - 172800000), // 2 days ago
      endTime: Timestamp.fromMillis(now - 86400000), // 1 day ago
      timeZoneId: 'America/Denver',
    };

    mockEventInfoService.getAllEvents.and.returnValue(of([olderPastEvent, recentPastEvent]));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      expect(app.selectedEvent$.value?.slug).toBe('recent-past-event-slug');
      done();
    }, 100);
  });

  it('should change selected event when onEventChange is called', () => {
    const newEvent: EventInfoWithId = {
      id: 'new-id',
      slug: 'new-slug',
      name: 'New Event',
      coordinatorName: 'New Coordinator',
      coordinatorCallsign: 'NEW',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.onEventChange(newEvent);

    expect(app.selectedEvent$.value).toEqual(newEvent);
  });

  it('should navigate to schedule page when switching events on schedule page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    // Simulate being on schedule page
    spyOnProperty(router, 'url', 'get').and.returnValue('/events/old-slug/schedule');

    const newEvent: EventInfoWithId = {
      id: 'new-id',
      slug: 'new-slug',
      name: 'New Event',
      coordinatorName: 'New Coordinator',
      coordinatorCallsign: 'NEW',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    app.onEventChange(newEvent);

    expect(router.navigate).toHaveBeenCalledWith(['/events', 'new-slug', 'schedule']);
  });

  it('should navigate to agenda page when switching events on agenda page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    // Simulate being on agenda page
    spyOnProperty(router, 'url', 'get').and.returnValue('/events/old-slug/agenda');

    const newEvent: EventInfoWithId = {
      id: 'new-id',
      slug: 'new-slug',
      name: 'New Event',
      coordinatorName: 'New Coordinator',
      coordinatorCallsign: 'NEW',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    app.onEventChange(newEvent);

    expect(router.navigate).toHaveBeenCalledWith(['/events', 'new-slug', 'agenda']);
  });

  it('should navigate to approvals page when switching events on approvals page if user is admin', (done) => {
    mockAuthService.userIsAdmin.and.returnValue(of(true));
    
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    // Simulate being on approvals page
    spyOnProperty(router, 'url', 'get').and.returnValue('/events/old-slug/approvals');

    const newEvent: EventInfoWithId = {
      id: 'new-id',
      slug: 'new-slug',
      name: 'New Event',
      coordinatorName: 'New Coordinator',
      coordinatorCallsign: 'NEW',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    app.onEventChange(newEvent);

    setTimeout(() => {
      expect(mockAuthService.userIsAdmin).toHaveBeenCalledWith('new-id');
      expect(router.navigate).toHaveBeenCalledWith(['/events', 'new-slug', 'approvals']);
      done();
    }, 100);
  });

  it('should navigate to schedule page when switching events on approvals page if user is not admin', (done) => {
    mockAuthService.userIsAdmin.and.returnValue(of(false));
    
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    // Simulate being on approvals page
    spyOnProperty(router, 'url', 'get').and.returnValue('/events/old-slug/approvals');

    const newEvent: EventInfoWithId = {
      id: 'new-id',
      slug: 'new-slug',
      name: 'New Event',
      coordinatorName: 'New Coordinator',
      coordinatorCallsign: 'NEW',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    app.onEventChange(newEvent);

    setTimeout(() => {
      expect(mockAuthService.userIsAdmin).toHaveBeenCalledWith('new-id');
      expect(router.navigate).toHaveBeenCalledWith(['/events', 'new-slug', 'schedule']);
      done();
    }, 100);
  });

  it('should receive events sorted chronologically from service', (done) => {
    // Create events with different start times
    const now = Date.now();
    const event1: EventInfoWithId = {
      id: 'event-1',
      slug: 'event-1-slug',
      name: 'First Event',
      coordinatorName: 'Coordinator 1',
      coordinatorCallsign: 'CALL1',
      admins: [],
      startTime: Timestamp.fromMillis(now),
      endTime: Timestamp.fromMillis(now + 86400000),
      timeZoneId: 'America/Denver',
    };

    const event2: EventInfoWithId = {
      id: 'event-2',
      slug: 'event-2-slug',
      name: 'Second Event',
      coordinatorName: 'Coordinator 2',
      coordinatorCallsign: 'CALL2',
      admins: [],
      startTime: Timestamp.fromMillis(now + 172800000), // 2 days later
      endTime: Timestamp.fromMillis(now + 259200000),
      timeZoneId: 'America/Denver',
    };

    // Return events already sorted by startTime (as getAllEvents should do)
    mockEventInfoService.getAllEvents.and.returnValue(of([event1, event2]));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      const events = app.events$.value;
      expect(events.length).toBe(2);
      // Verify events are in chronological order
      expect(events[0].startTime.toMillis()).toBeLessThan(events[1].startTime.toMillis());
      done();
    }, 100);
  });
});
