import { describe, expect, it } from "vitest";
import { explainFirebaseError } from "../adapters/firebase/errors";
import { toFirestoreDoc, usernameToEmail } from "../adapters/firebase/payload";

describe("firebase payload", () => {
  it("maps a username onto the HOA sign-in email", () => {
    expect(usernameToEmail("Homeowner.Demo")).toBe("homeowner.demo@celinaplains.app");
    expect(usernameToEmail("treasurer@example.com")).toBe("treasurer@example.com");
  });

  it("never sends a password to Firestore", () => {
    const doc = toFirestoreDoc(
      "users",
      {
        id: "user_1",
        username: "homeowner.demo",
        password: "demo1234",
        firebaseUid: "abc",
        roles: ["homeowner"],
      },
      new Map(),
    );
    expect(doc).not.toHaveProperty("password");
    expect(doc.firebaseUid).toBe("abc");
  });

  it("links a demo username to the Firebase uid from signup", () => {
    const doc = toFirestoreDoc(
      "users",
      { id: "user_2", username: "officer.demo", password: "secret" },
      new Map([["officer.demo", "uid-2"]]),
    );
    expect(doc.firebaseUid).toBe("uid-2");
    expect(doc).not.toHaveProperty("password");
  });

  it("turns a rejected sign-in into the same message the login form already shows", () => {
    const error = explainFirebaseError({ code: "auth/invalid-credential" });
    expect(error.message).toBe("Invalid username or password.");
  });
});