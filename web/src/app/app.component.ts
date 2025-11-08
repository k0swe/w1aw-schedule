import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatDivider,
  MatListItem,
  MatListItemIcon,
  MatNavList,
} from '@angular/material/list';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthenticationService } from './authentication/authentication.service';
import { AvatarComponent } from './avatar/avatar.component';

@Component({
  selector: 'kel-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    RouterLink,
    NgOptimizedImage,
    AvatarComponent,
    MatSidenavContainer,
    MatSidenav,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatDivider,
    RouterOutlet,
    AsyncPipe,
  ],
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
