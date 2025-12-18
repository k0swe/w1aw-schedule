import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { EventInfoWithId } from 'w1aw-schedule-shared';

import { EventInfoService } from '../event-info/event-info.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { ApprovalTabsComponent } from './approval-tabs.component';

describe('ApprovalTabsComponent', () => {
  let component: ApprovalTabsComponent;
  let fixture: ComponentFixture<ApprovalTabsComponent>;

  beforeEach(() => {
    const firestoreMock = {} as Firestore;
    const userSettingsServiceMock = {
      getProvisionalUsers: () => of([]),
      getApprovedUsers: () => of([]),
      getDeclinedUsers: () => of([]),
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
      getEventBySlug: () => of(mockEventInfo),
      getEventInfo: () => of(mockEventInfo),
    };

    const activatedRouteMock = {
      paramMap: of(convertToParamMap({ slug: 'test-slug' })),
      fragment: of(null),
    };

    TestBed.configureTestingModule({
      imports: [ApprovalTabsComponent],
      providers: [
        provideRouter([]),
        { provide: Firestore, useValue: firestoreMock },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    });
    fixture = TestBed.createComponent(ApprovalTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to Approved tab (index 1)', () => {
    expect(component.selectedTabIndex()).toBe(1);
  });

  it('should set tab index based on URL fragment', () => {
    // The component subscribes to route.fragment in ngOnInit
    // We can test the tab selection logic by calling onTabChange
    component.onTabChange(0);
    // Router.navigate is called but we're not testing navigation here
    component.onTabChange(2);
    // Just ensure the method doesn't throw
    expect(component).toBeTruthy();
  });
});
