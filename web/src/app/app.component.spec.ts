import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { environment } from '../environment/environment';
import { AppComponent } from './app.component';
import { AuthenticationService } from './authentication/authentication.service';
import { AvatarComponent } from './avatar/avatar.component';

describe('AppComponent', () => {
  const authServiceSpy = jasmine.createSpyObj(
    'AuthenticationService',
    {},
    { user$: of({ uid: 'a2c4', email: 'joe@example.com' }) }
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MatSidenavModule,
        MatToolbarModule,
        RouterTestingModule,
        MatDialogModule,
        NoopAnimationsModule,
        MatListModule,
        MatMenuModule,
      ],
      declarations: [AppComponent, AvatarComponent],
      providers: [
        {
          provide: AuthenticationService,
          useValue: authServiceSpy,
        },
      ],
    }).compileComponents();
  });

  it('should create the web app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      environment.appName
    );
  });
});
