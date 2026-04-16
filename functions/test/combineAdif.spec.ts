import * as assert from "assert";
import { AdifParser } from "adif-parser-ts";
import { combineAndSortAdif, parseCleansedPath } from "../src/combineAdif";

describe("combineAdif helpers", () => {
  describe("parseCleansedPath", () => {
    it("should parse event ID from expected cleansed path", () => {
      const parsed = parseCleansedPath("my-event/cleansed/123.adi");
      assert.deepEqual(parsed, { eventId: "my-event" });
    });

    it("should return null for non-matching paths", () => {
      assert.equal(parseCleansedPath("my-event/combined.adi"), null);
      assert.equal(parseCleansedPath(undefined), null);
    });
  });

  describe("combineAndSortAdif", () => {
    it("should deduplicate and sort records by date/time", () => {
      const adifOne = AdifParser.parseAdi([
        "Exported by test logger",
        "<adif_ver:5>3.1.0",
        "<eoh>",
        "<call:5>K1ABC<qso_date:8>20250705<time_on:6>090000<eor>",
        "<call:5>K2XYZ<qso_date:8>20250705<time_on:6>083000<eor>",
      ].join("\n"));

      const adifTwo = AdifParser.parseAdi([
        "Exported by test logger",
        "<adif_ver:5>3.1.0",
        "<eoh>",
        "<call:5>K1ABC<qso_date:8>20250705<time_on:6>090000<eor>",
        "<call:5>K9QSO<qso_date:8>20250704<time_on:6>230000<eor>",
      ].join("\n"));

      const combined = combineAndSortAdif([adifOne, adifTwo]);

      assert.ok(combined.records);
      assert.equal(combined.records!.length, 3);
      assert.equal(combined.records![0].call, "K9QSO");
      assert.equal(combined.records![1].call, "K2XYZ");
      assert.equal(combined.records![2].call, "K1ABC");
    });
  });
});
