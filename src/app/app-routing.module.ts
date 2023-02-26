import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthenticationGuard } from './authentication/authentication.guard';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { ScheduleComponent } from './schedule/schedule.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';
import { UserSettingsGuard } from './user-settings/user-settings.guard';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'user',
    component: UserSettingsComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'schedule',
    component: ScheduleComponent,
    canActivate: [AuthenticationGuard, UserSettingsGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
