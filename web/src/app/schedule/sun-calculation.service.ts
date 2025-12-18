import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as SunCalc from 'suncalc';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class SunCalculationService {
  private userLocation$ = new BehaviorSubject<
    GeolocationCoordinates | undefined
  >(undefined);

  constructor() {
    this.requestUserLocation();
  }

  /**
   * Requests the user's location using the browser's Geolocation API.
   * This is called automatically on service initialization.
   * If the user denies permission or geolocation is unavailable,
   * the service will fall back to the simple 6am-6pm model.
   */
  private requestUserLocation(): void {
    if ('geolocation' in navigator) {
      // Use low accuracy for privacy and faster response
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation$.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // User denied permission or geolocation failed
          // Fall back to simple model (userLocation$ remains undefined)
          console.info(
            'Geolocation not available, using fallback day/night model',
          );
        },
        {
          enableHighAccuracy: false, // Low precision is sufficient
          timeout: 5000,
          maximumAge: TWENTY_FOUR_HOURS_IN_MS, // Cache for 24 hours
        },
      );
    }
  }

  /**
   * Gets the user's location as an Observable.
   */
  getUserLocation(): Observable<GeolocationCoordinates | undefined> {
    return this.userLocation$.asObservable();
  }

  /**
   * Determines if the given time is during daytime at the user's location.
   * Uses suncalc with browser geolocation if available.
   * Falls back to simple 6am-6pm check if geolocation is unavailable.
   *
   * @param time The time to check
   * @returns true if it's daytime (sun is up), false if nighttime (moon is up)
   */
  isDaytime(time: Date): boolean {
    const location = this.userLocation$.getValue();

    // If location is available, use suncalc for accurate sunrise/sunset
    if (location) {
      const times = SunCalc.getTimes(
        time,
        location.latitude,
        location.longitude,
      );
      return time >= times.sunrise && time < times.sunset;
    }

    // Fallback to simple 6am-6pm model using browser's local time
    const localHour = time.getHours();
    return localHour >= 6 && localHour < 18;
  }

  /**
   * Gets the Material icon name for day/night indicator.
   *
   * @param time The time to check
   * @returns 'light_mode' for daytime, 'dark_mode' for nighttime
   */
  getDayNightIcon(time: Date): string {
    return this.isDaytime(time) ? 'light_mode' : 'dark_mode';
  }
}
