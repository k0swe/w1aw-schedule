import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthenticationService } from './authentication/authentication.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgOptimizedImage, AsyncPipe } from '@angular/common';
import { AvatarComponent } from './avatar/avatar.component';
import { MatSidenavContainer, MatSidenav } from '@angular/material/sidenav';
import { MatNavList, MatListItem, MatListItemIcon, MatDivider } from '@angular/material/list';

@Component({
    selector: 'kel-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [MatToolbar, MatIconButton, MatIcon, RouterLink, NgOptimizedImage, AvatarComponent, MatSidenavContainer, MatSidenav, MatNavList, MatListItem, MatListItemIcon, MatDivider, RouterOutlet, AsyncPipe]
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
