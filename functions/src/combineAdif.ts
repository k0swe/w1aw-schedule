import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { AdifFormatter, AdifParser, SimpleAdif } from "adif-parser-ts";

const CLEANSED_PATH_REGEX = /^([^/]+)\/cleansed\/([^/]+)$/;

type CleansedSourceInfo = {
  eventId: string;
};

type AdifRecord = NonNullable<SimpleAdif["records"]>[number];

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
  const firstHeader = adifs.find((adif) => adif.header)?.header;
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
    header: firstHeader ?? {},
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

const combineAdifHandler = async (
  event: StorageEvent,
) => {
  const file = event.data;
  const sourceInfo = parseCleansedPath(file.name);
  if (!sourceInfo) {
    return;
  }

  const bucket = admin.storage().bucket(file.bucket);
  const prefix = `${sourceInfo.eventId}/cleansed/`;
  const [files] = await bucket.getFiles({ prefix });
  const cleansedAdiFiles = files.filter((listedFile) =>
    listedFile.name.endsWith(".adi"),
  );

  const parsedAdifGroups = await Promise.all(cleansedAdiFiles.map(async (adiFile) => {
    try {
      const [content] = await adiFile.download();
      return [AdifParser.parseAdi(content.toString("utf-8"))];
    } catch (error: unknown) {
      logger.error("Failed to parse cleansed ADIF file", {
        eventId: sourceInfo.eventId,
        sourcePath: adiFile.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }));

  const combined = combineAndSortAdif(parsedAdifGroups.flat());
  const destinationPath = `${sourceInfo.eventId}/combined.adi`;
  const combinedAdi = AdifFormatter.formatAdi(combined);

  await bucket.file(destinationPath).save(combinedAdi, {
    contentType: "text/plain; charset=utf-8",
  });

  logger.info("Combined ADIF file written", {
    sourcePath: file.name,
    destinationPath,
    eventId: sourceInfo.eventId,
    sourceFileCount: cleansedAdiFiles.length,
    totalRecords: combined.records?.length ?? 0,
  });
};

export const combineAdif = onObjectFinalized(
  configuredStorageBucket ? { bucket: configuredStorageBucket } : {},
  combineAdifHandler,
);
