/**
 * Cryptographic helpers built on the Web Crypto API available in Workers.
 *
 * - `hashPassword(password)`             -> "pbkdf2$100000$<salt_b64>$<hash_b64>"
 * - `verifyPassword(password, stored)`   -> boolean
 * - `randomToken(bytes = 32)`            -> URL-safe hex string
 * - `sha256Hex(input)`                   -> lowercase hex digest
 * - `hmacSha256Hex(secret, payload)`     -> lowercase hex digest (used by Stripe webhooks)
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LEN_BITS = 256;
const SALT_BYTES = 16;

const enc = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error("Password is required.");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = new Uint8Array(
    await derivePbkdf2(password, salt, PBKDF2_ITERATIONS)
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!password || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const salt = b64decode(parts[2]);
  const expected = b64decode(parts[3]);
  const actual = new Uint8Array(
    await derivePbkdf2(password, salt, iterations, expected.byteLength * 8)
  );
  return constantTimeEqual(actual, expected);
}

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return hexEncode(buf);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return hexEncode(new Uint8Array(digest));
}

export async function hmacSha256Hex(
  secret: string,
  payload: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return hexEncode(new Uint8Array(sig));
}

// ─────────────────────────────────────────────────────────────────────

async function derivePbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLenBits: number = PBKDF2_KEY_LEN_BITS
): Promise<ArrayBuffer> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: PBKDF2_HASH,
      salt,
      iterations,
    },
    baseKey,
    keyLenBits
  );
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexEncode(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
