import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { User } from '@angular/fire/auth';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'kel-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
  authService = inject(AuthenticationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  user$: Observable<User | null>;
  photoUrl = signal<string>('');

  constructor() {
    this.user$ = this.authService.user$;
    this.user$.subscribe((u) => {
      if (!u) {
        return;
      }
      const firstLetter = u.email?.at(0);
      this.photoUrl.set(
        u?.photoURL ||
          `https://ui-avatars.com/api/?name=${firstLetter}&background=c62828&color=fff`,
      );
    });
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(take(1))
      .subscribe(() => this.router.navigate(['/']));
  }
}
