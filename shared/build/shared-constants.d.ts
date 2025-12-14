export declare const TWO_HOURS_IN_MS: number;
export declare const MODES: string[];
export declare const LF_BANDS: string[];
export declare const LOW_HF_BANDS: string[];
export declare const HI_HF_BANDS: string[];
export declare const VHF_UHF_BANDS: string[];
export declare const BANDS: string[];
export declare const COLORADO_DOC_ID = "jZbFyscc23zjkEGRuPAI";
export declare const COLORADO_SLUG = "usa250-co-may";
export declare const SUPER_ADMIN_ID = "VAfZAw8GhJQodyTTCkXgilbqvoM2";
export interface GenericTimestamp {
    toMillis(): number;
    toDate(): Date;
}
export interface EventInfo {
    name: string;
    slug: string;
    coordinatorName: string;
    coordinatorCallsign: string;
    admins: string[];
    startTime: GenericTimestamp;
    endTime: GenericTimestamp;
    timeZoneId: string;
}
export interface EventInfoWithId extends EventInfo {
    id: string;
}
export interface SectionInfo extends EventInfo {
}
export interface UserSettings {
    id?: string;
    callsign?: string;
    email?: string;
    emailVerified?: boolean;
    gridSquare?: string;
    name?: string;
    phone?: string;
    approvedBy?: string;
    declinedBy?: string;
    multiShift?: boolean;
    arrlMemberNumber?: string;
    discordUsername?: string;
    discordId?: string;
    discordDiscriminator?: string;
    discordAvatar?: string;
}
export interface EventApproval {
    status: 'Applied' | 'Approved' | 'Declined';
    approvedBy?: string;
    declinedBy?: string;
    appliedAt: GenericTimestamp;
    statusChangedAt?: GenericTimestamp;
    userId?: string;
}
export interface Shift {
    time: GenericTimestamp;
    band: string;
    mode: string;
    reservedBy: string | null;
    reservedDetails: UserSettings | null;
}
export declare const shiftId: (shift: Partial<Shift>) => string;
//# sourceMappingURL=shared-constants.d.ts.map