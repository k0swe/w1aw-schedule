import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'kel-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
  user$: Observable<firebase.User | null>;

  constructor(
    public authService: AuthenticationService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(take(1))
      .subscribe(() => this.router.navigate(['/']));
  }
}
