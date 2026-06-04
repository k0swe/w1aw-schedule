import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Auth } from 'firebase/auth';
import {
  FirebaseStorage,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { Subject, combineLatest, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { map, switchMap, take, takeUntil } from 'rxjs/operators';
import { UserSettings } from 'w1aw-schedule-shared';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { AUTH, STORAGE } from '../firebase-rxjs';
import { UserSettingsService } from '../user-settings/user-settings.service';

type UploadedLogFile = {
  path: string;
  fileName: string;
  uploadedAt: number | null;
  uploadedAtDisplay: string;
};

type UploadOperator = {
  userId: string;
  callsign: string;
};

type RerunCleanseAdifResponse = {
  success: boolean;
  originalFileCount: number;
  processed: number;
  failed: number;
  failedPaths?: string[];
};

const CONTENT_DISPOSITION_FILENAME_REGEX =
  /filename\*?=(?:UTF-8''|")?([^\";]+)/i;
const LEGACY_TIMESTAMP_PREFIX_REGEX = /^\d{10,13}-/;
const UPLOAD_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const COMBINED_ADIF_RETRY_DELAY_MS = 5000;
const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

@Component({
  selector: 'kel-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardActions,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatProgressBar,
  ],
})
export class UploadComponent implements OnDestroy {
  private authService = inject(AuthenticationService);
  private eventInfoService = inject(EventInfoService);
  private userSettingsService = inject(UserSettingsService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject<Auth>(AUTH);
  private snackBar = inject(MatSnackBar);
  private storage = inject<FirebaseStorage>(STORAGE);
  private destroy$ = new Subject<void>();

  eventId = signal<string>('');
  eventCallsign = signal<string>('');
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  selectedFile = signal<File | null>(null);
  isApprovedOperator = signal<boolean | null>(null);
  isEventAdmin = signal<boolean>(false);
  userCallsign = signal<string>('');
  eventStartTime = signal<Date | null>(null);
  eventEndTime = signal<Date | null>(null);
  uploadOperators = signal<UploadOperator[]>([]);
  selectedUploadUserId = signal<string>('');
  loadingUploadedFiles = signal<boolean>(false);
  uploadedFiles = signal<UploadedLogFile[]>([]);
  loadingCombinedAdifDownload = signal<boolean>(false);
  combinedAdifDownloadUrl = signal<string | null>(null);
  downloadingOriginalAdifZip = signal<boolean>(false);
  rerunningCleanse = signal<boolean>(false);
  eventCallsignDisplay = computed(
    () => this.eventCallsign().trim() || 'not available yet',
  );
  userCallsignDisplay = computed(
    () => this.userCallsign().trim() || 'not set in your profile yet',
  );
  selectedUploadOperator = computed(
    () =>
      this.uploadOperators().find(
        (operator) => operator.userId === this.selectedUploadUserId(),
      ) ?? null,
  );
  uploadCallsignDisplay = computed(() => {
    if (!this.isEventAdmin()) {
      return this.userCallsign().trim() || 'not set in your profile yet';
    }
    return this.selectedUploadOperator()?.callsign ?? 'select an approved operator';
  });
  canUploadTarget = computed(() => {
    if (this.isEventAdmin()) {
      return this.selectedUploadUserId().trim().length > 0;
    }
    return this.isApprovedOperator() === true;
  });
  uploadedLogsTitle = computed(() => {
    if (!this.isEventAdmin()) {
      return 'My Uploaded Logs';
    }
    const callsign = this.selectedUploadOperator()?.callsign;
    return callsign ? `${callsign} Uploaded Logs` : 'Selected Operator Uploaded Logs';
  });
  shouldShowEventSelectionWarning = computed(() => {
    const eventStartTime = this.eventStartTime();
    const eventEndTime = this.eventEndTime();
    if (!eventStartTime || !eventEndTime) {
      return false;
    }
    const now = Date.now();
    return (
      now < eventStartTime.getTime() ||
      now > eventEndTime.getTime() + ONE_WEEK_IN_MS
    );
  });

  constructor() {
    this.userSettingsService.init();
    this.route.paramMap
      .pipe(
        map((params) => {
          const slug = params.get('slug');
          if (!slug)
            throw new Error(
              'Event slug parameter is missing from route. Expected format: /events/:slug/upload',
            );
          return slug;
        }),
        switchMap((slug) =>
          this.eventInfoService.getEventBySlug(slug).pipe(
            take(1),
            switchMap((eventInfo) => {
              if (!eventInfo)
                throw new Error(`Event not found for slug: ${slug}`);
              return combineLatest([
                this.userSettingsService.getUserEventApproval(eventInfo.id),
                this.authService.userIsAdmin(eventInfo.id),
                this.userSettingsService.settings(),
              ]).pipe(
                switchMap(([approval, isAdmin, userSettings]) =>
                  (
                    isAdmin
                      ? this.userSettingsService.getApprovedUsers(eventInfo.id)
                      : of([])
                  ).pipe(
                    map((approvedUsers) => ({
                      eventId: eventInfo.id,
                      eventCallsign: eventInfo.eventCallsign,
                      eventStartTime: eventInfo.startTime?.toDate?.() ?? null,
                      eventEndTime: eventInfo.endTime?.toDate?.() ?? null,
                      isApproved: approval?.status === 'Approved',
                      isAdmin,
                      userCallsign: userSettings.callsign?.trim() || '',
                      uploadOperators: this.toUploadOperators(approvedUsers),
                    })),
                  ),
                ),
              );
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({
          eventId,
          eventCallsign,
          eventStartTime,
          eventEndTime,
          isApproved,
          isAdmin,
          userCallsign,
          uploadOperators,
        }) => {
          this.eventId.set(eventId);
          this.eventCallsign.set(eventCallsign);
          this.eventStartTime.set(eventStartTime);
          this.eventEndTime.set(eventEndTime);
          this.isApprovedOperator.set(isApproved);
          this.isEventAdmin.set(isAdmin);
          this.userCallsign.set(userCallsign);
          this.uploadOperators.set(uploadOperators);
          this.syncSelectedUploadUserId(isAdmin, uploadOperators);
          void this.loadUploadedFiles().catch((error) => {
            console.error(
              '[UploadComponent] Failed to initialize uploaded logs list:',
              error,
            );
          });
          void this.loadCombinedAdifDownloadUrl();
        },
        error: (err) => {
          console.error('[UploadComponent] Failed to resolve event:', err);
          this.snackBar.open(
            'Failed to load event. Please try again.',
            undefined,
            { duration: 5000 },
          );
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  onUploadOperatorChange(userId: string): void {
    this.selectedUploadUserId.set(userId);
    void this.loadUploadedFiles().catch((error) => {
      console.error(
        '[UploadComponent] Failed to refresh uploaded logs list for selected operator:',
        error,
      );
    });
  }

  upload(): void {
    if (!this.canUploadTarget()) {
      const message = this.isEventAdmin()
        ? 'Select an approved operator before uploading logs.'
        : 'You must be approved for this event before uploading logs.';
      this.snackBar.open(
        message,
        undefined,
        { duration: 5000 },
      );
      return;
    }

    const file = this.selectedFile();
    const user = this.authService.user$.getValue();
    const uploadUserId = this.getUploadUserId();
    if (!file || !user || !uploadUserId) return;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const unixTime = Date.now();
    const storagePath = `${this.eventId()}/original/${uploadUserId}/${unixTime}-${baseName}.adi`;
    const storageRef = ref(this.storage, storagePath);
    const metadata: UploadMetadata = {
      contentType: 'text/plain; charset=utf-8',
      customMetadata: {
        originalFileName: file.name,
      },
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.uploadProgress.set(Math.round(progress));
      },
      (error) => {
        this.uploading.set(false);
        console.error('[UploadComponent] Upload failed:', error);
        this.snackBar.open(
          'Upload failed. Please try again.',
          undefined,
          { duration: 5000 },
        );
      },
      () => {
        this.uploading.set(false);
        this.selectedFile.set(null);
        void this.loadUploadedFiles().catch((error) => {
          console.error(
            '[UploadComponent] Failed to refresh uploaded logs list:',
            error,
          );
        });
        this.snackBar.open('Log uploaded successfully!', undefined, {
          duration: 5000,
        });
      },
    );
  }

  private async loadUploadedFiles(): Promise<void> {
    const eventId = this.eventId();
    const uploadUserId = this.getUploadUserId();
    if (!uploadUserId || !eventId) {
      this.uploadedFiles.set([]);
      return;
    }

    this.loadingUploadedFiles.set(true);

    try {
      const listRef = ref(this.storage, `${eventId}/original/${uploadUserId}`);
      const listed = await listAll(listRef);

      const uploadedFiles = await Promise.all(
        listed.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const originalFileName =
            metadata.customMetadata?.['originalFileName'];
          const trimmedOriginalFileName = originalFileName?.trim() || '';
          const uploadDate = metadata.timeCreated
            ? new Date(metadata.timeCreated)
            : null;
          return {
            path: itemRef.fullPath,
            fileName:
              trimmedOriginalFileName ||
              itemRef.name.replace(LEGACY_TIMESTAMP_PREFIX_REGEX, ''),
            uploadedAt: uploadDate?.getTime() ?? null,
            uploadedAtDisplay: uploadDate
              ? UPLOAD_TIME_FORMATTER.format(uploadDate)
              : 'Unknown',
          };
        }),
      );

      uploadedFiles.sort(
        (a, b) =>
          (b.uploadedAt ?? Number.NEGATIVE_INFINITY) -
          (a.uploadedAt ?? Number.NEGATIVE_INFINITY),
      );
      this.uploadedFiles.set(uploadedFiles);
    } catch (error) {
      console.error('[UploadComponent] Failed to list uploaded logs:', error);
      this.uploadedFiles.set([]);
      this.snackBar.open('Failed to load uploaded logs.', undefined, {
        duration: 5000,
      });
    } finally {
      this.loadingUploadedFiles.set(false);
    }
  }

  private getUploadUserId(): string {
    if (this.isEventAdmin()) {
      return this.selectedUploadUserId().trim();
    }
    return this.authService.user$.getValue()?.uid ?? '';
  }

  private syncSelectedUploadUserId(
    isAdmin: boolean,
    uploadOperators: UploadOperator[],
  ): void {
    if (!isAdmin) {
      this.selectedUploadUserId.set('');
      return;
    }

    const currentSelection = this.selectedUploadUserId();
    if (uploadOperators.some((operator) => operator.userId === currentSelection)) {
      return;
    }

    const currentUserId = this.authService.user$.getValue()?.uid;
    const defaultUserId =
      (currentUserId &&
      uploadOperators.some((operator) => operator.userId === currentUserId)
        ? currentUserId
        : null) ??
      uploadOperators[0]?.userId ??
      '';
    this.selectedUploadUserId.set(defaultUserId);
  }

  private toUploadOperators(approvedUsers: UserSettings[]): UploadOperator[] {
    return approvedUsers
      .filter((user) => !!user.id?.trim() && !!user.callsign?.trim())
      .map((user) => ({
        userId: user.id!.trim(),
        callsign: user.callsign!.trim(),
      }))
      .sort((a, b) => a.callsign.localeCompare(b.callsign));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async loadCombinedAdifDownloadUrl(maxRetries = 0): Promise<void> {
    const eventId = this.eventId();
    if (!eventId || !this.isEventAdmin()) {
      this.combinedAdifDownloadUrl.set(null);
      return;
    }

    this.loadingCombinedAdifDownload.set(true);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await this.sleep(COMBINED_ADIF_RETRY_DELAY_MS);
      }
      try {
        const combinedFileRef = ref(this.storage, `${eventId}/combined.adi`);
        const url = await getDownloadURL(combinedFileRef);
        this.combinedAdifDownloadUrl.set(url);
        this.loadingCombinedAdifDownload.set(false);
        return;
      } catch (error) {
        const errorCode =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof error.code === 'string'
            ? error.code
            : undefined;

        if (errorCode === 'storage/object-not-found') {
          if (attempt < maxRetries) {
            continue;
          }
          this.combinedAdifDownloadUrl.set(null);
        } else {
          console.error(
            '[UploadComponent] Failed to get combined ADIF download URL:',
            error,
          );
          this.combinedAdifDownloadUrl.set(null);
          this.snackBar.open(
            'Failed to load final aggregated ADIF link.',
            undefined,
            { duration: 5000 },
          );
          break;
        }
      }
    }

    this.loadingCombinedAdifDownload.set(false);
  }

  openCombinedAdifDownload(): void {
    const url = this.combinedAdifDownloadUrl();
    if (!url) return;
    window.location.assign(url);
  }

  async downloadOriginalAdifZip(): Promise<void> {
    if (!this.isEventAdmin()) {
      this.snackBar.open(
        'Only event admins can download original ADIF files.',
        undefined,
        { duration: 5000 },
      );
      return;
    }

    const eventId = this.eventId();
    if (!eventId) {
      this.snackBar.open('Missing event ID.', undefined, {
        duration: 5000,
      });
      return;
    }

    this.downloadingOriginalAdifZip.set(true);
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const url = `${environment.functionBase}/downloadOriginalAdifZip?eventId=${encodeURIComponent(eventId)}`;
      const response = await firstValueFrom(
        this.http.get(url, {
          headers: {
            Authorization: 'Bearer ' + token,
          },
          observe: 'response',
          responseType: 'blob',
        }),
      );

      const blob = response.body;
      if (!blob) {
        throw new Error('No ZIP payload was returned');
      }

      const headerValue = response.headers.get('content-disposition');
      const fileName = this.extractDownloadFilename(headerValue);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(
        '[UploadComponent] Failed to download original ADIF ZIP:',
        error,
      );
      this.snackBar.open(
        'Failed to download original ADIF ZIP. Please try again.',
        undefined,
        { duration: 7000 },
      );
    } finally {
      this.downloadingOriginalAdifZip.set(false);
    }
  }

  private extractDownloadFilename(
    contentDisposition: string | null,
  ): string {
    if (!contentDisposition) {
      return 'original-adif-files.zip';
    }
    const match = CONTENT_DISPOSITION_FILENAME_REGEX.exec(contentDisposition);
    if (!match || !match[1]) {
      return 'original-adif-files.zip';
    }
    return decodeURIComponent(match[1].trim().replace(/\"/g, ''));
  }

  async rerunCleanseAdif(): Promise<void> {
    if (!this.isEventAdmin()) {
      this.snackBar.open(
        'Only event admins can regenerate from scratch.',
        undefined,
        { duration: 5000 },
      );
      return;
    }

    const eventId = this.eventId();
    if (!eventId) {
      this.snackBar.open('Missing event ID.', undefined, {
        duration: 5000,
      });
      return;
    }

    this.rerunningCleanse.set(true);
    this.combinedAdifDownloadUrl.set(null);
    const runningSnackBar = this.snackBar.open(
      'Regenerating from scratch...',
    );

    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const url = `${environment.functionBase}/rerunCleanseAdif?eventId=${encodeURIComponent(eventId)}`;
      const result = await firstValueFrom(
        this.http.get<RerunCleanseAdifResponse>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      if (result.success) {
        this.snackBar.open(
          `Regeneration complete. Processed ${result.processed} of ${result.originalFileCount} files.`,
          undefined,
          { duration: 6000 },
        );
      } else {
        this.snackBar.open(
          `Regeneration completed with failures (${result.failed} failed, ${result.processed} processed).`,
          undefined,
          { duration: 7000 },
        );
      }
    } catch (error) {
      console.error('[UploadComponent] Failed to regenerate from scratch:', error);
      this.snackBar.open(
        'Failed to regenerate from scratch. Please try again.',
        undefined,
        { duration: 7000 },
      );
    } finally {
      runningSnackBar.dismiss();
      this.rerunningCleanse.set(false);
      void this.loadCombinedAdifDownloadUrl(10);
    }
  }
}
