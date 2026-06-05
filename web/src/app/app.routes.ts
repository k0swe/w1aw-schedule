import { Routes } from '@angular/router';

import { AdminGuard } from './authentication/admin.guard';
import { AuthenticationGuard } from './authentication/authentication.guard';
import { SuperAdminGuard } from './authentication/super-admin.guard';
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
    path: 'calendars',
    loadComponent: () =>
      import('./calendars/calendars.component').then(
        (m) => m.CalendarsComponent,
      ),
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
    path: 'events/:slug',
    canActivateChild: [AuthenticationGuard],
    children: [
      {
        path: 'schedule',
        loadComponent: () =>
          import('./schedule/schedule.component').then(
            (m) => m.ScheduleComponent,
          ),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./agenda/agenda.component').then((m) => m.AgendaComponent),
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./approval-tabs/approval-tabs.component').then(
            (m) => m.ApprovalTabsComponent,
          ),
        canActivate: [AdminGuard],
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./upload/upload.component').then((m) => m.UploadComponent),
      },
    ],
  },
  {
    path: 'init-shifts',
    loadComponent: () =>
      import('./init-shifts/init-shifts.component').then(
        (m) => m.InitShiftsComponent,
      ),
    canActivate: [AuthenticationGuard, SuperAdminGuard],
  },
];
