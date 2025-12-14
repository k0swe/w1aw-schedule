import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    const firestoreMock = {} as Firestore;
    const authServiceMock = {
      user$: new BehaviorSubject(null),
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
});
