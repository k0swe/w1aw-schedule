import { AsyncPipe, NgIf, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'kel-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  imports: [
    NgIf,
    MatIconButton,
    MatMenuTrigger,
    NgOptimizedImage,
    MatMenu,
    MatMenuItem,
    MatIcon,
    RouterLink,
    AsyncPipe,
  ],
})
export class AvatarComponent {
  user$: Observable<firebase.User | null>;
  photoUrl: string = '';

  constructor(
    public authService: AuthenticationService,
    private dialog: MatDialog,
    private router: Router,
  ) {
    this.user$ = this.authService.user$;
    this.user$.subscribe((u) => {
      if (!u) {
        return;
      }
      const firstLetter = u.email?.at(0);
      this.photoUrl =
        u?.photoURL ||
        `https://ui-avatars.com/api/?name=${firstLetter}&background=c62828&color=fff`;
    });
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(take(1))
      .subscribe(() => this.router.navigate(['/']));
  }
}
