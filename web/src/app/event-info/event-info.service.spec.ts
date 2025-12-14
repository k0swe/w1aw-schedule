import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';

import { EventInfoService } from './event-info.service';

describe('EventInfoService', () => {
  let service: EventInfoService;

  beforeEach(() => {
    const firestoreMock = {} as Firestore;

    TestBed.configureTestingModule({
      providers: [
        EventInfoService,
        { provide: Firestore, useValue: firestoreMock },
      ],
    });
    service = TestBed.inject(EventInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
