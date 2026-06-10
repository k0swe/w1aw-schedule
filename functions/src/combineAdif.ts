import { randomUUID } from "crypto";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { AdifFormatter, AdifParser, SimpleAdif } from "adif-parser-ts";

const CLEANSED_PATH_REGEX = /^([^/]+)\/cleansed\/([^/]+)$/;

type CleansedSourceInfo = {
  eventId: string;
};

type AdifRecord = NonNullable<SimpleAdif["records"]>[number];

/** Bucket type inferred from the firebase-admin storage API. */
type StorageBucket = ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

/** Shape of the combineToken document stored in events/{eventId}. */
type CombineTokenDoc = {
  combineToken: string;
};

const COMBINED_ADIF_PREAMBLE_TITLE = "W1AW/portable Scheduler";
const ADIF_VERSION = "3.1.1";
const PROGRAM_ID = "github.com/k0swe/w1aw-schedule";

const getProgramVersion = (): string => {
  const envVersion = (
    process.env.PROGRAMVERSION ??
    process.env.FUNCTIONS_PROGRAM_VERSION ??
    process.env.K_REVISION ??
    process.env.GITHUB_SHA ??
    process.env.COMMIT_SHA
  )?.trim();
  if (envVersion) {
    return envVersion;
  }
  return "unknown";
};

export const createCombinedHeader = (
  eventName: string,
  generatedAt: Date = new Date(),
): Record<string, string> => ({
  text: [
    COMBINED_ADIF_PREAMBLE_TITLE,
    eventName,
    generatedAt.toISOString(),
  ].join("\n"),
  ADIF_VER: ADIF_VERSION,
  PROGRAMID: PROGRAM_ID,
  PROGRAMVERSION: getProgramVersion(),
});

export const parseCleansedPath = (
  objectPath: string | undefined,
): CleansedSourceInfo | null => {
  if (!objectPath) {
    return null;
  }
  const match = CLEANSED_PATH_REGEX.exec(objectPath);
  if (!match) {
    return null;
  }

  return {
    eventId: match[1],
  };
};

const stringifyFieldValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim().toUpperCase();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const sortableDate = (value: unknown): string =>
  stringifyFieldValue(value).padStart(8, "0");

const sortableTime = (value: unknown): string =>
  stringifyFieldValue(value).padStart(6, "0");

const normalizeRecordValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeRecordValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => [key, normalizeRecordValue(nestedValue)]);
    return Object.fromEntries(entries);
  }
  return value;
};

const canonicalRecordKey = (record: AdifRecord): string =>
  JSON.stringify(normalizeRecordValue(record));

const recordSortKey = (record: AdifRecord): string => {
  const typedRecord = record as Record<string, unknown>;
  return [
    sortableDate(typedRecord.qso_date),
    sortableTime(typedRecord.time_on),
    stringifyFieldValue(typedRecord.call),
    stringifyFieldValue(typedRecord.band),
    stringifyFieldValue(typedRecord.mode),
    canonicalRecordKey(record),
  ].join("|");
};

export const combineAndSortAdif = (adifs: SimpleAdif[]): SimpleAdif => {
  const combinedRecords = adifs.flatMap((adif) => adif.records ?? []);
  const uniqueByCanonical = new Map<string, AdifRecord>();

  combinedRecords.forEach((record) => {
    const recordKey = canonicalRecordKey(record);
    if (!uniqueByCanonical.has(recordKey)) {
      uniqueByCanonical.set(recordKey, record);
    }
  });

  const records = Array.from(uniqueByCanonical.values())
    .sort((a, b) => recordSortKey(a).localeCompare(recordSortKey(b)));

  return {
    header: {},
    records,
  };
};

const configuredStorageBucket = (() => {
  if (process.env.STORAGE_BUCKET) {
    return process.env.STORAGE_BUCKET;
  }
  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (!firebaseConfig) {
    return undefined;
  }
  try {
    return (JSON.parse(firebaseConfig) as {storageBucket?: string})
      .storageBucket;
  } catch {
    return undefined;
  }
})();

export const getCombineTokenRef = (
  eventId: string,
): admin.firestore.DocumentReference<CombineTokenDoc> => {
  return admin
    .firestore()
    .collection("events")
    .doc(eventId) as admin.firestore.DocumentReference<CombineTokenDoc>;
};

/**
 * How long a rerunStartedAt timestamp is considered active. combineAdif will
 * skip processing while a rerun is in progress, and rerunCleanseAdif will
 * reject concurrent requests within this window.
 */
export const RERUN_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Reads all cleansed ADIF files for an event, combines and sorts them, then
 * writes the result to `{eventId}/combined.adi`. An optional `preWriteCheck`
 * callback is invoked after downloads but before the write; returning `false`
 * from it cancels the write (used by the token mechanism in combineAdifHandler).
 */
export const triggerCombineForEvent = async (
  eventId: string,
  bucket: StorageBucket,
  preWriteCheck?: () => Promise<boolean>,
): Promise<void> => {
  const prefix = `${eventId}/cleansed/`;
  const eventDocRef = admin.firestore().collection("events").doc(eventId);
  const [[files], eventDoc] = await Promise.all([
    bucket.getFiles({ prefix }),
    eventDocRef.get(),
  ]);
  const cleansedAdiFiles = files.filter((f) => f.name.endsWith(".adi"));

  const parsedAdifGroups = await Promise.all(
    cleansedAdiFiles.map(async (adiFile) => {
      try {
        const [content] = await adiFile.download();
        return [AdifParser.parseAdi(content.toString("utf-8"))];
      } catch (error: unknown) {
        logger.error("Failed to parse cleansed ADIF file", {
          eventId,
          sourcePath: adiFile.name,
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    }),
  );

  if (preWriteCheck && !(await preWriteCheck())) {
    return;
  }

  const combined = combineAndSortAdif(parsedAdifGroups.flat());
  if (!eventDoc.exists) {
    logger.warn("Event document not found for combined ADIF header", { eventId });
  }
  const eventName =
    (eventDoc.exists ? eventDoc.data()?.name : undefined) ?? eventId;
  combined.header = createCombinedHeader(eventName);
  const destinationPath = `${eventId}/combined.adi`;
  const combinedAdi = AdifFormatter.formatAdi(combined);

  await bucket.file(destinationPath).save(combinedAdi, {
    contentType: "text/plain; charset=utf-8",
    metadata: {
      contentDisposition: "attachment; filename=\"combined.adi\"",
    },
  });

  logger.info("Combined ADIF file written", {
    destinationPath,
    eventId,
    sourceFileCount: cleansedAdiFiles.length,
    totalRecords: combined.records?.length ?? 0,
  });
};

const combineAdifHandler = async (
  event: StorageEvent,
) => {
  const file = event.data;
  const sourceInfo = parseCleansedPath(file.name);
  if (!sourceInfo) {
    return;
  }

  // Read the event doc to check whether a rerun is in progress. If so, the
  // rerun will call triggerCombineForEvent directly once all files are ready,
  // so individual triggers can be skipped.
  const eventDocRef = admin
    .firestore()
    .collection("events")
    .doc(sourceInfo.eventId);
  const eventDoc = await eventDocRef.get();
  const rerunStartedAt = eventDoc.data()?.rerunStartedAt as
    | admin.firestore.Timestamp
    | undefined;
  if (
    rerunStartedAt &&
    Date.now() - rerunStartedAt.toMillis() < RERUN_LOCK_TTL_MS
  ) {
    logger.info("Rerun in progress; skipping automatic combineAdif", {
      eventId: sourceInfo.eventId,
      sourcePath: file.name,
    });
    return;
  }

  // Write a generation token so that concurrent invocations can detect
  // when a newer run has started and should take precedence.
  const token = randomUUID();
  const tokenRef = getCombineTokenRef(sourceInfo.eventId);
  await tokenRef.set({ combineToken: token }, { merge: true });

  const bucket = admin.storage().bucket(file.bucket);

  // Re-read the token after the expensive download phase. If it changed,
  // a newer invocation has started and will write the correct combined file.
  await triggerCombineForEvent(sourceInfo.eventId, bucket, async () => {
    const tokenDoc = await tokenRef.get();
    const currentToken = tokenDoc.data()?.combineToken;
    if (currentToken !== token) {
      logger.info("Newer combineAdif invocation detected; aborting this run", {
        eventId: sourceInfo.eventId,
        sourcePath: file.name,
        expectedToken: token,
        actualToken: currentToken,
      });
      return false;
    }
    return true;
  });
};

export const combineAdif = onObjectFinalized(
  {
    ...(configuredStorageBucket ? { bucket: configuredStorageBucket } : {}),
    memory: "2GiB",
  },
  combineAdifHandler,
);
