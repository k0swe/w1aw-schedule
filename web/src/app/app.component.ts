import { Component } from '@angular/core';

import { environment } from '../environment/environment';
import { AuthenticationService } from './authentication/authentication.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'kel-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  appName = environment.appName;
  userIsAdmin$ = new BehaviorSubject<boolean>(false);

  constructor(private authenticationService: AuthenticationService) {
    authenticationService
      .userIsAdmin()
      .subscribe((isAdmin) => this.userIsAdmin$.next(isAdmin));
  }
}
