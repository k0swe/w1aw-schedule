import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
import { AvatarComponent } from './avatar/avatar.component';
import { COLORADO_SLUG } from './schedule/shared-constants';

@Component({
  selector: 'kel-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private titleService = inject(Title);

  appName = environment.appName;
  // Default slug for the Colorado event - should be dynamic based on user's selected event in the future
  defaultEventSlug = COLORADO_SLUG;
  userIsAdmin$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.titleService.setTitle(this.appName);
  }
}
