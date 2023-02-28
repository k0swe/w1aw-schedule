const { readFileSync, createWriteStream } = require("fs");
const http = require("http");

const testing = require("@firebase/rules-unit-testing");
const { initializeTestEnvironment, assertFails, assertSucceeds } = testing;

const {
  doc,
  getDoc,
  setDoc,
  setLogLevel,
  deleteDoc,
  updateDoc,
} = require("firebase/firestore");

/** @type testing.RulesTestEnvironment */
let testEnv;

before(async () => {
  // Silence expected rules rejections from Firestore SDK. Unexpected rejections
  // will still bubble up and will be thrown as an error (failing the tests).
  setLogLevel("error");

  testEnv = await initializeTestEnvironment({
    projectId: "firestore-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  // Delete all the FirebaseApp instances created during testing.
  // Note: this does not affect or clear any data.
  await testEnv.cleanup();

  // Write the coverage report to a file
  const coverageFile = "firestore-coverage.html";
  const fstream = createWriteStream(coverageFile);
  await new Promise((resolve, reject) => {
    const { host, port } = testEnv.emulators.firestore;
    const quotedHost = host.includes(":") ? `[${host}]` : host;
    http.get(
      `http://${quotedHost}:${port}/emulator/v1/projects/${testEnv.projectId}:ruleCoverage.html`,
      (res) => {
        res.pipe(fstream, { end: true });

        res.on("end", resolve);
        res.on("error", reject);
      }
    );
  });

  console.log(`View firestore rule coverage information at ${coverageFile}\n`);
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("User profiles", () => {
  it("should let the user read their own data", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/joe"), { foo: "bar" });
    });

    const joeDb = testEnv.authenticatedContext("joe").firestore();

    await assertSucceeds(getDoc(doc(joeDb, "users/joe")));
  });

  it("should not allow unauthed reading of users' data", async () => {
    unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthedDb, "users/joe")));
  });

  it("should not allow authed reading of other users' data", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/joe"), { foo: "bar" });
    });

    const tanyaDb = testEnv.authenticatedContext("tanya").firestore();

    await assertFails(getDoc(doc(tanyaDb, "users/joe")));
  });

  it("should allow users to write most of their own data", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "users/alice"), {
        name: "Alice",
        callsign: "t3st",
        gridSquare: "DM33",
      })
    );
  });

  it("should allow users to delete their own data", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(deleteDoc(doc(aliceDb, "users/alice")));
  });

  it("should not allow users to write their approval status", async () => {
    const raviDb = testEnv.authenticatedContext("ravi").firestore();

    await assertFails(
      updateDoc(doc(raviDb, "users/ravi"), {
        status: "Approved",
      })
    );
  });
});

describe("Section information", () => {
  it("should allow anyone to read section information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sections/colorado"), {
        name: "Colorado",
      });
    });
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(unauthedDb, "sections/colorado")));
  });

  it("should not allow anyone to write section information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sections/colorado"), {
        name: "Colorado",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(aliceDb, "sections/colorado"), {
        name: "The best section",
      })
    );
  });

  it("should not allow anyone to delete section information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sections/colorado"), {
        name: "Colorado",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(deleteDoc(doc(aliceDb, "sections/colorado")));
  });
});

describe("Shifts", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      await setDoc(doc(fs, "sections/colorado/shifts/shift1"), {
        time: new Date(),
        band: '20',
        mode: 'phone',
        reservedBy: null,
      });
      await setDoc(doc(fs, "sections/colorado/shifts/shift2"), {
        time: new Date(),
        band: '40',
        mode: 'phone',
        reservedBy: 'ravi',
      });
      await setDoc(doc(fs, "sections/colorado/shifts/shift3"), {
        time: new Date(),
        band: '80',
        mode: 'phone',
        reservedBy: 'alice',
      });
    });
  });

  it("should allow any authed user to read shift info", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "sections/colorado/shifts/shift1")));
    await assertSucceeds(getDoc(doc(aliceDb, "sections/colorado/shifts/shift2")));
    await assertSucceeds(getDoc(doc(aliceDb, "sections/colorado/shifts/shift3")));
  });

  it("should allow a user to reserve an open shift for themselves", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift1"), {reservedBy: 'alice'}));    
  });

  it("should allow a user to cancel their shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift3"), {reservedBy: null}));    
  });

  it("should now allow a user to reserve an open shift for someone else", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift1"), {reservedBy: 'ravi'}));    
  });

  it("should now allow a user to cancel someone else's shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift2"), {reservedBy: null}));    
  });

  it("should now allow a user to take over someone else's shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift2"), {reservedBy: 'alice'}));    
  });

  it("should now allow a user to overwrite shift info", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "sections/colorado/shifts/shift1"), {mode: 'digital'}));    
  });
});
