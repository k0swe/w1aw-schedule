import * as assert from "assert";
import * as admin from "firebase-admin";
import { AdifParser } from "adif-parser-ts";
import {
  combineAndSortAdif,
  createCombinedHeader,
  getCombineTokenRef,
  parseCleansedPath,
} from "../src/combineAdif";

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
      assert.deepEqual(combined.header, {});
      assert.equal(combined.records!.length, 3);
      assert.equal(combined.records![0].call, "K9QSO");
      assert.equal(combined.records![1].call, "K2XYZ");
      assert.equal(combined.records![2].call, "K1ABC");
    });
  });

  describe("createCombinedHeader", () => {
    it("should build a new ADIF header with preamble and expected tags", () => {
      const originalProgramVersion = process.env.PROGRAMVERSION;
      process.env.PROGRAMVERSION = "abcdef123456";
      try {
        const generatedAt = new Date("2026-07-05T09:30:00.000Z");
        const header = createCombinedHeader("Colorado Event", generatedAt);

        assert.equal(
          header.text,
          [
            "W1AW/portable Scheduler",
            "Colorado Event",
            "2026-07-05T09:30:00.000Z",
          ].join("\n"),
        );
        assert.equal(header.ADIF_VER, "3.1.1");
        assert.equal(header.PROGRAMID, "github.com/k0swe/w1aw-schedule");
        assert.equal(header.PROGRAMVERSION, "abcdef123456");
      } finally {
        if (originalProgramVersion === undefined) {
          delete process.env.PROGRAMVERSION;
        } else {
          process.env.PROGRAMVERSION = originalProgramVersion;
        }
      }
    });
  });
});

describe("combineAdif generation token", () => {
  const eventId = "token-test-event";

  before(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "w1aw-test" });
    }
  });

  afterEach(async () => {
    await getCombineTokenRef(eventId).delete();
  });

  it("should write combineToken to Firestore and read it back as the same value", async () => {
    const token = "test-uuid-1234";
    const ref = getCombineTokenRef(eventId);
    await ref.set({ combineToken: token }, { merge: true });
    const doc = await ref.get();
    assert.equal(doc.data()?.combineToken, token);
  });

  it("should detect token match (no concurrent update)", async () => {
    const token = "test-uuid-match";
    const ref = getCombineTokenRef(eventId);
    await ref.set({ combineToken: token }, { merge: true });
    const doc = await ref.get();
    const currentToken = doc.data()?.combineToken;
    // Tokens match: the current run should proceed
    assert.equal(currentToken, token);
  });

  it("should detect token mismatch (concurrent update overwrote token)", async () => {
    const originalToken = "test-uuid-original";
    const newerToken = "test-uuid-newer";
    const ref = getCombineTokenRef(eventId);

    // Original invocation writes its token
    await ref.set({ combineToken: originalToken }, { merge: true });
    // A newer invocation overwrites with its own token
    await ref.set({ combineToken: newerToken }, { merge: true });

    const doc = await ref.get();
    const currentToken = doc.data()?.combineToken;
    // The original run should abort because tokens differ
    assert.notEqual(currentToken, originalToken);
    assert.equal(currentToken, newerToken);
  });
});
