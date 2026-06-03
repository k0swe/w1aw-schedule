import * as assert from "assert";
import {
  addOrdinalSuffix,
  buildZipOriginalFiles,
  deriveOriginalFileName,
  parseOriginalPath,
} from "../src/downloadOriginalAdifZip";

describe("downloadOriginalAdifZip helpers", () => {
  describe("parseOriginalPath", () => {
    it("should parse event ID, user ID, and object name", () => {
      const parsed = parseOriginalPath("my-event/original/my-user/123.adi");
      assert.deepEqual(parsed, {
        eventId: "my-event",
        userId: "my-user",
        objectName: "123.adi",
      });
    });

    it("should return null for non-original paths", () => {
      assert.equal(parseOriginalPath("my-event/cleansed/123.adi"), null);
    });
  });

  describe("deriveOriginalFileName", () => {
    it("should prefer originalFileName metadata", () => {
      const fileName = deriveOriginalFileName("123-test.adi", "logbook.adi");
      assert.equal(fileName, "logbook.adi");
    });

    it("should fall back to object name without timestamp prefix", () => {
      const fileName = deriveOriginalFileName("1717350893000-test.adi", undefined);
      assert.equal(fileName, "test.adi");
    });
  });

  describe("addOrdinalSuffix", () => {
    it("should insert ordinal before extension", () => {
      assert.equal(addOrdinalSuffix("logbook.adi", 2), "logbook-2.adi");
    });

    it("should append ordinal for extensionless names", () => {
      assert.equal(addOrdinalSuffix("logbook", 2), "logbook-2");
    });
  });

  describe("buildZipOriginalFiles", () => {
    it("should add ordinals to duplicate names in upload order per user", () => {
      const zipEntries = buildZipOriginalFiles(
        [
          {
            fullPath: "event/original/u1/2000-second.adi",
            userId: "u1",
            uploadTime: 2000,
            originalFileName: "station.adi",
            download: async () => [Buffer.from("b")],
          },
          {
            fullPath: "event/original/u1/1000-first.adi",
            userId: "u1",
            uploadTime: 1000,
            originalFileName: "station.adi",
            download: async () => [Buffer.from("a")],
          },
          {
            fullPath: "event/original/u2/1500-other.adi",
            userId: "u2",
            uploadTime: 1500,
            originalFileName: "station.adi",
            download: async () => [Buffer.from("c")],
          },
        ],
        new Map([
          ["u1", "K0SWE"],
          ["u2", "N0CALL"],
        ]),
      );

      const namesByPath = new Map(
        zipEntries.map((entry) => [entry.source.fullPath, entry.zipFileName]),
      );
      assert.equal(namesByPath.get("event/original/u1/1000-first.adi"), "station-1.adi");
      assert.equal(
        namesByPath.get("event/original/u1/2000-second.adi"),
        "station-2.adi",
      );
      assert.equal(namesByPath.get("event/original/u2/1500-other.adi"), "station.adi");
    });
  });
});
