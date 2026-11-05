type Coded = { code?: string; message?: string };

function coded(error: unknown): Coded {
  if (typeof error === "object" && error !== null) return error as Coded;
  return {};
}

export function explainFirebaseError(error: unknown): Error {
  const { code = "", message = "" } = coded(error);
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-login-credentials"
  ) {
    return new Error("Invalid username or password.");
  }
  if (code === "auth/operation-not-allowed") {
    return new Error(
      "Enable Email/Password sign-in in Firebase Authentication, then try again.",
    );
  }
  if (code === "auth/email-already-in-use") {
    return new Error(
      "That Firebase account already exists with a different password. Use the password set in Firebase, or delete the user in Authentication and load demo data again.",
    );
  }
  if (
    code === "permission-denied" ||
    code.endsWith("permission-denied") ||
    message.toLowerCase().includes("insufficient permissions")
  ) {
    return new Error(
      "Firebase blocked the request. Publish firestore.rules and storage.rules so a signed-in resident can read and write.",
    );
  }
  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
    return new Error(
      "The Firebase web API key was rejected. Check the values in .env and restart the dev server.",
    );
  }
  if (error instanceof Error && error.message) return error;
  return new Error(message || "Firebase request failed.");
}
