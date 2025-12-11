import { TestBed } from '@angular/core/testing';
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

  it('should set Colorado event as default when available', (done) => {
    const coloradoEvent: EventInfoWithId = {
      id: 'jZbFyscc23zjkEGRuPAI',
      slug: 'usa250-co-may',
      name: 'Colorado Event',
      coordinatorName: 'Test Coordinator',
      coordinatorCallsign: 'TEST',
      admins: [],
      startTime: Timestamp.now(),
      endTime: Timestamp.now(),
      timeZoneId: 'America/Denver',
    };

    mockEventInfoService.getAllEvents.and.returnValue(of([coloradoEvent]));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    setTimeout(() => {
      expect(app.selectedEvent$.value?.slug).toBe('usa250-co-may');
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
