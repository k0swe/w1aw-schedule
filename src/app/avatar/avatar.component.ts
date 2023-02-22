import firebase from 'firebase/compat/app';
import {AuthenticationService} from '../authentication/authentication.service';
import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {Router} from '@angular/router';
import {take} from 'rxjs/operators';

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
    private router: Router,
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
