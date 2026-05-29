import { TestBed } from '@angular/core/testing';
import { Firestore } from 'firebase/firestore';
import { BehaviorSubject, of } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    const firestoreMock = {} as Firestore;
    const authServiceMock = {
      user$: new BehaviorSubject(null),
      userIsAdmin: jasmine.createSpy().and.returnValue(of(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        ScheduleService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: AuthenticationService, useValue: authServiceMock },
      ],
    });
    service = TestBed.inject(ScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should remove undefined values from objects', async () => {
    const sanitized = (service as any).removeUndefinedValues({
      callsign: 'K1ABC',
      gridSquare: undefined,
    });

    expect(sanitized).toEqual({ callsign: 'K1ABC' });
  });
});
