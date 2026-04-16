import * as assert from "assert";
import { AdifFormatter, AdifParser } from "adif-parser-ts";
import { normalizeAdif, parseOriginalPath } from "../src/cleanseAdif";

describe("cleanseAdif helpers", () => {
  describe("parseOriginalPath", () => {
    it("should parse event and user IDs from expected source path", () => {
      const parsed = parseOriginalPath("my-event/original/my-user/123.adi");
      assert.deepEqual(parsed, { eventId: "my-event", userId: "my-user" });
    });

    it("should return null for non-matching paths", () => {
      assert.equal(parseOriginalPath("my-event/cleansed/123.adi"), null);
      assert.equal(parseOriginalPath(undefined), null);
    });
  });

  describe("normalizeAdif", () => {
    it("should set station_callsign and operator on each parsed record", () => {
      const source = [
        "My Header",
        "<adif_ver:5>3.1.0",
        "<eoh>",
        "<call:5>K1ABC<eor>",
        "<call:5>K2XYZ<operator:6>IGNORE<eor>",
      ].join("\n");
      const parsed = AdifParser.parseAdi(source);

      const normalized = normalizeAdif(parsed, "W1AW", "N0CALL");

      assert.ok(normalized.records);
      assert.equal(normalized.records!.length, 2);
      assert.equal(normalized.records![0].station_callsign, "W1AW");
      assert.equal(normalized.records![0].operator, "N0CALL");
      assert.equal(normalized.records![1].station_callsign, "W1AW");
      assert.equal(normalized.records![1].operator, "N0CALL");
    });

    it("should remove station fields from header and only set them on records", () => {
      const source = [
        "Exported by test logger",
        "<adif_ver:5>3.1.0",
        "<station_callsign:5>K0OLD",
        "<operator:5>K9OLD",
        "<eoh>",
        "<call:5>K1ABC<eor>",
      ].join("\n");
      const parsed = AdifParser.parseAdi(source);

      const normalized = normalizeAdif(parsed, "W1AW", "N0CALL");
      const formatted = AdifFormatter.formatAdi(normalized);
      const [headerText] = formatted.split("<eoh>");

      assert.ok(!headerText.includes("<station_callsign:"));
      assert.ok(!headerText.includes("<operator:"));
      assert.ok(!headerText.trimEnd().endsWith('"'));
      assert.ok(formatted.includes("<station_callsign:4>W1AW"));
      assert.ok(formatted.includes("<operator:6>N0CALL"));
    });
  });
});
