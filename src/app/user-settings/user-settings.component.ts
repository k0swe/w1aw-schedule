import {Component} from '@angular/core';
import {Observable} from "rxjs";
import firebase from "firebase/compat/app";
import {AuthenticationService} from "../authentication/authentication.service";

@Component({
  selector: 'kel-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent {
  user$: Observable<firebase.User | null>;

  constructor(public authenticationService: AuthenticationService) {
    this.user$ = authenticationService.user$;
  }
}
