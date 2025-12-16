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

const testEventId = "test-event-123";

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
      },
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
      }),
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
      }),
    );
  });

  it("should not allow users to write their multi-shift status", async () => {
    const raviDb = testEnv.authenticatedContext("ravi").firestore();

    await assertFails(
      updateDoc(doc(raviDb, "users/ravi"), {
        multiShift: true,
      }),
    );
  });

  it("should allow admins to read any user", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      await setDoc(doc(fs, `events/${testEventId}`), {
        admins: ["amanda"],
      });
      await setDoc(doc(fs, "users/alice"), {
        name: "Alice",
        callsign: "t3st",
        gridSquare: "DM33",
      });
    });
    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(getDoc(doc(amandaDb, "users/alice")));
  });

  it("should allow admins to write approval status", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      await setDoc(doc(fs, `events/${testEventId}`), {
        admins: ["amanda"],
      });
      await setDoc(doc(fs, "users/alice"), {
        name: "Alice",
        callsign: "t3st",
        gridSquare: "DM33",
        status: "Applied",
      });
    });
    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      updateDoc(doc(amandaDb, "users/alice"), {
        status: "Approved",
      }),
    );
  });
});

it("should allow admins to write multi-shift status", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const fs = context.firestore();
    await setDoc(doc(fs, `events/${testEventId}`), {
      admins: ["amanda"],
    });
    await setDoc(doc(fs, "users/alice"), {
      name: "Alice",
      callsign: "t3st",
      gridSquare: "DM33",
      status: "Applied",
      multiShift: false,
    });
  });
  const amandaDb = testEnv.authenticatedContext("amanda").firestore();

  await assertSucceeds(
    updateDoc(doc(amandaDb, "users/alice"), {
      multiShift: true,
    }),
  );
});

describe("Event information", () => {
  it("should allow anyone to read event information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `events/${testEventId}`), {
        name: "Colorado",
        admins: ["amanda"],
      });
    });
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(unauthedDb, `events/${testEventId}`)));
  });

  it("should not allow anyone to write event information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `events/${testEventId}`), {
        name: "Colorado",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(aliceDb, `events/${testEventId}`), {
        name: "The best event",
      }),
    );
  });

  it("should not allow anyone to delete event information", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `events/${testEventId}`), {
        name: "Colorado",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(deleteDoc(doc(aliceDb, `events/${testEventId}`)));
  });
});

describe("Shifts", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      await setDoc(doc(fs, `events/${testEventId}`), {
        admins: ["amanda"],
      });
      await setDoc(doc(fs, `events/${testEventId}/shifts/shift1`), {
        time: new Date(),
        band: "20",
        mode: "phone",
        reservedBy: null,
      });
      await setDoc(doc(fs, `events/${testEventId}/shifts/shift2`), {
        time: new Date(),
        band: "40",
        mode: "phone",
        reservedBy: "ravi",
      });
      await setDoc(doc(fs, `events/${testEventId}/shifts/shift3`), {
        time: new Date(),
        band: "80",
        mode: "phone",
        reservedBy: "alice",
      });
    });
  });

  it("should allow any authed user to read shift info", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      getDoc(doc(aliceDb, `events/${testEventId}/shifts/shift1`)),
    );
    await assertSucceeds(
      getDoc(doc(aliceDb, `events/${testEventId}/shifts/shift2`)),
    );
    await assertSucceeds(
      getDoc(doc(aliceDb, `events/${testEventId}/shifts/shift3`)),
    );
  });

  it("should allow a user to reserve an open shift for themselves", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift1`), {
        reservedBy: "alice",
      }),
    );
  });

  it("should allow a user to cancel their shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift3`), {
        reservedBy: null,
      }),
    );
  });

  it("should not allow a user to reserve an open shift for someone else", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift1`), {
        reservedBy: "ravi",
      }),
    );
  });

  it("should not allow a user to cancel someone else's shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift2`), {
        reservedBy: null,
      }),
    );
  });

  it("should not allow a user to take over someone else's shift reservation", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift2`), {
        reservedBy: "alice",
      }),
    );
  });

  it("should not allow a user to overwrite shift info", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(aliceDb, `events/${testEventId}/shifts/shift1`), {
        mode: "digital",
      }),
    );
  });

  it("should allow an admin to cancel another user's shift reservation", async function () {
    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    await assertSucceeds(
      updateDoc(doc(amandaDb, `events/${testEventId}/shifts/shift2`), {
        reservedBy: null,
      }),
    );
  });

  it("should allow an admin to reserve a shift for another user", async function () {
    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    await assertSucceeds(
      updateDoc(doc(amandaDb, `events/${testEventId}/shifts/shift1`), {
        reservedBy: "alice",
      }),
    );
  });
});

describe("Multi-event support", () => {
  const newEvent = "testEvent123";

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      // Setup Colorado event with amanda as admin
      await setDoc(doc(fs, `events/${testEventId}`), {
        admins: ["amanda"],
      });
      // Setup new test event with bob as admin
      await setDoc(doc(fs, `events/${newEvent}`), {
        name: "Test Event",
        admins: ["bob"],
      });
      await setDoc(doc(fs, `events/${newEvent}/shifts/shift1`), {
        time: new Date(),
        band: "20",
        mode: "phone",
        reservedBy: null,
      });
      await setDoc(doc(fs, `events/${newEvent}/shifts/shift2`), {
        time: new Date(),
        band: "40",
        mode: "phone",
        reservedBy: "alice",
      });
    });
  });

  it("should allow reading event information for any event", async function () {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(unauthedDb, `events/${newEvent}`)));
  });

  it("should allow a user to reserve a shift in any event", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, `events/${newEvent}/shifts/shift1`), {
        reservedBy: "alice",
        reservedDetails: {},
      }),
    );
  });

  it("should allow a user to cancel their shift in any event", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, `events/${newEvent}/shifts/shift2`), {
        reservedBy: null,
        reservedDetails: null,
      }),
    );
  });

  it("should allow event-specific admin to modify shifts in their event", async function () {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(
      updateDoc(doc(bobDb, `events/${newEvent}/shifts/shift1`), {
        reservedBy: "alice",
        reservedDetails: {},
      }),
    );
  });

  it("should not allow admin from one event to modify shifts in another event", async function () {
    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    // Amanda is admin for Colorado but not for newEvent
    await assertFails(
      updateDoc(doc(amandaDb, `events/${newEvent}/shifts/shift1`), {
        reservedBy: "alice",
        reservedDetails: {},
      }),
    );
  });
});

describe("Per-event approval", () => {
  const newEvent = "testEvent456";

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const fs = context.firestore();
      // Setup Colorado event with amanda as admin
      await setDoc(doc(fs, `events/${testEventId}`), {
        admins: ["amanda"],
      });
      // Setup new test event with bob as admin
      await setDoc(doc(fs, `events/${newEvent}`), {
        name: "Another Test Event",
        admins: ["bob"],
      });
      // Setup alice's user profile
      await setDoc(doc(fs, "users/alice"), {
        name: "Alice",
        callsign: "AL1CE",
        email: "alice@example.com",
      });
    });
  });

  it("should allow a user to create their own event approval application", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`), {
        status: "Applied",
        appliedAt: new Date(),
        userId: "alice",
      }),
    );
  });

  it("should not allow a user to create approval for another user", async function () {
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      setDoc(doc(bobDb, `events/${testEventId}/approvals/alice`), {
        status: "Applied",
        appliedAt: new Date(),
        userId: "alice",
      }),
    );
  });

  it("should allow a user to read their own event approval status", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      getDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should not allow a user to read another user's event approval status", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      getDoc(doc(bobDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should allow event admin to read user's approval status for their event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      getDoc(doc(amandaDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should not allow admin from one event to read approval for another event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${newEvent}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    // Amanda is admin for Colorado but not for newEvent

    await assertFails(
      getDoc(doc(amandaDb, `events/${newEvent}/approvals/alice`)),
    );
  });

  it("should not allow user to change their own approval status", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      updateDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`), {
        status: "Approved",
      }),
    );
  });

  it("should allow event admin to approve user for their event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      updateDoc(doc(amandaDb, `events/${testEventId}/approvals/alice`), {
        status: "Approved",
        approvedBy: "amanda",
        statusChangedAt: new Date(),
      }),
    );
  });

  it("should allow event admin to decline user for their event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      updateDoc(doc(amandaDb, `events/${testEventId}/approvals/alice`), {
        status: "Declined",
        declinedBy: "amanda",
        statusChangedAt: new Date(),
      }),
    );
  });

  it("should not allow admin from one event to approve for another event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${newEvent}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    // Amanda is admin for Colorado but not for newEvent

    await assertFails(
      updateDoc(doc(amandaDb, `events/${newEvent}/approvals/alice`), {
        status: "Approved",
        approvedBy: "amanda",
        statusChangedAt: new Date(),
      }),
    );
  });

  it("should allow user to update non-protected fields in their approval", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date("2025-01-01"),
          userId: "alice",
          notes: "Initial application",
        },
      );
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      updateDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`), {
        notes: "Updated notes",
      }),
    );
  });

  it("should allow user to delete their own event approval", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      deleteDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should not allow user to delete another user's event approval", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      deleteDoc(doc(bobDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should allow creating approval with userId field for queries", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`), {
        status: "Applied",
        appliedAt: new Date(),
        userId: "alice",
      }),
    );
  });

  it("should allow event admin to read approval with userId field via direct access", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      getDoc(doc(amandaDb, `events/${testEventId}/approvals/alice`)),
    );
  });

  it("should allow event admin to update approval with userId field", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${testEventId}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();

    await assertSucceeds(
      updateDoc(doc(amandaDb, `events/${testEventId}/approvals/alice`), {
        status: "Approved",
        approvedBy: "amanda",
        statusChangedAt: new Date(),
      }),
    );
  });

  it("should not allow admin from one event to access approval for another event", async function () {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          `events/${newEvent}/approvals/alice`,
        ),
        {
          status: "Applied",
          appliedAt: new Date(),
          userId: "alice",
        },
      );
    });

    const amandaDb = testEnv.authenticatedContext("amanda").firestore();
    // Amanda is admin for Colorado but not for newEvent

    await assertFails(
      getDoc(doc(amandaDb, `events/${newEvent}/approvals/alice`)),
    );
  });

  it("should not allow user to create approval with non-Applied status", async function () {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(aliceDb, `events/${testEventId}/approvals/alice`), {
        status: "Approved",
        appliedAt: new Date(),
        userId: "alice",
      }),
    );
  });
});
