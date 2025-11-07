import { Routes } from '@angular/router';

import { AdminGuard } from './authentication/admin.guard';
import { AuthenticationGuard } from './authentication/authentication.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'user',
    loadComponent: () =>
      import('./user-settings/user-settings.component').then(
        (m) => m.UserSettingsComponent,
      ),
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./schedule/schedule.component').then((m) => m.ScheduleComponent),
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'agenda',
    loadComponent: () =>
      import('./agenda/agenda.component').then((m) => m.AgendaComponent),
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./approval-tabs/approval-tabs.component').then(
        (m) => m.ApprovalTabsComponent,
      ),
    canActivate: [AuthenticationGuard, AdminGuard],
  },
];
