import { TestBed } from '@angular/core/testing';

import { SectionInfoService } from './section-info.service';

describe('SectionInfoService', () => {
  let service: SectionInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SectionInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
