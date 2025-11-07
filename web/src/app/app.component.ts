import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthenticationService } from './authentication/authentication.service';

@Component({
    selector: 'kel-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  appName = environment.appName;
  userIsAdmin$ = new BehaviorSubject<boolean>(false);

  constructor(
    private authenticationService: AuthenticationService,
    private titleService: Title,
  ) {
    authenticationService
      .userIsAdmin()
      .subscribe((isAdmin) => this.userIsAdmin$.next(isAdmin));
    this.titleService.setTitle(this.appName);
  }
}
