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
});
