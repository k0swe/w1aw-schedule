import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

import { ApprovalListComponent } from './approval-list.component';
import { UserSettingsService } from '../../user-settings/user-settings.service';

describe('ApprovalListComponent', () => {
  let component: ApprovalListComponent;
  let fixture: ComponentFixture<ApprovalListComponent>;

  beforeEach(async () => {
    const firestoreMock = {} as Firestore;
    const userSettingsServiceMock = {
      approve: () => of(undefined),
      decline: () => of(undefined),
      delete: () => of({}),
      setMultiShift: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ApprovalListComponent],
      providers: [
        { provide: Firestore, useValue: firestoreMock },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApprovalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
