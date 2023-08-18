import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalTabsComponent } from './approval-tabs.component';

describe('ApprovalTabsComponent', () => {
  let component: ApprovalTabsComponent;
  let fixture: ComponentFixture<ApprovalTabsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ApprovalTabsComponent]
    });
    fixture = TestBed.createComponent(ApprovalTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
