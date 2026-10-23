import { jwtVerify } from "jose";

export const SESSION_COOKIE = "charge_guard_session";

let cachedKey: Uint8Array | null = null;

/**
 * The JWT signing key. In production a missing / weak AUTH_SECRET is a hard
 * error — the old fallback to a public default string let anyone forge a
 * session cookie. Resolved lazily so `next build` doesn't need the secret.
 */
export function getSecret(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32 || secret.startsWith("replace-with")) {
      throw new Error(
        "AUTH_SECRET must be set to a random string of at least 32 characters (openssl rand -base64 32)"
      );
    }
  }

  cachedKey = new TextEncoder().encode(secret || "dev-only-secret-change-me");
  return cachedKey;
}

/** Returns the userId inside a valid session token, or null. */
export async function verifySessionToken(token: string): Promise<string | null> {
  const key = getSecret(); // outside the try: a misconfigured secret must be loud
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    // Expired or tampered token — treat as logged out rather than erroring.
    return null;
  }
}
