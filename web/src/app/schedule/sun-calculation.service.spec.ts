import { TestBed } from '@angular/core/testing';

import { SunCalculationService } from './sun-calculation.service';

describe('SunCalculationService', () => {
  let service: SunCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SunCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isDaytime without geolocation', () => {
    it('should use fallback for daytime (10 AM local)', () => {
      // Create a date with local time at 10 AM
      const time = new Date();
      time.setHours(10, 0, 0, 0);
      const result = service.isDaytime(time);
      expect(result).toBe(true);
    });

    it('should use fallback for nighttime (10 PM local)', () => {
      // Create a date with local time at 10 PM
      const time = new Date();
      time.setHours(22, 0, 0, 0);
      const result = service.isDaytime(time);
      expect(result).toBe(false);
    });

    it('should handle edge case at 6am', () => {
      const time = new Date();
      time.setHours(6, 0, 0, 0);
      const result = service.isDaytime(time);
      expect(result).toBe(true);
    });

    it('should handle edge case at 6pm', () => {
      const time = new Date();
      time.setHours(18, 0, 0, 0);
      const result = service.isDaytime(time);
      expect(result).toBe(false);
    });
  });

  describe('getDayNightIcon', () => {
    it('should return light_mode for daytime', () => {
      const time = new Date();
      time.setHours(12, 0, 0, 0);
      const result = service.getDayNightIcon(time);
      expect(result).toBe('light_mode');
    });

    it('should return dark_mode for nighttime', () => {
      const time = new Date();
      time.setHours(22, 0, 0, 0);
      const result = service.getDayNightIcon(time);
      expect(result).toBe('dark_mode');
    });
  });

  describe('getUserLocation', () => {
    it('should return an observable', (done) => {
      service.getUserLocation().subscribe((location) => {
        // Location may be undefined if geolocation is not available/denied
        expect(location === undefined || typeof location === 'object').toBe(
          true,
        );
        done();
      });
    });
  });
});
