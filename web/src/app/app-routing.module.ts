import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AgendaComponent } from './agenda/agenda.component';
import { AuthenticationGuard } from './authentication/authentication.guard';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { ScheduleComponent } from './schedule/schedule.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';

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
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'agenda',
    component: AgendaComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'approvals',
    loadChildren: () =>
      import('./approval-list/approval-list.module').then(
        (m) => m.ApprovalListModule,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
