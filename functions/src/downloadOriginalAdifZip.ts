import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import JSZip from "jszip";
import { validateFirebaseIdToken } from "./validateFirebaseToken";

const ORIGINAL_PATH_REGEX = /^([^/]+)\/original\/([^/]+)\/(.+)$/;
const LEGACY_TIMESTAMP_PREFIX_REGEX = /^\d{10,13}-/;
const INVALID_FOLDER_PATH_CHARS_REGEX = /[\\/]/g;
const INVALID_FILENAME_PATH_CHARS_REGEX = /[/\\:*?"<>|]/g;

type ParsedOriginalPath = {
  eventId: string;
  userId: string;
  objectName: string;
};

type SourceOriginalFile = {
  fullPath: string;
  userId: string;
  uploadTime: number;
  originalFileName: string;
  download: () => Promise<[Buffer]>;
};

type ZipOriginalFile = {
  source: SourceOriginalFile;
  folderName: string;
  zipFileName: string;
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
    return (JSON.parse(firebaseConfig) as { storageBucket?: string })
      .storageBucket;
  } catch {
    return undefined;
  }
})();

export const parseOriginalPath = (
  objectPath: string,
): ParsedOriginalPath | null => {
  const match = ORIGINAL_PATH_REGEX.exec(objectPath);
  if (!match) {
    return null;
  }
  return {
    eventId: match[1],
    userId: match[2],
    objectName: match[3],
  };
};

export const addOrdinalSuffix = (
  fileName: string,
  ordinal: number,
): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return `${fileName}-${ordinal}`;
  }
  const basename = fileName.slice(0, lastDotIndex);
  const extension = fileName.slice(lastDotIndex);
  return `${basename}-${ordinal}${extension}`;
};

const sanitizeFolderName = (callsign: string | undefined, userId: string) => {
  const trimmed = callsign?.trim();
  const sanitized = trimmed
    ? trimmed.replace(INVALID_FOLDER_PATH_CHARS_REGEX, "_")
    : "";
  return sanitized || userId;
};

const sanitizeFileName = (fileName: string) => {
  const trimmed = fileName.trim();
  const sanitized = trimmed.replace(INVALID_FILENAME_PATH_CHARS_REGEX, "_");
  return sanitized || "upload.adi";
};

export const deriveOriginalFileName = (
  objectName: string,
  originalFileName: string | undefined,
) => {
  const fromMetadata = originalFileName?.trim();
  if (fromMetadata) {
    return sanitizeFileName(fromMetadata);
  }
  return sanitizeFileName(
    objectName.replace(LEGACY_TIMESTAMP_PREFIX_REGEX, ""),
  );
};

export const buildZipOriginalFiles = (
  sourceFiles: SourceOriginalFile[],
  userFolders: Map<string, string>,
): ZipOriginalFile[] => {
  const byUser = new Map<string, SourceOriginalFile[]>();
  for (const sourceFile of sourceFiles) {
    const bucket = byUser.get(sourceFile.userId) ?? [];
    bucket.push(sourceFile);
    byUser.set(sourceFile.userId, bucket);
  }

  const zipFiles: ZipOriginalFile[] = [];

  for (const [userId, userFiles] of byUser.entries()) {
    const folderName = userFolders.get(userId) ?? userId;
    const sortedFiles = [...userFiles].sort((a, b) => {
      if (a.uploadTime !== b.uploadTime) {
        return a.uploadTime - b.uploadTime;
      }
      return a.fullPath.localeCompare(b.fullPath);
    });

    const duplicateTotals = new Map<string, number>();
    for (const file of sortedFiles) {
      duplicateTotals.set(
        file.originalFileName,
        (duplicateTotals.get(file.originalFileName) ?? 0) + 1,
      );
    }

    const duplicateOrdinals = new Map<string, number>();
    for (const file of sortedFiles) {
      const duplicateCount = duplicateTotals.get(file.originalFileName) ?? 0;
      let zipFileName = file.originalFileName;
      if (duplicateCount > 1) {
        const ordinal = (duplicateOrdinals.get(file.originalFileName) ?? 0) + 1;
        duplicateOrdinals.set(file.originalFileName, ordinal);
        zipFileName = addOrdinalSuffix(file.originalFileName, ordinal);
      }
      zipFiles.push({
        source: file,
        folderName,
        zipFileName,
      });
    }
  }

  return zipFiles;
};

const buildUserFolderMap = (
  sourceFiles: SourceOriginalFile[],
  userCallsigns: Map<string, string>,
) => {
  const map = new Map<string, string>();
  const usedNames = new Map<string, number>();

  for (const sourceFile of sourceFiles) {
    if (map.has(sourceFile.userId)) {
      continue;
    }
    const baseName = sanitizeFolderName(
      userCallsigns.get(sourceFile.userId),
      sourceFile.userId,
    );
    const currentCount = usedNames.get(baseName) ?? 0;
    usedNames.set(baseName, currentCount + 1);
    const folderName = currentCount === 0 ?
      baseName :
      `${baseName}-${currentCount + 1}`;
    map.set(sourceFile.userId, folderName);
  }

  return map;
};

const fetchSourceOriginalFiles = async (
  eventId: string,
) => {
  const bucket = configuredStorageBucket ?
    admin.storage().bucket(configuredStorageBucket) :
    admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: `${eventId}/original/` });
  const sourceFiles = files.filter((file) => !file.name.endsWith("/"));

  const fileEntries = await Promise.all(sourceFiles.map(async (sourceFile) => {
    const parsedPath = parseOriginalPath(sourceFile.name);
    if (!parsedPath || parsedPath.eventId !== eventId) {
      return null;
    }
    const [metadata] = await sourceFile.getMetadata();
    const uploadTime = metadata.timeCreated ?
      Date.parse(metadata.timeCreated) :
      Number.MAX_SAFE_INTEGER;
    const customMetadata = metadata.customMetadata as
      | Record<string, string>
      | undefined;

    return {
      fullPath: sourceFile.name,
      userId: parsedPath.userId,
      uploadTime,
      originalFileName: deriveOriginalFileName(
        parsedPath.objectName,
        customMetadata?.["originalFileName"],
      ),
      download: () => sourceFile.download(),
    } satisfies SourceOriginalFile;
  }));

  return fileEntries.filter((entry): entry is SourceOriginalFile => !!entry);
};

const fetchUserCallsigns = async (
  userIds: string[],
) => {
  const uniqueUserIds = [...new Set(userIds)];
  const userRefs = uniqueUserIds.map(
    (uid) => admin.firestore().collection("users").doc(uid),
  );
  if (userRefs.length === 0) {
    return new Map<string, string>();
  }

  const userDocs = await admin.firestore().getAll(...userRefs);
  const callsignsByUserId = new Map<string, string>();
  for (const userDoc of userDocs) {
    if (!userDoc.exists) {
      continue;
    }
    const callsign = userDoc.data()?.callsign;
    if (typeof callsign === "string" && callsign.trim()) {
      callsignsByUserId.set(userDoc.id, callsign.trim());
    }
  }
  return callsignsByUserId;
};

const buildDownloadFilename = (eventId: string, eventCallsign: unknown) => {
  const preferred = typeof eventCallsign === "string" ?
    eventCallsign.trim() :
    "";
  const baseName = preferred || eventId;
  const safe = baseName.replace(/[^A-Za-z0-9._-]+/g, "_");
  return `${safe || "event"}-originals.zip`;
};

export const downloadOriginalAdifZip = onRequest(
  { cors: true, memory: "1GiB", timeoutSeconds: 3600 },
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

    try {
      const sourceFiles = await fetchSourceOriginalFiles(eventId);
      const userCallsigns = await fetchUserCallsigns(
        sourceFiles.map((file) => file.userId),
      );
      const userFolders = buildUserFolderMap(sourceFiles, userCallsigns);
      const zipEntries = buildZipOriginalFiles(sourceFiles, userFolders);

      const zip = new JSZip();
      for (const entry of zipEntries) {
        const [content] = await entry.source.download();
        zip.file(`${entry.folderName}/${entry.zipFileName}`, content);
      }

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      const downloadFileName = buildDownloadFilename(
        eventId,
        eventDoc.data()?.eventCallsign,
      );

      response.setHeader("Content-Type", "application/zip");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadFileName}"`,
      );
      response.status(200).send(zipBuffer);
    } catch (error) {
      logger.error("Failed to build original ADIF ZIP", {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      response.status(500).send({
        error: "Failed to prepare original ADIF ZIP download",
      });
    }
  },
);
