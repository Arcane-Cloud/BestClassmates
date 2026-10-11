import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const makeToken = () => randomBytes(32).toString("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hex] = stored.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hex ?? "")) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(derived, Buffer.from(hex, "hex"));
}
// Matching work factor for unknown accounts, avoiding an account-existence timing signal.
export const dummyPasswordHash = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
