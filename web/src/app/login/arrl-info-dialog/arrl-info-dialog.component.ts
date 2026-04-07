import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'kel-arrl-info-dialog',
  templateUrl: './arrl-info-dialog.component.html',
  styleUrls: ['./arrl-info-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButton, MatIcon],
})
export class ArrlInfoDialogComponent {
  private dialogRef = inject(MatDialogRef<ArrlInfoDialogComponent>);

  onClose(): void {
    this.dialogRef.close();
  }
}
