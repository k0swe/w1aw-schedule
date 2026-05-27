import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { AdifFormatter, AdifParser, SimpleAdif } from "adif-parser-ts";
import { validateFirebaseIdToken } from "./validateFirebaseToken";

const ORIGINAL_PATH_REGEX = /^([^/]+)\/original\/([^/]+)\/(.+)$/;

type SourceInfo = {
  eventId: string;
  userId: string;
};

type SourceFileObject = {
  name?: string;
  bucket: string;
  contentType?: string;
  timeCreated?: string | Date;
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
  const header = {...(adif.header ?? {})};
  delete header.station_callsign;
  delete header.operator;
  const records = (adif.records ?? []).map((record) => ({
    ...record,
    station_callsign: eventCallsign,
    operator: userCallsign,
  }));

  return {
    ...adif,
    header,
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

export const cleanseOriginalAdifObject = async (
  file: SourceFileObject,
) => {
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

const cleanseAdifHandler = async (
  event: StorageEvent,
) => {
  await cleanseOriginalAdifObject(event.data);
};

export const rerunCleanseAdif = onRequest(
  { cors: true, memory: "512MiB", timeoutSeconds: 540 },
  async (request, response) => {
    const token = await validateFirebaseIdToken(request, response);
    if (!token) {
      return;
    }

    const eventId = request.query.eventId?.toString();
    if (!eventId) {
      response.status(400).send({ error: "eventId query parameter is required" });
      return;
    }

    const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      response.status(404).send({ error: "Event not found" });
      return;
    }

    const admins = eventDoc.data()?.admins;
    const isEventAdmin = Array.isArray(admins) && admins.includes(token.uid);
    if (!isEventAdmin) {
      response.status(403).send({ error: "Unauthorized" });
      return;
    }

    const bucket = configuredStorageBucket
      ? admin.storage().bucket(configuredStorageBucket)
      : admin.storage().bucket();
    const prefix = `${eventId}/original/`;
    const [files] = await bucket.getFiles({ prefix });
    const sourceFiles = files.filter((file) =>
      file.name.startsWith(prefix) && !file.name.endsWith("/"),
    );

    let processed = 0;
    const failures: string[] = [];

    for (const sourceFile of sourceFiles) {
      try {
        const [metadata] = await sourceFile.getMetadata();
        await cleanseOriginalAdifObject({
          name: sourceFile.name,
          bucket: sourceFile.bucket.name,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
        });
        processed += 1;
      } catch (error) {
        failures.push(sourceFile.name);
        logger.error("Failed to re-run ADIF cleanse for original file", {
          eventId,
          sourcePath: sourceFile.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    response.send({
      eventId,
      originalFileCount: sourceFiles.length,
      processed,
      failed: failures.length,
      failedPaths: failures,
    });
  },
);

export const cleanseAdif = onObjectFinalized(
  configuredStorageBucket ? { bucket: configuredStorageBucket } : {},
  cleanseAdifHandler,
);
