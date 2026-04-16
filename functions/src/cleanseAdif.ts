import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { AdifFormatter, AdifParser, SimpleAdif } from "adif-parser-ts";

const ORIGINAL_PATH_REGEX = /^([^/]+)\/original\/([^/]+)\/(.+)$/;

type SourceInfo = {
  eventId: string;
  userId: string;
};

export const parseOriginalPath = (
  objectPath: string | undefined,
): SourceInfo | null => {
  if (!objectPath) {
    return null;
  }
  const match = ORIGINAL_PATH_REGEX.exec(objectPath);
  if (!match) {
    return null;
  }

  return {
    eventId: match[1],
    userId: match[2],
  };
};

export const normalizeAdif = (
  adif: SimpleAdif,
  eventCallsign: string,
  userCallsign: string,
): SimpleAdif => {
  const records = (adif.records ?? []).map((record) => ({
    ...record,
    station_callsign: eventCallsign,
    operator: userCallsign,
  }));

  return {
    ...adif,
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

const cleanseAdifHandler = async (
  event: StorageEvent,
) => {
  const file = event.data;
  const sourceInfo = parseOriginalPath(file.name);
  if (!sourceInfo) {
    return;
  }

  const bucket = admin.storage().bucket(file.bucket);
  const sourceFile = bucket.file(file.name!);
  const [sourceContent] = await sourceFile.download();
  const sourceText = sourceContent.toString("utf-8");

  const eventDocRef = admin
    .firestore()
    .collection("events")
    .doc(sourceInfo.eventId);
  const userDocRef = admin.firestore().collection("users").doc(sourceInfo.userId);

  const [eventDoc, userDoc] = await Promise.all([
    eventDocRef.get(),
    userDocRef.get(),
  ]);

  if (!eventDoc.exists) {
    logger.error("Event document not found for ADIF cleanse", {
      eventId: sourceInfo.eventId,
      sourcePath: file.name,
    });
    return;
  }

  if (!userDoc.exists) {
    logger.error("User document not found for ADIF cleanse", {
      userId: sourceInfo.userId,
      sourcePath: file.name,
    });
    return;
  }

  const eventCallsign = eventDoc.data()?.eventCallsign as string | undefined;
  const userCallsign = userDoc.data()?.callsign as string | undefined;

  if (!eventCallsign || !userCallsign) {
    logger.error("Missing callsign data for ADIF cleanse", {
      eventId: sourceInfo.eventId,
      userId: sourceInfo.userId,
      eventCallsign,
      userCallsign,
      sourcePath: file.name,
    });
    return;
  }

  const parsed = AdifParser.parseAdi(sourceText);
  const normalized = normalizeAdif(parsed, eventCallsign, userCallsign);
  const cleansedAdi = AdifFormatter.formatAdi(normalized);

  const unixTime = file.timeCreated
    ? (typeof file.timeCreated === "string"
      ? Date.parse(file.timeCreated)
      : file.timeCreated.getTime())
    : Date.now();
  const destinationPath = `${sourceInfo.eventId}/cleansed/${unixTime}.adi`;

  await bucket.file(destinationPath).save(cleansedAdi, {
    contentType: file.contentType || "text/plain; charset=utf-8",
  });

  logger.info("Cleansed ADIF file written", {
    sourcePath: file.name,
    destinationPath,
    eventId: sourceInfo.eventId,
    userId: sourceInfo.userId,
  });
};

export const cleanseAdif = onObjectFinalized(
  configuredStorageBucket ? { bucket: configuredStorageBucket } : {},
  cleanseAdifHandler,
);
