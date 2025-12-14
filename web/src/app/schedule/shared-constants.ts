// This file is copy-pasta'd in functions
import { Timestamp } from 'firebase/firestore';

import { UserSettings } from '../user-settings/user-settings.service';

// Import shared constants from the shared module
export {
  BANDS,
  COLORADO_DOC_ID,
  COLORADO_SLUG,
  HI_HF_BANDS,
  LF_BANDS,
  LOW_HF_BANDS,
  MODES,
  SUPER_ADMIN_ID,
  TWO_HOURS_IN_MS,
  VHF_UHF_BANDS,
} from '../../../../shared/constants';

export interface EventInfo {
  name: string;
  slug: string;
  coordinatorName: string;
  coordinatorCallsign: string;
  admins: string[];
  startTime: Timestamp;
  endTime: Timestamp;
  timeZoneId: string;
}

export interface EventInfoWithId extends EventInfo {
  id: string;
}

export interface EventApproval {
  status: 'Applied' | 'Approved' | 'Declined';
  approvedBy?: string;
  declinedBy?: string;
  appliedAt: Timestamp;
  statusChangedAt?: Timestamp;
  userId?: string; // User ID for whom this approval is for (useful for queries)
}

export interface Shift {
  time: Timestamp;
  band: string;
  mode: string;
  // Firebase User ID
  reservedBy: string | null;
  reservedDetails: UserSettings | null;
}
